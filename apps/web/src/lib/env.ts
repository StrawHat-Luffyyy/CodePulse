import { z } from "zod";

const schema = z.object({
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NEXTAUTH_SECRET must be at least 32 characters")
    .optional(),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
});

const result = schema.safeParse(process.env);

if (!result.success) {
  const issues = result.error.issues;
  const secretIssue = issues.find((i) => i.path.includes("NEXTAUTH_SECRET"));
  const otherIssues = issues.filter(
    (i) => !i.path.includes("NEXTAUTH_SECRET"),
  );

  // NEXTAUTH_SECRET missing → warn only (NextAuth handles this itself)
  if (secretIssue) {
    console.warn(
      "[NextAuth] WARNING: NEXTAUTH_SECRET is missing or too short. Sessions will not be secure!",
    );
  }

  // Other required vars → hard crash
  if (otherIssues.length > 0) {
    console.error("Invalid web environment variables:");
    otherIssues.forEach((i) => console.error(`  ${i.path}: ${i.message}`));
    throw new Error("Invalid environment — check your .env.local");
  }
}

export const webEnv = result.success
  ? result.data
  : ({
      ...result.error,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "",
    } as unknown as z.infer<typeof schema>);