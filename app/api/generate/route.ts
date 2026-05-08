import { google } from "@ai-sdk/google"
import { generateText, stepCountIs, tool } from "ai"
import { NextResponse } from "next/server"
import path from "path"
import { z } from "zod"
import {
  listContextFiles,
  listDirectory,
  readFileBuffer,
  readFileByExtension,
  readTextFile,
  readTextFileSafe,
  resolveContextDir,
  resolveSkillsDir,
} from "@/lib/fileLoaders"
import { ResumeSchema } from "@/lib/resumeSchema"

export const runtime = "nodejs"

const SYSTEM_PROMPT = `You are an expert technical resume writer and ATS optimisation specialist.

Your job:
1. Use tools to read the candidate's base resume, relevant skill files, and context documents
2. Analyse the job description for: required skills, preferred skills, seniority signals, domain language, and implicit culture fit markers
3. Reconstruct the resume to maximise ATS match while staying truthful to the candidate's actual experience
4. Mirror the JD's exact language and terminology where applicable
5. Quantify every bullet point where data exists or can be reasonably inferred
6. Lead every bullet with a strong past-tense action verb
7. Output ONLY a valid JSON object matching the Resume schema — no markdown, no preamble, no code fences

ATS Rules:
- No tables, columns, headers/footers, or graphics in structure assumptions
- Keyword density: target 2–3 mentions of top 5 JD keywords across the resume
- Summary must contain the exact job title from the JD
- Skills section must list tools/technologies verbatim as they appear in JD
- Date format: MMM YYYY – MMM YYYY throughout

Resume JSON schema:
{
  "meta": { "name": "", "email": "", "phone": "", "location": "", "linkedin": "", "github": "", "website": "" },
  "summary": "3-4 sentences mirroring JD language, includes exact job title",
  "experience": [{ "company": "", "title": "", "duration": "MMM YYYY – MMM YYYY", "location": "", "bullets": ["action verb + metric"] }],
  "skills": [{ "category": "", "items": [] }],
  "education": [{ "institution": "", "degree": "", "year": "", "notes": "" }],
  "projects": [{ "name": "", "description": "", "tech": [], "link": "" }],
  "keywords": ["top ATS keywords from JD"],
  "atsScore": { "matchedKeywords": [], "missingKeywords": [], "estimatedScore": 0 }
}`

function extractJson(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) return fenceMatch[1].trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) return jsonMatch[0]
  return text.trim()
}

