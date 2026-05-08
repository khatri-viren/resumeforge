import { z } from "zod"

const MetaSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  location: z.string(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
  website: z.string().optional(),
})

const ExperienceSchema = z.object({
  company: z.string(),
  title: z.string(),
  duration: z.string(),
  location: z.string(),
  bullets: z.array(z.string()).min(1).max(7),
})

const SkillsSchema = z.object({
  category: z.string(),
  items: z.array(z.string()),
})

const EducationSchema = z.object({
  institution: z.string(),
  degree: z.string(),
  year: z.string(),
  notes: z.string().optional(),
})

const ProjectSchema = z.object({
  name: z.string(),
  description: z.string(),
  tech: z.array(z.string()),
  link: z.string().optional(),
})

const AtsScoreSchema = z.object({
  matchedKeywords: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  estimatedScore: z.number().min(0).max(100),
})

export const ResumeSchema = z.object({
  meta: MetaSchema,
  summary: z.string(),
  experience: z.array(ExperienceSchema),
  skills: z.array(SkillsSchema),
  education: z.array(EducationSchema),
  projects: z.array(ProjectSchema).optional(),
  keywords: z.array(z.string()),
  atsScore: AtsScoreSchema,
})

export type Resume = z.infer<typeof ResumeSchema>
