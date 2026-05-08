"use client"

import { ClipboardPaste } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface Props {
  value: string
  onChange: (v: string) => void
}

export function JDInput({ value, onChange }: Props) {
  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText()
      onChange(text)
    } catch {
      // clipboard access denied — silently ignore
    }
  }

  const isTouched = value.length > 0
  const isShort = value.trim().length < 300

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium" htmlFor="jd">
          Job Description
        </label>
        <Button variant="ghost" size="xs" onClick={handlePaste} type="button">
          <ClipboardPaste className="mr-1 size-3" />
          Paste
        </Button>
      </div>
      <Textarea
        id="jd"
        className="h-64 resize-none"
        placeholder="Paste the full job description here…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={isTouched && isShort}
      />
      <p className={`text-xs ${isTouched && isShort ? "text-destructive" : "text-muted-foreground"}`}>
        {value.length} / 300 minimum characters
      </p>
    </div>
  )
}
