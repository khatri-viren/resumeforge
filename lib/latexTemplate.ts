import "server-only"

import { spawn } from "child_process"
import { mkdtemp, readFile, rm, writeFile } from "fs/promises"
import { tmpdir } from "os"
import { join } from "path"

import type { Resume } from "./resumeSchema"

// Escape special LaTeX characters. Backslash must be replaced first.
function esc(str: string): string {
  return str
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}")
}

export function generateLatex(resume: Resume): string {
  const { meta } = resume

  const contactItems = [
    `\\faPhone\\ \\texttt{${esc(meta.phone)}}`,
    `\\faEnvelope \\hspace{2pt} \\texttt{${esc(meta.email)}}`,
    ...(meta.linkedin ? [`\\faLinkedin \\hspace{2pt} \\texttt{${esc(meta.linkedin)}}`] : []),
    ...(meta.github ? [`\\faGithub \\hspace{2pt} \\texttt{${esc(meta.github)}}`] : []),
    ...(meta.website ? [`\\faGlobe \\hspace{2pt} \\texttt{${esc(meta.website)}}`] : []),
    `\\faMapMarker\\ \\hspace{2pt} \\texttt{${esc(meta.location)}}`,
  ]
  const contactLine = contactItems
    .map((item, i) => (i < contactItems.length - 1 ? `${item} \\hspace{1pt} $|$` : item))
    .join("\n    \\hspace{1pt} ")

  const experienceSection = resume.experience
    .map(
      (exp) => `
    \\resumeSubheading
      {${esc(exp.company)}}{${esc(exp.duration)}}
      {${esc(exp.title)}}{${esc(exp.location)}}
      \\resumeItemListStart
${exp.bullets.map((b) => `        \\resumeItem{${esc(b)}}`).join("\n")}
      \\resumeItemListEnd`,
    )
    .join("\n")

  const projectsSection =
    resume.projects && resume.projects.length > 0
      ? `
%-----------PROJECTS-----------
\\section{PROJECTS}
    \\resumeSubHeadingListStart
${resume.projects
  .map((proj) => {
    const nameLink = proj.link
      ? `\\textbf{\\href{${esc(proj.link)}}{${esc(proj.name)}}}`
      : `\\textbf{${esc(proj.name)}}`
    const tech = proj.tech.length ? ` $|$ \\small{${esc(proj.tech.join(", "))}}` : ""
    return `
      \\resumeProjectHeading
          {${nameLink}${tech}}{}
          \\resumeItemListStart
            \\resumeItem{${esc(proj.description)}}
          \\resumeItemListEnd`
  })
  .join("\n")}
    \\resumeSubHeadingListEnd`
      : ""

  const educationSection = resume.education
    .map(
      (edu) => `
    \\resumeSubheading
      {${esc(edu.institution)}}{${esc(edu.year)}}
      {${esc(edu.degree)}}{}${
        edu.notes
          ? `
      \\resumeItemListStart
        \\resumeItem{${esc(edu.notes)}}
      \\resumeItemListEnd`
          : ""
      }`,
    )
    .join("\n")

  const skillsRows = resume.skills
    .map((sk, i) => {
      const sep = i < resume.skills.length - 1 ? " \\\\\n     \\vspace{2pt}" : ""
      return `     \\textbf{${esc(sk.category)}} {: ${esc(sk.items.join(", "))}}${sep}`
    })
    .join("\n")

  return `\\documentclass[letterpaper,11pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\usepackage{fontawesome}
\\usepackage[scale=0.90,lf]{FiraMono}

\\definecolor{light-grey}{gray}{0.83}
\\definecolor{dark-grey}{gray}{0.3}
\\definecolor{text-grey}{gray}{.08}

\\DeclareRobustCommand{\\ebseries}{\\fontseries{eb}\\selectfont}
\\DeclareTextFontCommand{\\texteb}{\\ebseries}

\\usepackage{contour}
\\usepackage[normalem]{ulem}
\\renewcommand{\\ULdepth}{1.8pt}
\\contourlength{0.8pt}
\\newcommand{\\myuline}[1]{%
  \\uline{\\phantom{#1}}%
  \\llap{\\contour{white}{#1}}%
}

\\usepackage{tgheros}
\\renewcommand*\\familydefault{\\sfdefault}
\\usepackage[T1]{fontenc}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{0in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

\\titleformat{\\section}{
    \\bfseries \\vspace{2pt} \\raggedright \\large
}{}{0em}{}[\\color{light-grey} {\\titlerule[2pt]} \\vspace{-4pt}]

\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{-1pt}}
  }
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-1pt}\\item
    \\begin{tabular*}{\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & {\\color{dark-grey}\\small #2}\\vspace{1pt}\\\\
      \\textit{#3} & {\\color{dark-grey} \\small #4}\\\\
    \\end{tabular*}\\vspace{-4pt}
}

\\newcommand{\\resumeProjectHeading}[2]{
    \\item
    \\begin{tabular*}{\\textwidth}{l@{\\extracolsep{\\fill}}r}
      #1 & {\\color{dark-grey}} \\\\
    \\end{tabular*}\\vspace{-4pt}
}

\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}

\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{0pt}}

\\color{text-grey}

\\begin{document}

%----------HEADING----------
\\begin{center}
    \\textbf{\\Huge ${esc(meta.name)}} \\\\ \\vspace{5pt}
    \\small ${contactLine}
    \\\\ \\vspace{-3pt}
\\end{center}

%-----------SUMMARY-----------
\\section{SUMMARY}
\\small{${esc(resume.summary)}}
\\vspace{4pt}

%-----------EXPERIENCE-----------
\\section{EXPERIENCE}
  \\resumeSubHeadingListStart
${experienceSection}
  \\resumeSubHeadingListEnd
${projectsSection}

%-----------EDUCATION-----------
\\section{EDUCATION}
  \\resumeSubHeadingListStart
${educationSection}
  \\resumeSubHeadingListEnd

%-----------SKILLS-----------
\\section{SKILLS}
 \\begin{itemize}[leftmargin=0in, label={}]
    \\small{\\item{
${skillsRows}
    }}
 \\end{itemize}

\\end{document}
`
}

async function compileLaTeX(latex: string): Promise<Buffer> {
  const tmpDir = await mkdtemp(join(tmpdir(), "resumeforge-"))
  const texPath = join(tmpDir, "resume.tex")
  const pdfPath = join(tmpDir, "resume.pdf")

  try {
    await writeFile(texPath, latex, "utf-8")

    await new Promise<void>((resolve, reject) => {
      const proc = spawn("tectonic", ["--outdir", tmpDir, texPath], { stdio: "pipe" })
      let stderr = ""
      proc.stderr.on("data", (d: Buffer) => {
        stderr += d.toString()
      })
      proc.stdout.on("data", () => {})
      proc.on("close", (code) => {
        if (code === 0) resolve()
        else reject(new Error(`tectonic exited ${code}:\n${stderr}`))
      })
      proc.on("error", (err) => {
        reject(new Error(`tectonic not found — run: brew install tectonic\n${err.message}`))
      })
    })

    return await readFile(pdfPath)
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
}

export async function generateResumePdf(resume: Resume): Promise<Buffer> {
  return compileLaTeX(generateLatex(resume))
}
