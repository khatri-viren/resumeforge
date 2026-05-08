# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server with Turbopack
npm run build      # Production build
npm run start      # Start production server
npm run lint       # Run ESLint
npm run format     # Prettier-format all TS/TSX files
npm run typecheck  # tsc --noEmit type check
```

## What This Project Is

An AI-powered ATS resume builder. The user pastes a job description; a Gemini agent autonomously reads the candidate's base resume and skill context files, then outputs a structured `Resume` JSON. That JSON drives an in-browser editable preview and a server-side PDF export via `@react-pdf/renderer`.

See `docs/resume_builder_prd.md` for the full spec.

## Planned Architecture (from PRD)

```
/app
  page.tsx                  ← Main UI (3 screens: input → generating → preview/edit)
  /api
    /generate/route.ts      ← Gemini agent + tool calls → Resume JSON
    /export/route.ts        ← Resume JSON → PDF blob (server only)

/skills                     ← Skill context Markdown files (frontend.md, backend.md, …)
/context                    ← Persistent personal context (base-resume.pdf, achievements.md, …)

/lib
  fileLoaders.ts            ← pdf-parse (PDF) + mammoth (DOCX) helpers
  resumeSchema.ts           ← Zod schema for the Resume interface
  pdfTemplate.tsx           ← @react-pdf/renderer layout (single-column, ATS-safe)

/components
  JDInput.tsx
  FileUpload.tsx
  ResumePreview.tsx
  SectionEditor.tsx
  ExportButton.tsx
```

## Key Architecture Decisions

**LLM layer:** Vercel AI SDK (`@ai-sdk/google`) with `generateText` + tool calling (`maxSteps: 5`). Tools: `listSkillFiles`, `readSkillFile`, `readBaseResume`, `readContextDoc`. Gemini outputs a single valid JSON object matching the `Resume` schema — no markdown wrapper.

**PDF generation:** `@react-pdf/renderer` runs **server-side only** (in `/api/export`), never client-side (SSR issues). The template enforces ATS-safe layout: single-column, text-only, no tables/graphics.

**Zod validation:** Parse Gemini's JSON output through the `Resume` Zod schema on the server. On parse failure, retry with the validation errors injected back into the prompt.

**Resume JSON schema** (defined in `/lib/resumeSchema.ts`):
- `meta` — contact fields
- `summary` — 3–4 sentences mirroring JD language, includes exact job title
- `experience[]` — `bullets[]` each starting with a past-tense action verb + metric
- `skills[]` — categorised, tools listed verbatim as they appear in JD
- `education[]`
- `projects[]` (optional)
- `keywords[]` — top ATS keywords extracted from JD
- `atsScore` — `matchedKeywords`, `missingKeywords`, `estimatedScore` (0–100)

## Current State

The Next.js app is scaffolded (template stage). No API routes, components, or lib utilities exist yet — the codebase is ready for Phase 1 implementation per the PRD build phases.

## Styling Conventions

- Tailwind CSS v4 with OKLch CSS custom properties for theming
- shadcn/ui components (`npx shadcn add <component>`) — config in `components.json`
- `cn()` from `@/lib/utils` for all className merging (clsx + tailwind-merge)
- Dark mode via `next-themes`; toggle hotkey `d` is wired in `ThemeProvider`
- Path alias `@/*` maps to the repo root
