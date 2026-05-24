import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set.");
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

declare global {
  var __prisma: PrismaClient | undefined;
}

export const db: PrismaClient = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = db;
}

async function shutdown(): Promise<void> {
  await db.$disconnect();
}

process.once("beforeExit", shutdown);
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

export * from "../generated/prisma/client.js";
