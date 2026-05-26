import { Worker, type Job } from "bullmq";
import { getRedisConnectionOptions } from "../lib/redis";
import { logger } from "../lib/logger";
import { processWebhookJob } from "../modules/reviews/review.service";

export function startWebhookWorker() {
  const worker = new Worker(
    "webhook-processing",
    async (job: Job) => {
      logger.info({ jobId: job.id }, "Processing webhook job");
      await processWebhookJob(job.data);
    },
    {
      connection: getRedisConnectionOptions(),
      concurrency: 3,
    },
  );

  worker.on("completed", (job) =>
    logger.info({ jobId: job.id }, "Job completed"),
  );
  worker.on("failed", (job, err) =>
    logger.error({ jobId: job?.id, error: err.message }, "Job failed"),
  );

  return worker;
}
