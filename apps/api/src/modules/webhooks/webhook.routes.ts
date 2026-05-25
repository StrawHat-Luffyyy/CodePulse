import { Hono } from "hono";
import { createHmac, timingSafeEqual } from "crypto";
import { env } from "@codepulse/config";
import { logger } from "../../lib/logger";
import { AppError } from "../../middleware/error-handler";
import { webhookQueue } from "../../queues/webhook.queue";

const webhookRoutes = new Hono();

async function verifyGithubSignature(
  payload: string,
  signature: string | undefined,
): Promise<boolean> {
  if (!signature || !env.GITHUB_WEBHOOK_SECRET) return false;

  const hmac = createHmac("sha256", env.GITHUB_WEBHOOK_SECRET);
  hmac.update(payload);
  const digest = `sha256=${hmac.digest("hex")}`;

  const sigBuffer = Buffer.from(signature);
  const digestBuffer = Buffer.from(digest);

  if (sigBuffer.length !== digestBuffer.length) return false;
  return timingSafeEqual(sigBuffer, digestBuffer);
}

webhookRoutes.post("/github", async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header("x-hub-signature-256");
  const event = c.req.header("x-github-event");
  const deliveryId = c.req.header("x-github-delivery");

  const isValid = await verifyGithubSignature(rawBody, signature);
  if (!isValid) {
    logger.warn({ deliveryId }, "Invalid webhook signature — possible attack");
    throw new AppError("Invalid signature", 401, "INVALID_SIGNATURE");
  }
  const payload = JSON.parse(rawBody);
  logger.info(
    { event, deliveryId, action: payload.action },
    "Webhook received",
  );

  if (event !== "pull_request") {
    return c.json({ message: "Event ignored" });
  }
  if (!["opened", "synchronize"].includes(payload.action)) {
    return c.json({ message: "Action ignored" });
  }
  await webhookQueue.add(
    "process-pr",
    {
      event,
      payload,
      deliveryId,
    },
    {
      jobId: deliveryId,
      removeOnComplete: { age: 86400 },
      removeOnFail: { count: 50 },
    },
  );
  return c.json({ message: "Webhook queued", deliveryId });
});

export { webhookRoutes };
