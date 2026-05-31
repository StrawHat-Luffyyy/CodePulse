import OpenAI from "openai";
import { env } from "@codepulse/config";
import { logger } from "../lib/logger";

export const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

//Verify connection on startup
export async function verifyOpenAIConnection(): Promise<void> {
  try {
    await openai.models.list();
    logger.info("OpenAI connection verified");
  } catch (error) {
    logger.error(
      { err: error },
      "OpenAI connection failed — check your API key",
    );
    process.exit(1);
  }
}
