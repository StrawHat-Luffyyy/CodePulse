import { Hono } from "hono";
import { authenticate } from "../../middleware/authenticate";
import { AppError } from "../../middleware/error-handler";
import { env } from "@codepulse/config";
import { db } from "@codepulse/db";

type Variables = {
  user: {
    id: string;
    accessToken: string;
  };
};

export const repoRoutes = new Hono<{
  Variables: Variables;
}>();

repoRoutes.get("/github", authenticate, async (c) => {
  const user = c.get("user");
  const response = await fetch(
    "https://api.github.com/user/repos?per_page=50&sort=updated",
    {
      headers: {
        Authorization: `Bearer ${user.accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    },
  );
  if (!response.ok) {
    throw new AppError("Failed to fetch GitHub repos", 502);
  }
  const repos = await response.json();
  return c.json(
    repos.map((r: any) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      isPrivate: r.private,
      description: r.description,
      language: r.language,
      updatedAt: r.updated_at,
    })),
  );
});

repoRoutes.post("/:repoFullName/connect", authenticate, async (c) => {
  const user = c.get("user");
  const repoFullName = c.req.param("repoFullName")?.replace("_", "/");

  //Register Webhook on Github
  const [owner, repo] = repoFullName?.split("/") || [];
  const webhookResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/hooks`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${user.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "web",
        active: true,
        events: ["pull_request"],
        config: {
          url: `${env.PUBLIC_API_URL}/api/webhooks/github`,
          content_type: "json",
          secret: env.GITHUB_WEBHOOK_SECRET!,
        },
      }),
    },
  );
  if (!webhookResponse.ok) {
    const error = await webhookResponse.json();
    throw new AppError(`Failed to create webhook: ${error.message}`, 502);
  }
  const webhook = await webhookResponse.json();
  await db.repository.upsert({
    where: { githubRepoId: String(webhook.id) },
    update: { isActive: true, webhookId: String(webhook.id) },
    create: {
      githubRepoId: String(webhook.id),
      ownerId: user.id,
      fullName: repoFullName!,
      name: repo!,
      webhookId: String(webhook.id),
    },
  });
  return c.json({ message: "Repository connected successfully" });
});
