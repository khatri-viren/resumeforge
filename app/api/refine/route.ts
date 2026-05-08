import { google } from "@ai-sdk/google"
import { generateText, stepCountIs, tool } from "ai"
import { NextResponse } from "next/server"
import path from "path"
import { z } from "zod"
import {
  listContextFiles,
  readFileByExtension,
  readTextFileSafe,
  resolveContextDir,
} from "@/lib/fileLoaders"
import { ResumeSchema } from "@/lib/resumeSchema"

export const runtime = "nodejs"

const REFINE_SYSTEM_PROMPT = `You are a resume refinement assistant. The user has an existing resume and wants targeted changes.

Rules:
- Apply the requested changes precisely — do not rewrite or alter sections the user did not mention
- Maintain ATS optimisation and keyword density relative to the original job description
- Every bullet point must begin with a past-tense action verb followed by a metric or outcome
- You may call readBaseResume, listContextDocs, or readContextDoc if additional context would help
- Output ONLY a valid JSON object with exactly two fields:
  1. "summary": one sentence describing what you changed (e.g. "Rewrote the summary to emphasise leadership and added Kubernetes to the DevOps skills category.")
  2. "resume": the complete updated Resume JSON matching the schema

No markdown, no code fences, no preamble.`

const RefineResponseSchema = z.object({
  summary: z.string(),
  resume: ResumeSchema,
})

type ChatMessage = { role: "user" | "assistant"; content: string }

function extractJson(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) return fenceMatch[1].trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) return jsonMatch[0]
  return text.trim()
}

async function callRefineGemini(
  aiMessages: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  const contextDir = resolveContextDir()

  const [atsGuide, latexGuide] = await Promise.all([
    readTextFileSafe(path.join(contextDir, "skills", "ats.md")),
    readTextFileSafe(path.join(contextDir, "skills", "latex.md")),
  ])

  const ALWAYS_INJECTED = new Set(["skills/ats.md", "skills/latex.md"])

  const systemPrompt = [
    REFINE_SYSTEM_PROMPT,
    atsGuide ? `---\n\n# ATS Reference Guide\n\n${atsGuide}` : null,
    latexGuide ? `---\n\n# LaTeX Resume Guide\n\n${latexGuide}` : null,
  ]
    .filter(Boolean)
    .join("\n\n")

  const tools = {
    readBaseResume: tool({
      description: "Read the candidate's base resume for additional context",
      inputSchema: z.object({}),
      execute: async (): Promise<string> =>
        readFileByExtension(path.join(contextDir, "base-resume.pdf")),
    }),
    listContextDocs: tool({
      description: "List supplementary context documents available",
      inputSchema: z.object({}),
      execute: async (): Promise<string[]> =>
        listContextFiles(contextDir).filter(
          (f) => f !== "base-resume.pdf" && !ALWAYS_INJECTED.has(f)
        ),
    }),
    readContextDoc: tool({
      description: "Read a supplementary context document by relative path",
      inputSchema: z.object({
        name: z.string().describe("Relative path from listContextDocs"),
      }),
      execute: async ({ name }: { name: string }): Promise<string> =>
        readFileByExtension(path.join(contextDir, name)),
    }),
  }

  const result = await generateText({
    model: google("gemini-3-flash-preview"),
    system: systemPrompt,
    messages: aiMessages,
    tools,
    stopWhen: stepCountIs(5),
  })

  return result.text
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const resumeValidation = ResumeSchema.safeParse(body.resume)

    if (!resumeValidation.success) {
      return NextResponse.json(
        { error: "Invalid resume data." },
        { status: 400 }
      )
    }

    const messages: ChatMessage[] = body.messages ?? []
    const jd: string = body.jd ?? ""

    if (!messages.length || messages[0].role !== "user") {
      return NextResponse.json(
        { error: "At least one user message is required." },
        { status: 400 }
      )
    }

    const resume = resumeValidation.data

    // Build AI messages — first user message carries full context
    const aiMessages: { role: "user" | "assistant"; content: string }[] =
      messages.map((m, i) => {
        if (i === 0) {
          return {
            role: "user" as const,
            content: [
              "Current resume:",
              "```json",
              JSON.stringify(resume),
              "```",
              jd ? `\nOriginal job description:\n${jd}` : "",
              `\nUser request: ${m.content}`,
            ]
              .filter(Boolean)
              .join("\n"),
          }
        }
        return { role: m.role, content: m.content }
      })

    // Attempt 1
    const raw = extractJson(await callRefineGemini(aiMessages))
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid JSON. Please try again." },
        { status: 500 }
      )
    }

    const validation = RefineResponseSchema.safeParse(parsed)
    if (validation.success) {
      return NextResponse.json({
        resume: validation.data.resume,
        summary: validation.data.summary,
      })
    }

    // Retry once with validation errors
    const errorSummary = validation.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ")

    const retryMessages = [
      ...aiMessages,
      { role: "assistant" as const, content: raw },
      {
        role: "user" as const,
        content: `Validation errors in your response: ${errorSummary}. Return the corrected JSON only — no markdown, no preamble.`,
      },
    ]

    const retryRaw = extractJson(await callRefineGemini(retryMessages))
    let retryParsed: unknown
    try {
      retryParsed = JSON.parse(retryRaw)
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid JSON after retry." },
        { status: 500 }
      )
    }

    const retryValidation = RefineResponseSchema.safeParse(retryParsed)
    if (retryValidation.success) {
      return NextResponse.json({
        resume: retryValidation.data.resume,
        summary: retryValidation.data.summary,
      })
    }

    return NextResponse.json(
      {
        error: "Refinement failed schema validation after retry.",
        details: retryValidation.error.issues,
      },
      { status: 422 }
    )
  } catch (err) {
    console.error("[/api/refine]", err)
    return NextResponse.json(
      { error: "Internal server error. Check server logs." },
      { status: 500 }
    )
  }
}
