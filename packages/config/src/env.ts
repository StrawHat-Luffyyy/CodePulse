import dotenv from "dotenv";
import path from "path";

// Load .env from the workspace root
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { z } from "zod";

const envSchema = z.object({
  //App
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().default("3001").transform(Number),

  //Database
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),

  //Redis
  REDIS_URL: z.string().url("REDIS_URL must be a valid URL"),

  //Github OAuth
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),

  //OpenAI
  OPENAI_API_KEY: z.string().optional(),
});

type EnvSchema = z.infer<typeof envSchema>;

function validateEnv(): EnvSchema {
  const result = envSchema.safeParse(process.env);
  if (result.success) {
    return result.data;
  }

  console.error("Invalid environment variables:");
  result.error.issues.forEach((issue) => {
    console.error(`${issue.path.join(".")}: ${issue.message}`);
  });
  throw new Error("Invalid environment variables");
}

export const env = validateEnv();
