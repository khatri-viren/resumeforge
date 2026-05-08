# ResumeForge

An AI-powered ATS resume builder that tailors your resume to any job description in seconds.

## Overview

ResumeForge automates resume optimization for job applications. Paste a job description, and an AI agent intelligently reads your base resume and skill context files, then generates a perfectly tailored, ATS-optimized resume—complete with keyword matching, strategic metrics, and professional formatting—ready to download as a PDF.

### Why ResumeForge?

- **Time Savings:** Generate an optimized resume in under 60 seconds instead of 30–60 minutes of manual work
- **ATS Smart:** Built-in optimization for Applicant Tracking Systems with keyword matching and scoring
- **AI-Native:** Uses Gemini to reason over your experience and the job description
- **Editable:** Preview and tweak your resume before downloading
- **No Account Required:** Works entirely in-browser; no login needed

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- A Google API key with Gemini access
- Your base resume, skill context, and any supporting documents

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd resumeforge

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your Google API key
# GOOGLE_API_KEY=your_key_here
```

### Running Locally

```bash
# Start the dev server with Turbopack
npm run dev

# Open http://localhost:3000 in your browser
```

### Building for Production

```bash
# Type check
npm run typecheck

# Lint code
npm run lint

# Format code
npm run format

# Build production bundle
npm run build

# Start production server
npm start
```

## How It Works

1. **Upload Context** (optional)
   - Your base resume (PDF or DOCX)
   - Skill files (Markdown in `/skills`)
   - Supporting context docs

2. **Paste Job Description**
   - Provide the target job posting

3. **AI Generation**
   - Gemini agent reads your context files
   - Analyzes the job description
   - Generates a tailored resume JSON with:
     - Professional summary matching JD language
     - Bullet points emphasizing relevant metrics
     - Categorized skills matching job requirements
     - ATS keyword analysis and scoring

4. **Preview & Edit**
   - Review the generated resume in-browser
   - Edit sections as needed
   - See real-time updates

5. **Export PDF**
   - Download a clean, ATS-safe PDF
   - Single-column layout optimized for parsing

## Project Structure

```
resumeforge/
├── app/                           # Next.js app router
│   ├── page.tsx                   # Main UI (3 screens: input → generating → preview)
│   └── api/
│       ├── generate/route.ts      # Gemini agent + tool calling → Resume JSON
│       └── export/route.ts        # Resume JSON → PDF export
├── components/                    # React components
│   ├── ui/                        # shadcn/ui components
│   ├── JDInput.tsx               # Job description input form
│   ├── FileUpload.tsx            # Resume/doc upload
│   ├── ResumePreview.tsx         # Resume viewer
│   ├── SectionEditor.tsx         # Inline editing
│   └── ExportButton.tsx          # PDF download
├── lib/                           # Utilities and schemas
│   ├── resumeSchema.ts           # Zod schema for Resume interface
│   ├── fileLoaders.ts            # PDF/DOCX parsing helpers
│   ├── pdfTemplate.tsx           # @react-pdf/renderer layout
│   └── utils.ts                  # Common utilities (cn, etc.)
├── context/                       # User's personal context docs
│   ├── base-resume.pdf
│   ├── achievements.md
│   └── bio.md
├── skills/                        # Skill context files (Markdown)
│   ├── frontend.md
│   ├── backend.md
│   ├── system-design.md
│   └── ...
├── docs/                          # Project documentation
│   └── resume_builder_prd.md      # Full product specification
├── CLAUDE.md                      # Claude Code instructions
└── package.json
```

## Resume JSON Schema

Generated resumes follow this structure (defined in `/lib/resumeSchema.ts`):

```typescript
{
  meta: {
    name: string;
    email: string;
    phone: string;
    location: string;
    links?: { label: string; url: string }[];
  };
  summary: string;              // 3–4 sentences, JD-aligned with job title
  experience: [
    {
      company: string;
      title: string;
      startDate: string;
      endDate: string;
      bullets: string[];        // Action verb + quantified results
    }
  ];
  skills: [
    {
      category: string;         // "Frontend", "Backend", etc.
      items: string[];          // Tools, technologies, languages
    }
  ];
  education: [
    {
      school: string;
      degree: string;
      field: string;
      graduationYear: number;
    }
  ];
  projects?: [
    {
      name: string;
      description: string;
      link?: string;
    }
  ];
  keywords: string[];           // Top ATS keywords from JD
  atsScore: {
    matchedKeywords: string[];
    missingKeywords: string[];
    estimatedScore: number;     // 0–100
  };
}
```

## Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **LLM** | Google Gemini via Vercel AI SDK (`@ai-sdk/google`) |
| **PDF Generation** | `@react-pdf/renderer` (server-side) |
| **File Parsing** | `pdf-parse`, `mammoth` |
| **Styling** | Tailwind CSS v4, shadcn/ui |
| **UI Components** | Radix UI + shadcn/ui |
| **Theme** | `next-themes` (dark/light mode) |
| **Validation** | Zod |
| **Deployment** | Vercel |

## Development

### Scripts

```bash
npm run dev          # Start dev server with Turbopack
npm run build        # Production build
npm start            # Start production server
npm run lint         # Run ESLint
npm run format       # Prettier-format all TS/TSX files
npm run typecheck    # Type check (tsc --noEmit)
```

### Code Style

- **Formatting:** Prettier (run `npm run format`)
- **Linting:** ESLint (run `npm run lint`)
- **Type Safety:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4 with `cn()` utility for className merging
- **Components:** shadcn/ui (add with `npx shadcn add <component>`)

### Adding Components

```bash
npx shadcn add button
npx shadcn add dialog
# etc.
```

New components are placed in `components/ui/`.

### Environment Variables

Create `.env.local` in the project root:

```env
GOOGLE_API_KEY=your_gemini_api_key
```

## ATS Optimization Strategy

ResumeForge optimizes for ATS systems through:

1. **Keyword Matching:** Extracts and embeds keywords from the job description
2. **Action Verbs:** Ensures all bullet points start with strong past-tense action verbs
3. **Quantified Results:** Emphasizes metrics and measurable achievements
4. **Clean Formatting:** Single-column layout, no tables/graphics, ATS-parseable structure
5. **Relevance Scoring:** Provides `atsScore` with matched/missing keywords and estimated score (0–100)

## Documentation

- **PRD:** See `docs/resume_builder_prd.md` for the full product specification, success metrics, and architecture details
- **Claude Instructions:** See `CLAUDE.md` for development guidelines and key architecture decisions

## Contributing

This is a personal project. For questions or suggestions, refer to the PRD or CLAUDE.md.

## License

MIT

---

**Questions?** Check the full PRD at `docs/resume_builder_prd.md` or review `CLAUDE.md` for architecture details.
