import { Hono } from "hono";
import { db } from "@codepulse/db";
import { AppError } from "../../middleware/error-handler.js";
import { logger } from "../../lib/logger.js";
import { z } from "zod";

const authRoutes = new Hono();

const syncUserSchema = z.object({
  githubId: z.string().min(1, "githubId is required"),
  username: z.string().min(1, "username is required"),
  email: z.string().email().optional(),
  avatarUrl: z.string().url().optional(),
  accessToken: z.string().min(1, "accessToken is required"),
});

authRoutes.post("/sync", async (c) => {
  const body = c.req.json();
  const data = syncUserSchema.safeParse(await body);

  if (!data.success) {
    throw new AppError("Invalid user data", 400, "VALIDATION_ERROR");
  }

  const user = await db.user.upsert({
    where: {
      githubId: data.data.githubId,
    },
    update: {
      username: data.data.username,
      email: data.data.email,
      avatarUrl: data.data.avatarUrl,
      accessToken: data.data.accessToken,
    },
    create: {
      githubId: data.data.githubId,
      username: data.data.username,
      email: data.data.email,
      avatarUrl: data.data.avatarUrl,
      accessToken: data.data.accessToken,
    },
  });
  logger.info(
    { userId: user.id, username: user.username },
    "User synced",
  );
  return c.json({ userId: user.id });
});

export { authRoutes };
