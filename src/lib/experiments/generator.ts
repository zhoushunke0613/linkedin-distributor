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
  critiqueBodies,
  critiqueHeadlines,
  type CritiquedVariant,
  type DraftBodyVariant,
  type DraftHeadlineVariant,
} from "./critique";
import {
  selectRelevantSkills,
  skillSummary,
  type SkillSelection,
} from "./skills";
import {
  extractPostBrief,
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
  skills: SkillSelection,
): Promise<DraftHeadlineVariant[]> {
  const learnings = await computeLearnings().catch(() => null);
  const brief = extractPostBrief(experiment.constraints);
  const system = buildHeadlineSystemPrompt({
    platform: experiment.platform,
    brief,
    learnings,
    planSkills: skills.plan,
    draftSkills: skills.draft,
  });
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
  return result.variants
    .slice(0, experiment.headlineN)
    .map((v) => ({ text: v.text, hookType: v.hookType }));
}

async function generateBodies(
  experiment: Experiment,
  skills: SkillSelection,
): Promise<DraftBodyVariant[]> {
  const learnings = await computeLearnings().catch(() => null);
  const brief = extractPostBrief(experiment.constraints);
  const system = buildBodySystemPrompt({
    platform: experiment.platform,
    brief,
    learnings,
    planSkills: skills.plan,
    draftSkills: skills.draft,
  });
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
  return result.variants
    .slice(0, experiment.bodyN)
    .map((v) => ({ text: v.text, ctaKind: v.ctaKind }));
}

function toPersistedHeadlineVariants(
  critiqued: CritiquedVariant<DraftHeadlineVariant>[],
  skills: SkillSelection,
  provider: string,
  critiqueRan: boolean,
) {
  const appliedSkillNames = skills.all.map((s) => s.skill.name);
  return critiqued.map((c) => ({
    kind: "headline" as const,
    text: c.revised.text,
    meta: {
      hookType: c.revised.hookType,
      charCount: c.revised.text.length,
      generator: provider,
      skillsApplied: appliedSkillNames,
      critiqued: critiqueRan,
      critique_changed: c.changed,
      critique_note: c.critiqueNote,
      text_before_critique: c.changed ? c.original.text : undefined,
    },
  }));
}

function toPersistedBodyVariants(
  critiqued: CritiquedVariant<DraftBodyVariant>[],
  skills: SkillSelection,
  provider: string,
  critiqueRan: boolean,
) {
  const appliedSkillNames = skills.all.map((s) => s.skill.name);
  return critiqued.map((c) => ({
    kind: "body" as const,
    text: c.revised.text,
    meta: {
      ctaKind: c.revised.ctaKind,
      charCount: c.revised.text.length,
      generator: provider,
      skillsApplied: appliedSkillNames,
      critiqued: critiqueRan,
      critique_changed: c.changed,
      critique_note: c.critiqueNote,
      text_before_critique: c.changed ? c.original.text : undefined,
    },
  }));
}

export type RunOutcome =
  | {
      ok: true;
      experimentId: string;
      headlineCount: number;
      bodyCount: number;
      critiqueRan: boolean;
    }
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
    const brief = extractPostBrief(experiment.constraints);

    // Phase 1 — draft
    const [draftHeadlines, draftBodies] = await Promise.all([
      generateHeadlines(experiment, skills),
      generateBodies(experiment, skills),
    ]);

    // Phase 2 — critique pass (only if checker skills fired)
    const critiqueRan = skills.critique.length > 0;
    const [critiquedHeadlines, critiquedBodies] = await Promise.all([
      critiqueHeadlines({
        platform: experiment.platform,
        brief,
        checkerSkills: skills.critique,
        variants: draftHeadlines,
      }),
      critiqueBodies({
        platform: experiment.platform,
        brief,
        checkerSkills: skills.critique,
        variants: draftBodies,
      }),
    ]);

    const provider = providerLabel();
    const persistedHeadlines = toPersistedHeadlineVariants(
      critiquedHeadlines,
      skills,
      provider,
      critiqueRan,
    );
    const persistedBodies = toPersistedBodyVariants(
      critiquedBodies,
      skills,
      provider,
      critiqueRan,
    );

    await insertVariants(experimentId, persistedHeadlines);
    await insertVariants(experimentId, persistedBodies);

    await setExperimentStatus(experimentId, "ready", {
      ranAt: new Date().toISOString(),
      provider,
      headlineCount: persistedHeadlines.length,
      bodyCount: persistedBodies.length,
      critiqueRan,
      skillsUsed: {
        plan: skills.plan.map(skillSummary),
        draft: skills.draft.map(skillSummary),
        critique: skills.critique.map(skillSummary),
      },
    });

    return {
      ok: true,
      experimentId,
      headlineCount: persistedHeadlines.length,
      bodyCount: persistedBodies.length,
      critiqueRan,
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
