import "server-only"

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer"
import React from "react"
import type { Resume } from "./resumeSchema"

// A4: 595pt × 842pt
const S = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    lineHeight: 1.25,
    paddingTop: 32,
    paddingBottom: 32,
    paddingHorizontal: 40,
    color: "#111",
  },
  // ── Header ──────────────────────────────────────
  name: {
    fontFamily: "Helvetica-Bold",
    fontSize: 15,
    marginBottom: 2,
  },
  contact: {
    fontSize: 8,
    color: "#444",
    marginBottom: 8,
  },
  // ── Section ─────────────────────────────────────
  sectionHeader: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 0.9,
    borderBottomWidth: 0.5,
    borderBottomColor: "#999",
    paddingBottom: 1.5,
    marginBottom: 4,
    marginTop: 8,
  },
  // ── Summary ─────────────────────────────────────
  summary: {
    fontSize: 9,
    lineHeight: 1.35,
  },
  // ── Experience ───────────────────────────────────
  expBlock: {
    marginBottom: 5,
  },
  expRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  expTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  expDuration: {
    fontSize: 8,
    color: "#555",
  },
  expMeta: {
    fontSize: 8,
    color: "#555",
    marginBottom: 2,
  },
  bullet: {
    fontSize: 8.5,
    marginBottom: 1,
    paddingLeft: 8,
  },
  // ── Skills ────────────────────────────────────────
  skillRow: {
    fontSize: 8.5,
    marginBottom: 2,
  },
  skillCat: {
    fontFamily: "Helvetica-Bold",
  },
  // ── Education ────────────────────────────────────
  eduBlock: {
    marginBottom: 4,
  },
  // ── Projects ─────────────────────────────────────
  projBlock: {
    marginBottom: 4,
  },
  projName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
})

function contactLine(meta: Resume["meta"]): string {
  const parts = [meta.email, meta.phone, meta.location]
  if (meta.linkedin) parts.push(meta.linkedin)
  if (meta.github) parts.push(meta.github)
  if (meta.website) parts.push(meta.website)
  return parts.join("  ·  ")
}

function ResumeDocument({ resume }: { resume: Resume }) {
  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* ── Header ─────────────────────────────── */}
        <Text style={S.name}>{resume.meta.name}</Text>
        <Text style={S.contact}>{contactLine(resume.meta)}</Text>

        {/* ── Summary ────────────────────────────── */}
        <Text style={S.sectionHeader}>Summary</Text>
        <Text style={S.summary}>{resume.summary}</Text>

        {/* ── Experience ─────────────────────────── */}
        <Text style={S.sectionHeader}>Experience</Text>
        {resume.experience.map((exp, i) => (
          <View key={i} style={S.expBlock}>
            <View style={S.expRow}>
              <Text style={S.expTitle}>{exp.title}  ·  {exp.company}</Text>
              <Text style={S.expDuration}>{exp.duration}</Text>
            </View>
            <Text style={S.expMeta}>{exp.location}</Text>
            {exp.bullets.map((b, j) => (
              <Text key={j} style={S.bullet}>•  {b}</Text>
            ))}
          </View>
        ))}

        {/* ── Skills ─────────────────────────────── */}
        <Text style={S.sectionHeader}>Skills</Text>
        {resume.skills.map((sk, i) => (
          <Text key={i} style={S.skillRow}>
            <Text style={S.skillCat}>{sk.category}:  </Text>
            {sk.items.join(", ")}
          </Text>
        ))}

        {/* ── Education ──────────────────────────── */}
        <Text style={S.sectionHeader}>Education</Text>
        {resume.education.map((edu, i) => (
          <View key={i} style={S.eduBlock}>
            <View style={S.expRow}>
              <Text style={S.expTitle}>{edu.institution}</Text>
              <Text style={S.expDuration}>{edu.year}</Text>
            </View>
            <Text style={S.expMeta}>
              {edu.degree}{edu.notes ? `  ·  ${edu.notes}` : ""}
            </Text>
          </View>
        ))}

        {/* ── Projects ───────────────────────────── */}
        {resume.projects && resume.projects.length > 0 && (
          <>
            <Text style={S.sectionHeader}>Projects</Text>
            {resume.projects.map((proj, i) => (
              <View key={i} style={S.projBlock}>
                <View style={S.expRow}>
                  <Text style={S.projName}>{proj.name}</Text>
                  {proj.link && <Text style={S.expDuration}>{proj.link}</Text>}
                </View>
                <Text style={S.expMeta}>{proj.tech.join(", ")}</Text>
                <Text style={S.bullet}>{proj.description}</Text>
              </View>
            ))}
          </>
        )}

      </Page>
    </Document>
  )
}

export async function generateResumePdf(resume: Resume): Promise<Buffer> {
  return renderToBuffer(<ResumeDocument resume={resume} />)
}
