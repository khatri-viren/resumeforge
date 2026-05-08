"use client"

import type { Resume } from "@/lib/resumeSchema"

interface Props {
  resume: Resume
}

function contactLine(meta: Resume["meta"]): string {
  const parts = [meta.email, meta.phone, meta.location]
  if (meta.linkedin) parts.push(meta.linkedin)
  if (meta.github) parts.push(meta.github)
  if (meta.website) parts.push(meta.website)
  return parts.join("  ·  ")
}

export function ResumePreview({ resume }: Props) {
  return (
    <div className="mx-auto max-w-[794px] border border-border bg-white px-10 py-8 text-[9pt] leading-snug text-[#111] shadow-sm dark:bg-zinc-900 dark:text-zinc-100">

      {/* Header */}
      <h1 className="text-[15pt] font-bold leading-none">{resume.meta.name}</h1>
      <p className="mt-0.5 text-[8pt] text-[#444] dark:text-zinc-400">
        {contactLine(resume.meta)}
      </p>

      {/* Summary */}
      <SectionHeading>Summary</SectionHeading>
      <p className="text-[9pt] leading-[1.35]">{resume.summary}</p>

      {/* Experience */}
      <SectionHeading>Experience</SectionHeading>
      <div className="space-y-[5px]">
        {resume.experience.map((exp, i) => (
          <div key={i}>
            <div className="flex items-baseline justify-between">
              <span className="text-[9pt] font-bold">
                {exp.title}  ·  {exp.company}
              </span>
              <span className="text-[8pt] text-[#555] dark:text-zinc-400">{exp.duration}</span>
            </div>
            <p className="text-[8pt] text-[#555] dark:text-zinc-400">{exp.location}</p>
            <ul className="mt-0.5 space-y-px">
              {exp.bullets.map((bullet, j) => (
                <li key={j} className="flex gap-2 text-[8.5pt]">
                  <span className="shrink-0">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Skills */}
      <SectionHeading>Skills</SectionHeading>
      <div className="space-y-[2px]">
        {resume.skills.map((sk, i) => (
          <p key={i} className="text-[8.5pt]">
            <span className="font-bold">{sk.category}:&nbsp;&nbsp;</span>
            {sk.items.join(", ")}
          </p>
        ))}
      </div>

      {/* Education */}
      <SectionHeading>Education</SectionHeading>
      <div className="space-y-[4px]">
        {resume.education.map((edu, i) => (
          <div key={i}>
            <div className="flex items-baseline justify-between">
              <span className="text-[9pt] font-bold">{edu.institution}</span>
              <span className="text-[8pt] text-[#555] dark:text-zinc-400">{edu.year}</span>
            </div>
            <p className="text-[8pt] text-[#555] dark:text-zinc-400">
              {edu.degree}{edu.notes ? `  ·  ${edu.notes}` : ""}
            </p>
          </div>
        ))}
      </div>

      {/* Projects */}
      {resume.projects && resume.projects.length > 0 && (
        <>
          <SectionHeading>Projects</SectionHeading>
          <div className="space-y-[4px]">
            {resume.projects.map((proj, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[9pt] font-bold">{proj.name}</span>
                  {proj.link && (
                    <span className="text-[8pt] text-[#555] dark:text-zinc-400">{proj.link}</span>
                  )}
                </div>
                <p className="text-[8pt] text-[#555] dark:text-zinc-400">{proj.tech.join(", ")}</p>
                <p className="text-[8.5pt]">{proj.description}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-1 mt-2 border-b border-[#999] pb-[1.5px] text-[8pt] font-bold uppercase tracking-[0.9px] dark:border-zinc-600">
      {children}
    </h2>
  )
}
