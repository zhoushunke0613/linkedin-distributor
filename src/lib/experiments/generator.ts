import { z } from "zod";
import { computeLearnings } from "@/lib/learnings";
import { generateStructured, providerLabel } from "./provider";
import {
  buildBodySystemPrompt,
  buildGenerationPrompt,
  buildHeadlineSystemPrompt,
  HOOK_TYPES,
} from "./prompts";
import {
  getExperiment,
  insertVariants,
  setExperimentStatus,
  type Experiment,
} from "./store";

const HeadlineVariantSchema = z.object({
  text: z.string().min(5).max(500),
  hookType: z.enum(HOOK_TYPES),
});

const HeadlineBatchSchema = z.object({
  variants: z.array(HeadlineVariantSchema),
});

const BodyVariantSchema = z.object({
  text: z.string().min(50).max(3000),
  ctaKind: z.enum(["question", "invitation", "link", "reflection"]),
});

const BodyBatchSchema = z.object({
  variants: z.array(BodyVariantSchema),
});

async function generateHeadlines(experiment: Experiment) {
  const learnings = await computeLearnings().catch(() => null);
  const system = buildHeadlineSystemPrompt(experiment.platform, learnings);
  const prompt = buildGenerationPrompt({
    topic: experiment.topic,
    brief: experiment.brief,
    constraints: experiment.constraints,
    n: experiment.headlineN,
    kind: "headline",
  });
  const result = await generateStructured({
    schema: HeadlineBatchSchema,
    system,
    prompt,
  });
  return result.variants.slice(0, experiment.headlineN).map((v) => ({
    kind: "headline" as const,
    text: v.text,
    meta: {
      hookType: v.hookType,
      charCount: v.text.length,
      generator: providerLabel(),
    },
  }));
}

async function generateBodies(experiment: Experiment) {
  const learnings = await computeLearnings().catch(() => null);
  const system = buildBodySystemPrompt(experiment.platform, learnings);
  const prompt = buildGenerationPrompt({
    topic: experiment.topic,
    brief: experiment.brief,
    constraints: experiment.constraints,
    n: experiment.bodyN,
    kind: "body",
  });
  const result = await generateStructured({
    schema: BodyBatchSchema,
    system,
    prompt,
  });
  return result.variants.slice(0, experiment.bodyN).map((v) => ({
    kind: "body" as const,
    text: v.text,
    meta: {
      ctaKind: v.ctaKind,
      charCount: v.text.length,
      generator: providerLabel(),
    },
  }));
}

export type RunOutcome =
  | { ok: true; experimentId: string; headlineCount: number; bodyCount: number }
  | { ok: false; experimentId: string; error: string };

export async function runGeneration(
  experimentId: string,
): Promise<RunOutcome> {
  const experiment = await getExperiment(experimentId);
  if (!experiment) {
    return {
      ok: false,
      experimentId,
      error: "experiment not found",
    };
  }

  await setExperimentStatus(experimentId, "generating");

  try {
    const [headlines, bodies] = await Promise.all([
      generateHeadlines(experiment),
      generateBodies(experiment),
    ]);
    await insertVariants(experimentId, headlines);
    await insertVariants(experimentId, bodies);
    await setExperimentStatus(experimentId, "ready", {
      ranAt: new Date().toISOString(),
      provider: providerLabel(),
      headlineCount: headlines.length,
      bodyCount: bodies.length,
    });
    return {
      ok: true,
      experimentId,
      headlineCount: headlines.length,
      bodyCount: bodies.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await setExperimentStatus(experimentId, "failed", {
      lastError: message,
      failedAt: new Date().toISOString(),
    });
    return {
      ok: false,
      experimentId,
      error: message,
    };
  }
}
