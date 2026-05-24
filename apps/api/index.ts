import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { env } from "@codepulse/config";
import { AppError } from "./src/middleware/error-handler";
import { requestLogger } from "./src/middleware/request-logger";
import { authRoutes } from "./src/modules/auth/auth.routes";
import { logger } from "./src/lib/logger";
import { HTTPException } from "hono/http-exception";

const app = new Hono();

app.use("*", requestLogger);

app.route("/api/auth", authRoutes);

app.get("/health", (c) =>
  c.json({
    status: "ok",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  }),
);

// Hono's onError is the correct way to handle errors from route handlers
app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return c.json({ error: error.message, code: "HTTP_ERROR" }, error.status);
  }
  if (error instanceof AppError) {
    logger.warn({ err: error, code: error.code }, "Application error");
    return c.json(
      { error: error.message, code: error.code },
      error.statusCode as 400 | 401 | 403 | 404 | 409 | 422 | 500,
    );
  }
  logger.error({ err: error }, "Unhandled error");
  return c.json({ error: "Internal server error" }, 500);
});

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`API Server is running on http://localhost:${info.port}`);
});
