import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { env } from "@codepulse/config";
import { errorHandler } from "./src/middleware/error-handler";
import { requestLogger } from "./src/middleware/request-logger";

const app = new Hono();


app.use("*", requestLogger);
app.use("*", errorHandler);




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
