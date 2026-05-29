import { Queue } from "bullmq";
import { getRedisConnectionOptions } from "../lib/redis";
import { logger } from "../lib/logger";

export const webhookQueue = new Queue("webhook-processing", {
  connection: getRedisConnectionOptions(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: { age: 86400 },
    removeOnFail: { count: 100 },
  },
});

webhookQueue.on("error", (error: Error) => {
  logger.error({ err: error }, "Queue error");
});
