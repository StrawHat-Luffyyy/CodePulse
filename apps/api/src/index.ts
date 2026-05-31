import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { env } from "@codepulse/config";
import { AppError } from "./middleware/error-handler";
import { requestLogger } from "./middleware/request-logger";
import { authRoutes } from "./modules/auth/auth.routes";
import { logger } from "./lib/logger";
import { HTTPException } from "hono/http-exception";
import { webhookRoutes } from "./modules/webhooks/webhook.routes";
import { startWebhookWorker } from "./workers/webhook.worker";
import { createBullBoardAdapter } from "./lib/bullboard";
import { webhookQueue } from "./queues/webhook.queue";
import { redis } from "./lib/redis";
import { verifyOpenAIConnection } from "./lib/openai-client";

const app = new Hono();

app.use("*", requestLogger);
app.route("/api/auth", authRoutes);
app.route("/api/webhooks", webhookRoutes);

app.get("/health", (c) =>
  c.json({
    status: "ok",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  }),
);

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

const bullBoardAdapter = createBullBoardAdapter();
app.route("/admin/queues", bullBoardAdapter.registerPlugin());

let server: ReturnType<typeof serve>;
let worker: ReturnType<typeof startWebhookWorker>;

async function bootstrap() {
  await verifyOpenAIConnection();

  server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
    logger.info(`API running on http://localhost:${info.port}`);
    logger.info(`Queue dashboard: http://localhost:${info.port}/admin/queues`);
  });

  worker = startWebhookWorker();
  logger.info("BullMQ worker started");
}

bootstrap().catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});

const shutdown = async (signal: string) => {
  logger.info(`${signal} received — shutting down gracefully`);

  try {
    if (server) {
      server.close();
      logger.info("HTTP server closed");
    }

    if (worker) await worker.close();
    await webhookQueue.close();
    await redis.quit();

    logger.info("Shutdown complete");
    process.exit(0);
  } catch (err) {
    logger.error({ err }, "Error during shutdown");
    process.exit(1);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
