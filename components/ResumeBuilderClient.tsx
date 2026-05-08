"use client"

import { Download, Loader2, RotateCcw } from "lucide-react"
import { useState } from "react"
import { ATSScorePanel } from "@/components/ATSScorePanel"
import { FileUpload } from "@/components/FileUpload"
import { JDInput } from "@/components/JDInput"
import { ResumePreview } from "@/components/ResumePreview"
import { SectionEditor } from "@/components/SectionEditor"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Resume } from "@/lib/resumeSchema"

type Screen = "input" | "generating" | "preview"

const STATUS_MESSAGES = [
  "Reading your resume…",
  "Analysing job description…",
  "Selecting relevant skill files…",
  "Building your resume…",
  "Calculating ATS score…",
]

interface Props {
  skillFiles: string[]
}

export function ResumeBuilderClient({ skillFiles }: Props) {
  const [screen, setScreen] = useState<Screen>("input")
  const [jd, setJd] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [selectedSkills, setSelectedSkills] = useState<string[]>(skillFiles)
  const [length, setLength] = useState<"concise" | "standard">("standard")
  const [tone, setTone] = useState<"technical" | "executive">("technical")
  const [resume, setResume] = useState<Resume | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [statusIndex, setStatusIndex] = useState(0)
  const [isExporting, setIsExporting] = useState(false)

  function toggleSkill(name: string) {
    setSelectedSkills((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    )
  }

  async function handleGenerate() {
    if (jd.trim().length < 300) {
      setError("Job description must be at least 300 characters.")
      return
    }
    setError(null)
    setStatusIndex(0)
    setScreen("generating")

    // Cycle through status messages while waiting
    const interval = setInterval(() => {
      setStatusIndex((i) => (i + 1) % STATUS_MESSAGES.length)
    }, 3000)

    try {
      const formData = new FormData()
      formData.set("jobDescription", jd)
      formData.set("length", length)
      formData.set("tone", tone)
      selectedSkills.forEach((s) => formData.append("skills", s))
      uploadedFiles.forEach((f) => formData.append("files", f))

      const res = await fetch("/api/generate", { method: "POST", body: formData })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || "Generation failed.")

      setResume(data.resume)
      setScreen("preview")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
      setScreen("input")
    } finally {
      clearInterval(interval)
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
      <div className="min-h-svh bg-muted/40 pb-24">
        {/* Sticky bottom bar */}
        <div className="fixed bottom-0 left-0 right-0 z-10 flex items-center gap-3 border-t border-border bg-background px-6 py-3">
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setResume(null)
                setError(null)
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

        <div className="grid grid-cols-1 gap-6 p-6 xl:grid-cols-[1fr_360px]">
          {/* Left: Preview + editor */}
          <div className="space-y-6">
            <ResumePreview resume={resume} />
            <SectionEditor resume={resume} onChange={setResume} />
          </div>

          {/* Right: ATS panel */}
          <div className="xl:sticky xl:top-6 xl:self-start">
            <ATSScorePanel atsScore={resume.atsScore} />
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

      {/* Skill file checkboxes */}
      {skillFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium">Skill Context Files</p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {skillFiles.map((name) => (
              <div key={name} className="flex items-center gap-2">
                <Checkbox
                  id={name}
                  checked={selectedSkills.includes(name)}
                  onCheckedChange={() => toggleSkill(name)}
                />
                <Label htmlFor={name} className="cursor-pointer text-xs">
                  {name.replace(/\.md$/, "")}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

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
