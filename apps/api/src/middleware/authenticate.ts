import type { Context, Next } from "hono";
import { db } from "@codepulse/db";
import { AppError } from "./error-handler";

export async function authenticate(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AppError("Authentication required", 401, "UNAUTHORIZED");
  }
  const githubId = authHeader.replace("Bearer ", "");
  const user = await db.user.findUnique({
    where: { githubId },
  });
  if (!user) {
    throw new AppError("User not found", 401, "UNAUTHORIZED");
  }
  c.set("user", user);
  await next();
}
