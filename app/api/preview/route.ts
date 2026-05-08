import { NextResponse } from "next/server"
import { ResumeSchema } from "@/lib/resumeSchema"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validation = ResumeSchema.safeParse(body.resume)

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid resume data.", details: validation.error.issues },
        { status: 400 },
      )
    }

    const { generateResumePdf } = await import("@/lib/latexTemplate")
    const buffer = await generateResumePdf(validation.data)

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
      },
    })
  } catch (err) {
    console.error("[/api/preview]", err)
    const message = err instanceof Error ? err.message : "PDF compilation failed."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
