import { generateObject, type LanguageModel } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { z } from "zod";
import { env } from "@/lib/env";

/**
 * Resolve the configured provider into an AI SDK LanguageModel.
 *
 *   gateway   → pass model id as-is; `ai` routes to the Vercel AI Gateway
 *               using OIDC (prod) or AI_GATEWAY_API_KEY (local).
 *   openai    → `@ai-sdk/openai` with OPENAI_API_KEY.
 *   anthropic → `@ai-sdk/anthropic` with ANTHROPIC_API_KEY.
 */
function resolveModel(): LanguageModel | string {
  const provider = env.GENERATOR_PROVIDER;
  const modelId = env.GENERATOR_MODEL;

  if (provider === "gateway") {
    // Vercel AI Gateway accepts "provider/model" strings directly.
    return modelId;
  }
  if (provider === "openai") {
    if (!env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is required when GENERATOR_PROVIDER=openai");
    }
    const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
    return openai(modelId);
  }
  if (provider === "anthropic") {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error(
        "ANTHROPIC_API_KEY is required when GENERATOR_PROVIDER=anthropic",
      );
    }
    const anthropic = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY });
    return anthropic(modelId);
  }
  throw new Error(`unknown GENERATOR_PROVIDER: ${provider as string}`);
}

export async function generateStructured<T>(args: {
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
  temperature?: number;
}): Promise<T> {
  const model = resolveModel();
  const { object } = await generateObject({
    model,
    schema: args.schema,
    system: args.system,
    prompt: args.prompt,
    temperature: args.temperature ?? 0.8,
  });
  return object;
}

export function providerLabel(): string {
  const { GENERATOR_PROVIDER: p, GENERATOR_MODEL: m } = env;
  return `${p}:${m}`;
}
