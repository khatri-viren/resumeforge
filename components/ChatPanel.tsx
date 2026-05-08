"use client"

import { Loader2, Send } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

interface Props {
  messages: ChatMessage[]
  isLoading: boolean
  onSend: (message: string) => void
}

export function ChatPanel({ messages, isLoading, onSend }: Props) {
  const [input, setInput] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  function handleSubmit() {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return
    onSend(trimmed)
    setInput("")
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
      <p className="text-xs font-medium text-muted-foreground">Refine with AI</p>

      {/* Message history */}
      <div className="flex max-h-[320px] min-h-[80px] flex-col gap-2 overflow-y-auto">
        {messages.length === 0 && !isLoading && (
          <p className="text-center text-xs text-muted-foreground/60 py-4">
            Ask for any changes — "shorten the summary", "add Docker to skills", etc.
          </p>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-1.5 text-xs leading-relaxed ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5">
              <Loader2 className="size-3 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Refining…</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a change request…"
          className="min-h-0 resize-none text-xs"
          rows={2}
          disabled={isLoading}
        />
        <Button
          size="icon"
          className="shrink-0 self-end"
          onClick={handleSubmit}
          disabled={!input.trim() || isLoading}
        >
          <Send className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
