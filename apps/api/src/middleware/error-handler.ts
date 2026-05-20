import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "../lib/logger";

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export async function errorHandler(c: Context, next: Next) {
  try {
    await next();
  } catch (error) {
    if (error instanceof HTTPException) {
      return c.json({ error: error.message, code: "HTTP_ERROR" }, error.status);
    }
    if (error instanceof AppError) {
      logger.warn({ err: error, code: error.code }, "Application error");
      return c.json(
        { error: error.message, code: error.code },
        error.statusCode as any,
      );
    }
    logger.error({ err: error }, "Unhandled error");
    return c.json({ error: "Internal server error" }, 500);
  }
}
