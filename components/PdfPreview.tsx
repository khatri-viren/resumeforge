"use client"

import { Loader2, RefreshCw } from "lucide-react"
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import type { Resume } from "@/lib/resumeSchema"

export interface PdfPreviewHandle {
  compile: () => void
}

interface Props {
  resume: Resume
}

export const PdfPreview = forwardRef<PdfPreviewHandle, Props>(function PdfPreview({ resume }, ref) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isCompiling, setIsCompiling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  const resumeRef = useRef(resume)
  resumeRef.current = resume

  const compile = useCallback(async () => {
    setIsCompiling(true)
    setError(null)
    try {
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: resumeRef.current }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? "Compilation failed.")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = url
      setPdfUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compilation failed.")
    } finally {
      setIsCompiling(false)
    }
  }, [])

  useImperativeHandle(ref, () => ({ compile }), [compile])

  useEffect(() => {
    compile()
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [compile])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">PDF Preview</p>
        <Button variant="outline" size="sm" onClick={compile} disabled={isCompiling}>
          {isCompiling ? (
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-1.5 size-3.5" />
          )}
          {isCompiling ? "Compiling…" : "Refresh PDF"}
        </Button>
      </div>

      <div className="relative min-h-[1056px] overflow-hidden rounded border border-border bg-white">
        {isCompiling && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Compiling LaTeX…</p>
            </div>
          </div>
        )}
        {error && !isCompiling && (
          <div className="flex min-h-[200px] items-center justify-center p-6">
            <p className="max-w-sm text-center font-mono text-xs text-destructive">{error}</p>
          </div>
        )}
        {pdfUrl && (
          <iframe
            src={`${pdfUrl}#toolbar=0&navpanes=0`}
            title="Resume PDF Preview"
            className="min-h-[1056px] w-full border-none"
          />
        )}
      </div>
    </div>
  )
})
