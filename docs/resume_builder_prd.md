# PRD: AI-Powered ATS Resume Builder
**Version:** 1.0  
**Status:** Draft  
**Author:** Viren  
**Last Updated:** May 2026

---

## 1. Problem Statement

Tailoring a resume for every job application is time-consuming and requires knowing how ATS systems parse and rank resumes. Most people either send a generic resume (low match rate) or spend 30–60 minutes manually rewriting one per application. Existing tools either offer cosmetic formatting help or superficial keyword stuffing — none truly reason over your experience and the JD to construct a strategically optimised resume.

---

## 2. Goal

Build a web application that takes a job description as input, autonomously reads the user's base resume, skill context files, and supplementary documents, and generates a fully ATS-optimised resume exported as a clean PDF — with minimal manual effort.

---

## 3. Target User

**Primary:** Developers, designers, and knowledge workers actively job hunting who have some existing resume/portfolio material but are applying to multiple roles with varying requirements.

**Secondary:** Recruiters or hiring coaches who build resumes on behalf of candidates.

---

## 4. Success Metrics

| Metric | Target |
|---|---|
| Time from JD paste to PDF download | < 60 seconds |
| ATS keyword match score (Jobscan or similar) | ≥ 80% |
| User-reported resume quality rating | ≥ 4/5 |
| PDF export success rate | ≥ 99% |

---

## 5. Scope

### 5.1 In Scope (v1)
- Web UI with JD input, optional doc upload, and generation controls
- Agentic file reading via Gemini tool calls (base resume, skill files, context docs)
- Structured resume JSON generation via Gemini (Google)
- ATS optimisation logic embedded in prompt strategy
- PDF export via `@react-pdf/renderer`
- In-browser resume preview before export
- Editable resume sections before final PDF generation

### 5.2 Out of Scope (v1)
- User authentication / accounts
- Resume history / versioning
- Multi-resume management
- Cover letter generation
- LinkedIn profile sync
- Direct job board integration
- Mobile-optimised UI

---

## 6. Technical Architecture

### 6.1 Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| LLM | Google Gemini 2.0 Flash via Vercel AI SDK (`@ai-sdk/google`) |
| LLM Orchestration | Vercel AI SDK `generateText` with tool calling (`maxSteps: 5`) |
| PDF Generation | `@react-pdf/renderer` (server-side, API route) |
| File Parsing | `pdf-parse` (PDF), `mammoth` (DOCX) |
| Styling | Tailwind CSS + shadcn/ui |
| File Upload | Native Next.js + `formidable` |
| Deployment | Vercel |

### 6.2 Project Structure

```
/app
  page.tsx                  ← Main UI
  /api
    /generate/route.ts      ← Gemini agent + tool calls → resume JSON
    /export/route.ts        ← resume JSON → PDF blob response

/skills                     ← Skill context files (Markdown)
  frontend.md
  backend.md
  system-design.md
  leadership.md
  ...

/context                    ← Persistent personal context
  base-resume.pdf           ← Master resume
  portfolio.md
  achievements.md
  bio.md

/lib
  fileLoaders.ts            ← pdf-parse + mammoth helpers
  resumeSchema.ts           ← Zod schema for resume JSON
  pdfTemplate.tsx           ← @react-pdf/renderer resume layout

/components
  JDInput.tsx
  FileUpload.tsx
  ResumePreview.tsx
  SectionEditor.tsx
  ExportButton.tsx
```

### 6.3 Data Flow

```
[User] Paste JD + optional file uploads
           ↓
[page.tsx] POST → /api/generate
           ↓
[Gemini Agent] Tool calls:
  1. listSkillFiles()       → reads /skills directory
  2. readSkillFile(name)    → reads relevant .md files
  3. readBaseResume()       → parses /context/base-resume.pdf
  4. readContextDoc(name)   → reads supplementary context
           ↓
[Gemini] Synthesises all context → outputs Resume JSON
           ↓
[page.tsx] Renders ResumePreview (editable)
           ↓
[User] Reviews, edits sections, clicks Export
           ↓
[/api/export] resume JSON → @react-pdf/renderer → PDF blob
           ↓
[Browser] Download triggered
```

### 6.4 Resume JSON Schema

```typescript
interface Resume {
  meta: {
    name: string
    email: string
    phone: string
    location: string
    linkedin?: string
    github?: string
    website?: string
  }
  summary: string              // 3–4 sentences, JD-mirrored language
  experience: {
    company: string
    title: string
    duration: string
    location: string
    bullets: string[]          // 3–5 per role, action verb + metric
  }[]
  skills: {
    category: string
    items: string[]
  }[]
  education: {
    institution: string
    degree: string
    year: string
    notes?: string
  }[]
  projects?: {
    name: string
    description: string
    tech: string[]
    link?: string
  }[]
  keywords: string[]           // ATS keyword list extracted from JD
  atsScore: {
    matchedKeywords: string[]
    missingKeywords: string[]
    estimatedScore: number     // 0–100
  }
}
```

---

## 7. Feature Specifications

### 7.1 JD Input
- Large textarea, minimum 300 character validation
- Auto-detect and highlight key role requirements (client-side, regex)
- "Paste from clipboard" button

### 7.2 Context File Upload (Optional)
- Accept: `.pdf`, `.docx`, `.md`, `.txt`
- Max file size: 5MB per file, max 5 files
- Files supplement (not replace) the persistent `/context` folder
- Show uploaded file list with remove option