async function callGemini(
  messages: { role: "user" | "assistant"; content: string }[],
  uploadedContext: string
): Promise<{ text: string }> {
  const skillsDir = resolveSkillsDir()
  const contextDir = resolveContextDir()

  // Always inject the ATS reference guide — too important to leave to tool-call chance
  const atsGuide = await readTextFileSafe(
    path.join(contextDir, "skills", "ats.md")
  )
  const systemPrompt = atsGuide
    ? `${SYSTEM_PROMPT}\n\n---\n\n# ATS Reference Guide (Always Apply)\n\n${atsGuide}`
    : SYSTEM_PROMPT

  // Exclude the always-injected ATS file from listContextDocs to avoid double-reading
  const ATS_GUIDE_PATH = "skills/ats.md"

  const tools = {
    listSkillFiles: tool({
      description: "List all available skill context files",
      inputSchema: z.object({}),
      execute: async (): Promise<string[]> => {
        return listDirectory(skillsDir)
      },
    }),
    readSkillFile: tool({
      description: "Read a specific skill context file by name",
      inputSchema: z.object({
        name: z.string().describe("Filename from listSkillFiles"),
      }),
      execute: async ({ name }: { name: string }): Promise<string> => {
        return readTextFile(path.join(skillsDir, name))
      },
    }),
    readBaseResume: tool({
      description:
        "Read the candidate's base resume to understand their full experience",
      inputSchema: z.object({}),
      execute: async (): Promise<string> => {
        return readFileByExtension(path.join(contextDir, "base-resume.pdf"))
      },
    }),
    listContextDocs: tool({
      description:
        "List all available supplementary context documents, including files inside subdirectories. Returns relative paths like 'docs-smartmocks/brief.md'.",
      inputSchema: z.object({}),
      execute: async (): Promise<string[]> => {
        return listContextFiles(contextDir).filter(
          (f) => f !== "base-resume.pdf" && f !== ATS_GUIDE_PATH
        )
      },
    }),
    readContextDoc: tool({
      description:
        "Read a supplementary context document by its relative path (e.g. 'achievements.md' or 'docs-smartmocks/brief.md')",
      inputSchema: z.object({
        name: z.string().describe("Relative path from listContextDocs"),
      }),
      execute: async ({ name }: { name: string }): Promise<string> => {
        return readFileByExtension(path.join(contextDir, name))
      },
    }),
  }

  const userMessage = uploadedContext
    ? `${messages[messages.length - 1].content}\n\nSupplementary documents uploaded by user:\n${uploadedContext}`
    : messages[messages.length - 1].content

  const result = await generateText({
    model: google("gemini-3-flash-preview"),
    system: systemPrompt,
    messages: [
      ...messages.slice(0, -1),
      { role: "user", content: userMessage },
    ],
    tools,
    stopWhen: stepCountIs(7),
  })

  return { text: result.text }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const jobDescription = formData.get("jobDescription") as string | null
    const length = (formData.get("length") as string) || "standard"
    const tone = (formData.get("tone") as string) || "technical"

    if (!jobDescription || jobDescription.trim().length < 300) {
      return NextResponse.json(
        { error: "Job description must be at least 300 characters." },
        { status: 400 }
      )
    }

    // Parse any uploaded supplementary files
    const uploadedParts: string[] = []
    const fileEntries = formData.getAll("files") as File[]
    for (const file of fileEntries) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const text = await readFileBuffer(buffer, file.name)
      if (!text.startsWith("__")) {
        uploadedParts.push(`--- ${file.name} ---\n${text}`)
      }
    }
    const uploadedContext = uploadedParts.join("\n\n")

    const prompt = `Job Description:\n${jobDescription}\n\nTarget resume length: ${length}. Writing tone: ${tone}.`

    const messages: { role: "user" | "assistant"; content: string }[] = [
      { role: "user", content: prompt },
    ]

    // Attempt 1
    const result = await callGemini(messages, uploadedContext)
    const rawJson = extractJson(result.text)

    let parsed: unknown
    try {
      parsed = JSON.parse(rawJson)
    } catch {
      return NextResponse.json(
        {
          error: "AI returned invalid JSON. Please try again.",
          raw: result.text,
        },
        { status: 500 }
      )
    }

    const validation = ResumeSchema.safeParse(parsed)
    if (validation.success) {
      return NextResponse.json({ resume: validation.data })
    }

    // Retry once with validation errors
    const errorSummary = validation.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ")

    const retryMessages: { role: "user" | "assistant"; content: string }[] = [
      { role: "user", content: prompt },
      { role: "assistant", content: result.text },
      {
        role: "user",
        content: `The JSON had validation errors: ${errorSummary}. Output the corrected JSON only — no markdown, no preamble.`,
      },
    ]

    const retryResult = await callGemini(retryMessages, "")
    const retryJson = extractJson(retryResult.text)

    let retryParsed: unknown
    try {
      retryParsed = JSON.parse(retryJson)
    } catch {
      return NextResponse.json(
        {
          error: "AI returned invalid JSON after retry.",
          raw: retryResult.text,
        },
        { status: 500 }
      )
    }

    const retryValidation = ResumeSchema.safeParse(retryParsed)
    if (retryValidation.success) {
      return NextResponse.json({ resume: retryValidation.data })
    }

    return NextResponse.json(
      {
        error: "Resume generation failed schema validation after retry.",
        details: retryValidation.error.issues,
        raw: retryResult.text,
      },
      { status: 422 }
    )
  } catch (err) {
    console.error("[/api/generate]", err)
    return NextResponse.json(
      { error: "Internal server error. Check server logs." },
      { status: 500 }
    )
  }
}
