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
};

function detectLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return LANGUAGE_MAP[ext] ?? "Unknown";
}
export function parseDiff(files: any[]): ParsedFile[] {
  return files
    .filter((f) => f.patch && f.status !== "removed")
    .filter((f) => !isLockFile(f.filename))
    .map((f) => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      patch: f.patch,
      language: detectLanguage(f.filename),
    }));
}

function isLockFile(filename: string): boolean {
  const lockFiles = [
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "Gemfile.lock",
  ];
  return lockFiles.some((lf) => filename.endsWith(lf));
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
    if (totalTokens + fileTokens > maxTokens) break;
    result.push(file);
    totalTokens += fileTokens;
  }
  return result;
}
