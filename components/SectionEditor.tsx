"use client"

import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import type { Resume } from "@/lib/resumeSchema"

interface Props {
  resume: Resume
  onChange: (updated: Resume) => void
}

export function SectionEditor({ resume, onChange }: Props) {
  function updateSummary(summary: string) {
    onChange({ ...resume, summary })
  }

  function updateBullet(expIndex: number, bulletIndex: number, value: string) {
    const experience = resume.experience.map((exp, ei) =>
      ei === expIndex
        ? { ...exp, bullets: exp.bullets.map((b, bi) => (bi === bulletIndex ? value : b)) }
        : exp
    )
    onChange({ ...resume, experience })
  }

  function addBullet(expIndex: number) {
    const experience = resume.experience.map((exp, ei) =>
      ei === expIndex ? { ...exp, bullets: [...exp.bullets, ""] } : exp
    )
    onChange({ ...resume, experience })
  }

  function removeBullet(expIndex: number, bulletIndex: number) {
    const experience = resume.experience.map((exp, ei) =>
      ei === expIndex
        ? { ...exp, bullets: exp.bullets.filter((_, bi) => bi !== bulletIndex) }
        : exp
    )
    onChange({ ...resume, experience })
  }

  function updateSkillItem(skillIndex: number, itemIndex: number, value: string) {
    const skills = resume.skills.map((sk, si) =>
      si === skillIndex
        ? { ...sk, items: sk.items.map((it, ii) => (ii === itemIndex ? value : it)) }
        : sk
    )
    onChange({ ...resume, skills })
  }

  function addSkillItem(skillIndex: number) {
    const skills = resume.skills.map((sk, si) =>
      si === skillIndex ? { ...sk, items: [...sk.items, ""] } : sk
    )
    onChange({ ...resume, skills })
  }

  function removeSkillItem(skillIndex: number, itemIndex: number) {
    const skills = resume.skills.map((sk, si) =>
      si === skillIndex
        ? { ...sk, items: sk.items.filter((_, ii) => ii !== itemIndex) }
        : sk
    )
    onChange({ ...resume, skills })
  }

  return (
    <div className="space-y-6 rounded border border-border bg-background p-5">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Edit Resume
      </h2>

      {/* Summary */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium">Summary</label>
        <Textarea
          className="min-h-[80px] resize-none text-xs"
          value={resume.summary}
          onChange={(e) => updateSummary(e.target.value)}
        />
      </div>

      <Separator />

      {/* Experience bullets */}
      <div className="space-y-4">
        <p className="text-xs font-medium">Experience Bullets</p>
        {resume.experience.map((exp, ei) => (
          <div key={ei} className="space-y-1.5">
            <p className="text-[11px] font-semibold text-muted-foreground">
              {exp.title} · {exp.company}
            </p>
            {exp.bullets.map((bullet, bi) => (
              <div key={bi} className="flex items-start gap-1.5">
                <span className="mt-2 shrink-0 text-xs text-muted-foreground">•</span>
                <Input
                  className="h-auto py-1 text-xs"
                  value={bullet}
                  onChange={(e) => updateBullet(ei, bi, e.target.value)}
                />
                {exp.bullets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeBullet(ei, bi)}
                    className="mt-1.5 shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
            ))}
            <Button
              variant="ghost"
              size="xs"
              className="h-6 text-xs"
              onClick={() => addBullet(ei)}
            >
              <Plus className="mr-1 size-3" />
              Add bullet
            </Button>
          </div>
        ))}
      </div>

      <Separator />

      {/* Skills */}
      <div className="space-y-3">
        <p className="text-xs font-medium">Skills</p>
        {resume.skills.map((skill, si) => (
          <div key={si} className="space-y-1.5">
            <p className="text-[11px] font-semibold text-muted-foreground">
              {skill.category}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {skill.items.map((item, ii) => (
                <div key={ii} className="flex items-center gap-0.5">
                  <Input
                    className="h-6 w-28 px-2 text-xs"
                    value={item}
                    onChange={(e) => updateSkillItem(si, ii, e.target.value)}
                  />
                  {skill.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSkillItem(si, ii)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>
              ))}
              <Button
                variant="ghost"
                size="xs"
                className="h-6 text-xs"
                onClick={() => addSkillItem(si)}
              >
                <Plus className="mr-1 size-3" />
                Add
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
