import { z } from "zod";
import { computeLearnings } from "@/lib/learnings";
import { generateStructured, providerLabel } from "./provider";
import {
  buildBodySystemPrompt,
  buildGenerationPrompt,
  buildHeadlineSystemPrompt,
  HOOK_TYPES,
} from "./prompts";
import { selectRelevantSkills, type ScoredSkill } from "./skills";
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

async function generateHeadlines(
  experiment: Experiment,
  skills: ScoredSkill[],
) {
  const learnings = await computeLearnings().catch(() => null);
  const system = buildHeadlineSystemPrompt(
    experiment.platform,
    learnings,
    skills,
  );
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
      skillsUsed: skills.map((s) => s.skill.name),
    },
  }));
}

async function generateBodies(
  experiment: Experiment,
  skills: ScoredSkill[],
) {
  const learnings = await computeLearnings().catch(() => null);
  const system = buildBodySystemPrompt(
    experiment.platform,
    learnings,
    skills,
  );
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
      skillsUsed: skills.map((s) => s.skill.name),
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
    const skills = selectRelevantSkills({
      topic: experiment.topic,
      brief: experiment.brief,
      platform: experiment.platform,
    });

    const [headlines, bodies] = await Promise.all([
      generateHeadlines(experiment, skills),
      generateBodies(experiment, skills),
    ]);
    await insertVariants(experimentId, headlines);
    await insertVariants(experimentId, bodies);
    await setExperimentStatus(experimentId, "ready", {
      ranAt: new Date().toISOString(),
      provider: providerLabel(),
      headlineCount: headlines.length,
      bodyCount: bodies.length,
      skillsUsed: skills.map((s) => ({
        name: s.skill.name,
        score: Number(s.score.toFixed(2)),
        topicMatches: s.topicMatches,
      })),
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
