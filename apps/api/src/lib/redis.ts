import { Redis } from "ioredis";
import { env } from "@codepulse/config";

export function getRedisConnectionOptions() {
  const url = new URL(env.REDIS_URL);
  return {
    host: url.hostname,
    port: parseInt(url.port || "6379"),
    password: url.password || undefined,
    maxRetriesPerRequest: null as null, // required by BullMQ
    enableReadyCheck: false, // required by BullMQ
  };
}

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on("error", (err) => console.error("Redis client error:", err));