### 7.3 Generation Controls
- **Skill selection:** Checkboxes showing all files from `/skills` folder; Gemini also autonomously selects, but user can override
- **Resume length:** Toggle — Concise (1 page) / Standard (1–2 pages)
- **Tone:** Toggle — Technical / Executive
- **Generate button** → triggers loading state with streaming status messages

### 7.4 Resume Preview
- Rendered HTML preview matching PDF layout (not the PDF itself)
- Inline editing per section (summary, each bullet, skills list)
- ATS score panel: matched keywords (green), missing keywords (red), overall score
- Keyword density indicator per section

### 7.5 PDF Export
- `/api/export` receives final resume JSON (post any user edits)
- `@react-pdf/renderer` template: clean, single-column, ATS-safe (no tables, no graphics, no columns)
- Font: Inter or similar sans-serif — embedded in PDF
- Download filename: `[Name]_[Role]_Resume.pdf`
- Also offer `.docx` export via `docx` npm package (v1 stretch goal)

### 7.6 ATS Score Panel
Displayed after generation:
- Overall estimated ATS match score (0–100)
- Matched keywords from JD found in resume
- Missing keywords from JD not found in resume
- One-click "Add missing keywords" suggestion per section

---

## 8. Gemini Prompt Strategy

### System Prompt
```
You are an expert technical resume writer and ATS optimisation specialist.

Your job:
1. Use tools to read the candidate's base resume, relevant skill files, and context documents
2. Analyse the job description for: required skills, preferred skills, seniority signals, 
   domain language, and implicit culture fit markers
3. Reconstruct the resume to maximise ATS match while staying truthful to the candidate's 
   actual experience
4. Mirror the JD's exact language and terminology where applicable
5. Quantify every bullet point where data exists or can be reasonably inferred
6. Lead every bullet with a strong past-tense action verb
7. Output ONLY a valid JSON object matching the Resume schema — no markdown, no preamble

ATS Rules:
- No tables, columns, headers/footers, or graphics in structure assumptions
- Keyword density: target 2–3 mentions of top 5 JD keywords across the resume
- Summary must contain the exact job title from the JD
- Skills section must list tools/technologies verbatim as they appear in JD
```

### Tool Sequence (expected)
1. `listSkillFiles` → assess available skill context
2. `readBaseResume` → parse candidate experience
3. `readSkillFile(x)` × N → pull relevant skill depth
4. `readContextDoc(x)` × N → pull achievements, portfolio
5. Synthesise → output JSON

---

## 9. ATS Optimisation Rules (Embedded in Generation)

| Rule | Implementation |
|---|---|
| Keyword mirroring | Extract top 15 JD keywords, verify presence in output JSON |
| Action verbs | Validated against a curated verb list in system prompt |
| No graphics/tables | PDF template enforces single-column text-only layout |
| File format | PDF with embedded text (not image-based) |
| Section headers | Standard labels: Experience, Skills, Education (not creative variants) |
| Date format | Consistent `MMM YYYY – MMM YYYY` throughout |
| Quantification | Prompt instructs Gemini to flag unquantified bullets and improve them |

---

## 10. UX Screens

### Screen 1 — Input
- Header: "AI Resume Builder"
- JD input textarea (primary, large)
- File upload zone (secondary)
- Skill file checkboxes (collapsible)
- Generation options (length, tone)
- Generate CTA button

### Screen 2 — Generating
- Full-screen loading state
- Streaming status messages: "Reading your resume…", "Analysing job description…", "Selecting relevant skills…", "Building your resume…"

### Screen 3 — Preview + Edit
- Left panel: Editable resume sections
- Right panel: ATS score, keyword analysis
- Bottom bar: "Export PDF" button, "Regenerate" button

---

## 11. Build Phases

### Phase 1 — Core Pipeline (Days 1–2)
- [ ] Next.js project setup, Tailwind, shadcn
- [ ] `/api/generate` route with Gemini tool calling
- [ ] Base resume + skill file loader utilities
- [ ] Resume JSON schema (Zod)
- [ ] Basic UI: JD input → generate → raw JSON display

### Phase 2 — PDF + Preview (Days 3–4)
- [ ] `@react-pdf/renderer` template
- [ ] `/api/export` route
- [ ] HTML preview component matching PDF layout
- [ ] Download trigger

### Phase 3 — Polish (Days 5–6)
- [ ] Inline section editing
- [ ] ATS score panel
- [ ] Skill file checkbox UI
- [ ] Streaming generation status messages
- [ ] File upload handling

### Phase 4 — Stretch Goals (Post v1)
- [ ] DOCX export
- [ ] Multiple resume template options
- [ ] Resume version history (localStorage)
- [ ] Cover letter generation (same pipeline)
- [ ] Jobscan-style ATS score via external API

---

## 12. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Gemini output not valid JSON | Medium | Zod parse with retry prompt on failure |
| PDF layout breaks on long resumes | Medium | Cap content length in prompt, overflow handling in template |
| `@react-pdf/renderer` SSR issues | Low | Keep in API route only, never client-side |
| Skill files not relevant to JD | Low | Gemini selects autonomously; user can override via checkboxes |
| Base resume PDF not parseable | Low | Fallback to manual text input for base resume |

---

## 13. Open Questions

1. Should uploaded context docs persist across sessions (local storage / file system) or be session-only?
2. Do we want a "diff view" showing what changed from base resume to generated resume?
3. Should the ATS score be computed client-side (keyword matching logic) or via a separate Gemini call?
4. DOCX export in v1 or deferred?
5. Is there a need for multiple PDF templates (e.g. creative vs. corporate layout)?
