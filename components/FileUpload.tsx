"use client"

import { Paperclip, X } from "lucide-react"
import { useRef } from "react"

const ACCEPTED_TYPES = [".pdf", ".docx", ".md", ".txt"]
const MAX_SIZE_MB = 5
const MAX_FILES = 5

interface Props {
  files: File[]
  onChange: (files: File[]) => void
}

export function FileUpload({ files, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFiles(incoming: FileList | null) {
    if (!incoming) return
    const valid: File[] = []
    for (const file of Array.from(incoming)) {
      const ext = "." + file.name.split(".").pop()?.toLowerCase()
      if (!ACCEPTED_TYPES.includes(ext)) continue
      if (file.size > MAX_SIZE_MB * 1024 * 1024) continue
      valid.push(file)
    }
    const merged = [...files, ...valid].slice(0, MAX_FILES)
    onChange(merged)
  }

  function removeFile(index: number) {
    onChange(files.filter((_, i) => i !== index))
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium">
        Supplementary Files{" "}
        <span className="text-muted-foreground">(optional)</span>
      </label>

      {/* Drop zone */}
      <div
        className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded border border-dashed border-border p-4 text-xs text-muted-foreground transition-colors hover:border-ring hover:bg-muted/40"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <Paperclip className="size-4" />
        <span>Drop files here or click to browse</span>
        <span className="text-[10px]">
          {ACCEPTED_TYPES.join(", ")} · max {MAX_SIZE_MB}MB · up to {MAX_FILES} files
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((file, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded border border-border bg-muted/40 px-2.5 py-1 text-xs"
            >
              <span className="truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="ml-2 shrink-0 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
