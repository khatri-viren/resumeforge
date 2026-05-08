import fs from "fs"
import path from "path"
import { PDFParse } from "pdf-parse"
import mammoth from "mammoth"

export function resolveSkillsDir(): string {
  return path.join(process.cwd(), "skills")
}

export function resolveContextDir(): string {
  return path.join(process.cwd(), "context")
}

const IGNORED = new Set(["README.md", ".DS_Store"])
const SUPPORTED_EXTS = new Set([".pdf", ".docx", ".md", ".txt"])

export async function listDirectory(dirPath: string): Promise<string[]> {
  try {
    return fs
      .readdirSync(dirPath)
      .filter((f) => !f.startsWith(".") && !IGNORED.has(f))
  } catch {
    return []
  }
}

// Recursively walks a directory and returns relative paths for all readable files.
// e.g. ["base-resume.pdf", "docs-smartmocks/brief.md", "docs-worqhat/api.pdf"]
export function listContextFiles(dirPath: string, base = ""): string[] {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    const results: string[] = []
    for (const entry of entries) {
      if (entry.name.startsWith(".") || IGNORED.has(entry.name)) continue
      const rel = base ? `${base}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        results.push(...listContextFiles(path.join(dirPath, entry.name), rel))
      } else if (SUPPORTED_EXTS.has(path.extname(entry.name).toLowerCase())) {
        results.push(rel)
      }
    }
    return results
  } catch {
    return []
  }
}

export async function readPdf(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath)
  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  const result = await parser.getText()
  const text = result.text.trim()
  if (text.length < 50) {
    return "__PDF_PARSE_FAILED__: Could not extract text. PDF may be scanned or encrypted."
  }
  return text.slice(0, 10000)
}

export async function readDocx(filePath: string): Promise<string> {
  const result = await mammoth.extractRawText({ path: filePath })
  return result.value.trim().slice(0, 10000)
}

export async function readTextFile(filePath: string): Promise<string> {
  return fs.readFileSync(filePath, "utf-8").slice(0, 10000)
}

// Like readTextFile but returns "" instead of throwing if the file doesn't exist.
export async function readTextFileSafe(filePath: string): Promise<string> {
  if (!fs.existsSync(filePath)) return ""
  return fs.readFileSync(filePath, "utf-8").slice(0, 15000)
}

export async function readFileByExtension(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase()
  if (!fs.existsSync(filePath)) {
    return `__FILE_NOT_FOUND__: ${path.basename(filePath)} does not exist.`
  }
  switch (ext) {
    case ".pdf":
      return readPdf(filePath)
    case ".docx":
      return readDocx(filePath)
    case ".md":
    case ".txt":
      return readTextFile(filePath)
    default:
      return `__UNSUPPORTED_FORMAT__: Cannot read ${ext} files.`
  }
}

export async function readFileBuffer(buffer: Buffer, filename: string): Promise<string> {
  const ext = path.extname(filename).toLowerCase()
  switch (ext) {
    case ".pdf": {
      const parser = new PDFParse({ data: new Uint8Array(buffer) })
      const result = await parser.getText()
      const text = result.text.trim()
      if (text.length < 50) {
        return "__PDF_PARSE_FAILED__: Could not extract text from uploaded PDF."
      }
      return text.slice(0, 10000)
    }
    case ".docx": {
      const result = await mammoth.extractRawText({ buffer })
      return result.value.trim().slice(0, 10000)
    }
    case ".md":
    case ".txt":
      return buffer.toString("utf-8").slice(0, 10000)
    default:
      return `__UNSUPPORTED_FORMAT__: Cannot read ${ext} files.`
  }
}
