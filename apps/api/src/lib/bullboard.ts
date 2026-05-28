import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { HonoAdapter } from "@bull-board/hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { webhookQueue } from "../queues/webhook.queue";

export function createBullBoardAdapter() {
  const serverAdapter = new HonoAdapter(serveStatic);

  createBullBoard({
    queues: [new BullMQAdapter(webhookQueue)],
    serverAdapter,
    options: {
      uiConfig: {
        boardTitle: "CodePulse Queues",
      },
    },
  });
  serverAdapter.setBasePath("/admin/queues");
  return serverAdapter;
}
