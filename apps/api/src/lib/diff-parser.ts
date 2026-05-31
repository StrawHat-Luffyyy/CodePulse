export interface ParsedFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch: string;
  language: string;
}

const LANGUAGE_MAP: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TypeScript",
  js: "JavaScript",
  jsx: "JavaScript",
  py: "Python",
  java: "Java",
  go: "Go",
  rs: "Rust",
  rb: "Ruby",
  cs: "C#",
  cpp: "C++",
  c: "C",
  php: "PHP",
  swift: "Swift",
  kt: "Kotlin",
  md: "Markdown",
  json: "JSON",
  yaml: "YAML",
  yml: "YAML",
  sql: "SQL",
  sh: "Shell",
  css: "CSS",
  html: "HTML",
};

const LOCK_FILES = [
  ".min.js",
  ".min.css",
  "dist/",
  "build/",
  ".next/",
  "generated/",
];

const GENERATED_FILES = [
  ".min.js",
  ".min.css",
  "dist/",
  "build/",
  ".next/",
  "generated/",
];

function detectLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return LANGUAGE_MAP[ext] ?? "Unknown";
}

function shouldSkipFile(filename: string): boolean {
  if (LOCK_FILES.some((lf) => filename.endsWith(lf))) return true;
  if (GENERATED_FILES.some((gf) => filename.includes(gf))) return true;
  return false;
}

export function parseDiff(files: any[]): ParsedFile[] {
  return files
    .filter((f) => f.patch && f.status !== "removed")
    .filter((f) => !shouldSkipFile(f.filename))
    .map((f) => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      patch: f.patch,
      language: detectLanguage(f.filename),
    }));
}

// Token estimation (rough: 1 token ≈ 4 characters)
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// If the diff is too large, truncate to stay within GPT-4o's context window
export function truncateDiff(
  files: ParsedFile[],
  maxTokens = 6000,
): ParsedFile[] {
  let totalTokens = 0;
  const result: ParsedFile[] = [];
  for (const file of files) {
    const fileTokens = estimateTokens(file.patch);
    if (fileTokens > 3000) {
      const truncatePatch =
        file.patch.substring(0, 3000 * 4) + "\n... [truncated]";
      result.push({ ...file, patch: truncatePatch });
      totalTokens += 3000;
      continue;
    }
    if (totalTokens + fileTokens > maxTokens) {
      result.push(file);
      totalTokens += fileTokens;
    }
  }
  return result;
}
