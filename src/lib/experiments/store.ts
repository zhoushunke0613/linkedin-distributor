import { z } from "zod";
import { sql } from "@/lib/db";
import { PostBriefSchema, type PostBrief } from "./brief";

export const PlatformSchema = z.enum([
  "linkedin",
  "xiaohongshu",
  "x",
  "google_ads",
]);
export type Platform = z.infer<typeof PlatformSchema>;

export const ExperimentStatusSchema = z.enum([
  "draft",
  "generating",
  "ready",
  "failed",
  "archived",
]);
export type ExperimentStatus = z.infer<typeof ExperimentStatusSchema>;

export const VariantKindSchema = z.enum(["headline", "body", "full"]);
export type VariantKind = z.infer<typeof VariantKindSchema>;

export const VariantStatusSchema = z.enum([
  "draft",
  "humanized",
  "selected",
  "archived",
]);
export type VariantStatus = z.infer<typeof VariantStatusSchema>;

export const CreateExperimentSchema = z.object({
  platform: PlatformSchema.default("linkedin"),
  topic: z.string().min(3).max(500),
  brief: z.string().max(5000).optional(),
  constraints: z.record(z.string(), z.unknown()).optional(),
  headlineN: z.number().int().min(1).max(10).default(3),
  bodyN: z.number().int().min(1).max(10).default(3),
  postBrief: PostBriefSchema.optional(),
});
export type CreateExperimentInput = z.infer<typeof CreateExperimentSchema>;

export type Experiment = {
  id: string;
  platform: Platform;
  topic: string;
  brief: string | null;
  constraints: Record<string, unknown> | null;
  headlineN: number;
  bodyN: number;
  status: ExperimentStatus;
  generatorMeta: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Variant = {
  id: string;
  experimentId: string;
  kind: VariantKind;
  text: string;
  meta: Record<string, unknown> | null;
  status: VariantStatus;
  postUrl: string | null;
  draftId: string | null;
  createdAt: Date;
};

function rowToExperiment(r: Record<string, unknown>): Experiment {
  return {
    id: r.id as string,
    platform: r.platform as Platform,
    topic: r.topic as string,
    brief: (r.brief as string | null) ?? null,
    constraints:
      (r.constraints as Record<string, unknown> | null) ?? null,
    headlineN: r.headline_n as number,
    bodyN: r.body_n as number,
    status: r.status as ExperimentStatus,
    generatorMeta:
      (r.generator_meta as Record<string, unknown> | null) ?? null,
    createdAt: new Date(r.created_at as string),
    updatedAt: new Date(r.updated_at as string),
  };
}

function rowToVariant(r: Record<string, unknown>): Variant {
  return {
    id: r.id as string,
    experimentId: r.experiment_id as string,
    kind: r.kind as VariantKind,
    text: r.text as string,
    meta: (r.meta as Record<string, unknown> | null) ?? null,
    status: r.status as VariantStatus,
    postUrl: (r.post_url as string | null) ?? null,
    draftId: (r.draft_id as string | null) ?? null,
    createdAt: new Date(r.created_at as string),
  };
}

export async function createExperiment(
  input: CreateExperimentInput,
): Promise<Experiment> {
  // Stash the structured post-brief inside the constraints JSONB column
  // under a reserved "post_brief" key, so we can evolve the field set
  // without a DB migration.
  const mergedConstraints: Record<string, unknown> = {
    ...(input.constraints ?? {}),
  };
  if (input.postBrief && Object.keys(input.postBrief).length > 0) {
    mergedConstraints.post_brief = input.postBrief;
  }
  const constraintsValue =
    Object.keys(mergedConstraints).length > 0
      ? JSON.stringify(mergedConstraints)
      : null;

  const rows = await sql`
    INSERT INTO experiment (
      platform, topic, brief, constraints, headline_n, body_n, status
    ) VALUES (
      ${input.platform},
      ${input.topic},
      ${input.brief ?? null},
      ${constraintsValue}::jsonb,
      ${input.headlineN},
      ${input.bodyN},
      'draft'
    )
    RETURNING *
  `;
  return rowToExperiment(rows[0]);
}

export function extractPostBrief(
  constraints: Record<string, unknown> | null,
): PostBrief | null {
  if (!constraints) return null;
  const pb = constraints.post_brief;
  if (!pb || typeof pb !== "object") return null;
  const parsed = PostBriefSchema.safeParse(pb);
  return parsed.success ? parsed.data : null;
}

export async function setExperimentStatus(
  id: string,
  status: ExperimentStatus,
  generatorMeta?: Record<string, unknown>,
): Promise<void> {
  if (generatorMeta) {
    const patch = JSON.stringify(generatorMeta);
    await sql`
      UPDATE experiment
      SET status = ${status},
          generator_meta = COALESCE(generator_meta, '{}'::jsonb) || ${patch}::jsonb,
          updated_at = NOW()
      WHERE id = ${id}
    `;
  } else {
    await sql`
      UPDATE experiment
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${id}
    `;
  }
}

export async function listExperiments(limit = 50): Promise<Experiment[]> {
  const rows = await sql`
    SELECT * FROM experiment
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return rows.map(rowToExperiment);
}

export async function getExperiment(id: string): Promise<Experiment | null> {
  const rows = await sql`SELECT * FROM experiment WHERE id = ${id} LIMIT 1`;
  return rows[0] ? rowToExperiment(rows[0]) : null;
}

export async function deleteExperiment(id: string): Promise<void> {
  await sql`DELETE FROM experiment WHERE id = ${id}`;
}

export async function insertVariants(
  experimentId: string,
  entries: Array<{
    kind: VariantKind;
    text: string;
    meta?: Record<string, unknown>;
  }>,
): Promise<Variant[]> {
  const inserted: Variant[] = [];
  for (const e of entries) {
    const rows = await sql`
      INSERT INTO variant (experiment_id, kind, text, meta)
      VALUES (
        ${experimentId},
        ${e.kind},
        ${e.text},
        ${e.meta ? JSON.stringify(e.meta) : null}::jsonb
      )
      RETURNING *
    `;
    inserted.push(rowToVariant(rows[0]));
  }
  return inserted;
}

export async function listVariants(experimentId: string): Promise<Variant[]> {
  const rows = await sql`
    SELECT * FROM variant
    WHERE experiment_id = ${experimentId}
    ORDER BY kind, created_at ASC
  `;
  return rows.map(rowToVariant);
}

export async function linkVariantToDraft(
  variantId: string,
  draftId: string,
): Promise<void> {
  await sql`
    UPDATE variant
    SET draft_id = ${draftId}, status = 'selected'
    WHERE id = ${variantId}
  `;
}
