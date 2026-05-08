"use client"

import { Download, Loader2, RotateCcw } from "lucide-react"
import { useRef, useState } from "react"
import { ATSScorePanel } from "@/components/ATSScorePanel"
import { ChatPanel, type ChatMessage } from "@/components/ChatPanel"
import { FileUpload } from "@/components/FileUpload"
import { JDInput } from "@/components/JDInput"
import { PdfPreview, type PdfPreviewHandle } from "@/components/PdfPreview"
import { SectionEditor } from "@/components/SectionEditor"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Resume } from "@/lib/resumeSchema"

type Screen = "input" | "generating" | "preview"

const STATUS_MESSAGES = [
  "Reading your resume…",
  "Analysing job description…",
  "Building your resume…",
  "Calculating ATS score…",
]

export function ResumeBuilderClient() {
  const [screen, setScreen] = useState<Screen>("input")
  const [jd, setJd] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [length, setLength] = useState<"concise" | "standard">("standard")
  const [tone, setTone] = useState<"technical" | "executive">("technical")
  const [resume, setResume] = useState<Resume | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [statusIndex, setStatusIndex] = useState(0)
  const [isExporting, setIsExporting] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [isRefining, setIsRefining] = useState(false)
  const pdfPreviewRef = useRef<PdfPreviewHandle>(null)

  async function handleGenerate() {
    if (jd.trim().length < 300) {
      setError("Job description must be at least 300 characters.")
      return
    }
    setError(null)
    setStatusIndex(0)
    setScreen("generating")

    const interval = setInterval(() => {
      setStatusIndex((i) => (i + 1) % STATUS_MESSAGES.length)
    }, 3000)

    try {
      const formData = new FormData()
      formData.set("jobDescription", jd)
      formData.set("length", length)
      formData.set("tone", tone)
      uploadedFiles.forEach((f) => formData.append("files", f))

      const res = await fetch("/api/generate", { method: "POST", body: formData })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || "Generation failed.")

      setResume(data.resume)
      setChatHistory([])
      setScreen("preview")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
      setScreen("input")
    } finally {
      clearInterval(interval)
    }
  }

  async function handleRefine(message: string) {
    if (!resume) return
    const userMsg: ChatMessage = { role: "user", content: message }
    const updatedHistory = [...chatHistory, userMsg]
    setChatHistory(updatedHistory)
    setIsRefining(true)
    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, messages: updatedHistory, jd }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Refinement failed.")
      setResume(data.resume)
      setChatHistory((h) => [...h, { role: "assistant", content: data.summary }])
      pdfPreviewRef.current?.compile()
    } catch (err) {
      setChatHistory((h) => [
        ...h,
        {
          role: "assistant",
          content: `Error: ${err instanceof Error ? err.message : "Refinement failed."}`,
        },
      ])
    } finally {
      setIsRefining(false)
    }
  }

  async function handleExport() {
    if (!resume) return
    setIsExporting(true)
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Export failed.")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const disposition = res.headers.get("Content-Disposition") ?? ""
      const match = disposition.match(/filename="([^"]+)"/)
      a.download = match?.[1] ?? "Resume.pdf"
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.")
    } finally {
      setIsExporting(false)
    }
  }

  // ── Generating screen ──────────────────────────────────────
  if (screen === "generating") {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{STATUS_MESSAGES[statusIndex]}</p>
      </div>
    )
  }

  // ── Preview + Edit screen ──────────────────────────────────
  if (screen === "preview" && resume) {
    return (
      <div className="flex h-svh flex-col overflow-hidden bg-muted/40">
        {/* Bottom bar */}
        <div className="fixed bottom-0 left-0 right-0 z-10 flex items-center gap-3 border-t border-border bg-background px-6 py-3">
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setResume(null)
                setError(null)
                setChatHistory([])
                setScreen("input")
              }}
            >
              <RotateCcw className="mr-1.5 size-3.5" />
              Regenerate
            </Button>
            <Button size="sm" onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Download className="mr-1.5 size-3.5" />
              )}
              Export PDF
            </Button>
          </div>
        </div>

        {/* Main area — fills viewport, leaves room for bottom bar */}
        <div className="min-h-0 flex-1 overflow-hidden px-6 pb-[72px] pt-6">
          <div className="grid h-full grid-cols-1 gap-6 xl:grid-cols-[320px_1fr_300px]">
            {/* Left: editor */}
            <div className="min-h-0 overflow-y-auto">
              <SectionEditor resume={resume} onChange={setResume} />
            </div>

            {/* Center: PDF preview */}
            <div className="min-h-0 overflow-y-auto">
              <PdfPreview ref={pdfPreviewRef} resume={resume} />
            </div>

            {/* Right: ATS panel + chat */}
            <div className="min-h-0 overflow-y-auto">
              <ATSScorePanel atsScore={resume.atsScore} />
              <div className="mt-4">
                <ChatPanel
                  messages={chatHistory}
                  isLoading={isRefining}
                  onSend={handleRefine}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Input screen ───────────────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="font-medium">ResumeForge</h1>
        <p className="text-sm text-muted-foreground">
          Paste a job description to generate an ATS-optimised resume.
        </p>
      </div>

      <JDInput value={jd} onChange={setJd} />
      <FileUpload files={uploadedFiles} onChange={setUploadedFiles} />

      {/* Generation options */}
      <div className="flex flex-wrap gap-4">
        <div className="space-y-1.5">
          <p className="text-xs font-medium">Length</p>
          <Tabs value={length} onValueChange={(v) => setLength(v as "concise" | "standard")}>
            <TabsList>
              <TabsTrigger value="concise" className="text-xs">
                Concise (1 page)
              </TabsTrigger>
              <TabsTrigger value="standard" className="text-xs">
                Standard (1–2 pages)
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium">Tone</p>
          <Tabs value={tone} onValueChange={(v) => setTone(v as "technical" | "executive")}>
            <TabsList>
              <TabsTrigger value="technical" className="text-xs">
                Technical
              </TabsTrigger>
              <TabsTrigger value="executive" className="text-xs">
                Executive
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button onClick={handleGenerate} disabled={jd.trim().length < 300}>
        Generate Resume
      </Button>
    </div>
  )
}
