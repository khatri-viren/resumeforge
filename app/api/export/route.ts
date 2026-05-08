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
        { status: 400 }
      )
    }

    const resume = validation.data

    // Dynamic import keeps @react-pdf/renderer out of the client bundle
    const { generateResumePdf } = await import("@/lib/pdfTemplate")
    const buffer = await generateResumePdf(resume)

    const safeName = resume.meta.name.replace(/[^a-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "_")
    // Extract role from first sentence of summary
    const firstSentence = resume.summary.split(/[.!?]/)[0] ?? ""
    const roleMatch = firstSentence.match(/(?:as a|as an|–|-|,)\s+(.+?)(?:\s+at\b|$)/i)
    const role = roleMatch?.[1]?.trim().replace(/\s+/g, "_") ?? "Resume"
    const filename = `${safeName}_${role}_Resume.pdf`

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error("[/api/export]", err)
    return NextResponse.json(
      { error: "PDF generation failed. Check server logs." },
      { status: 500 }
    )
  }
}
