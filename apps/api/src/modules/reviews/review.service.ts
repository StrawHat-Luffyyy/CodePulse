import { db } from "@codepulse/db";
import { logger } from "../../lib/logger";

export async function processWebhookJob(data: {
  event: string;
  payload: any;
  deliveryId: string;
}) {
  const { payload } = data;
  const pr = payload.pull_request;
  const repo = payload.repository;

  if (!repo?.owner?.login) {
    logger.warn(
      { deliveryId: data.deliveryId, repoId: repo?.id },
      "Webhook payload missing repo.owner.login — skipping",
    );
    return;
  }
  const repoOwnerLogin = repo.owner.login;
  const owner = await db.user.findFirst({
    where: {
      username: repoOwnerLogin,
    },
  });
  if (!owner) {
    logger.warn(
      { repoOwner: repoOwnerLogin, repo: repo.full_name },
      "Repo owner not found in database — skipping review. User must sign up first.",
    );
    return;
  }

  const repository = await db.repository.upsert({
    where: {
      githubRepoId: String(repo.id),
    },
    update: {
      fullName: repo.full_name,
      name: repo.name,
    },
    create: {
      githubRepoId: String(repo.id),
      fullName: repo.full_name,
      name: repo.name,
      ownerId: owner.id,
    },
  });

  logger.info(
    { repoId: repository.id, fullName: repo.full_name },
    "Repository upserted",
  );

  const pullRequest = await db.pullRequest.upsert({
    where: {
      repositoryId_number: {
        repositoryId: repository.id,
        number: pr.number,
      },
    },
    update: {
      headSha: pr.head.sha,
      status: "PROCESSING",
    },
    create: {
      repositoryId: repository.id,
      githubPrId: pr.id,
      number: pr.number,
      title: pr.title,
      author: pr.user.login,
      headSha: pr.head.sha,
      status: "PROCESSING",
    },
  });
  logger.info(
    { prId: pullRequest.id, number: pr.number },
    "PR record created, beginning review",
  );
  // TODO: Fetch diff and run AI review
  // For now, simulataing processing
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await db.pullRequest.update({
    where: { id: pullRequest.id },
    data: { status: "COMPLETED" },
  });

  logger.info({ prId: pullRequest.id }, "Review completed (stub)");
}
