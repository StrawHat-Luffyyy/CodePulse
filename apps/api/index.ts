import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { env } from "@codepulse/config";
import { errorHandler } from "./src/middleware/error-handler";
import { requestLogger } from "./src/middleware/request-logger";
import { authRoutes } from "./src/modules/auth/auth.routes";
const app = new Hono();

app.use("*", requestLogger);
app.use("*", errorHandler);

app.route("/api/auth", authRoutes);

app.get("/health", (c) =>
  c.json({
    status: "ok",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  }),
);

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`API Server is running on http://localhost:${info.port}`);
});
