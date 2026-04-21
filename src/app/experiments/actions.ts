"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createDraft } from "@/lib/drafts";
import { runGeneration } from "@/lib/experiments/generator";
import {
  createExperiment,
  CreateExperimentSchema,
  deleteExperiment,
  getExperiment,
  linkVariantToDraft,
  listVariants,
  PlatformSchema,
} from "@/lib/experiments/store";

export async function createExperimentAction(
  formData: FormData,
): Promise<void> {
  const parsed = CreateExperimentSchema.safeParse({
    platform: String(formData.get("platform") ?? "linkedin"),
    topic: String(formData.get("topic") ?? ""),
    brief: formData.get("brief") ? String(formData.get("brief")) : undefined,
    headlineN: Number(formData.get("headline_n") ?? 3),
    bodyN: Number(formData.get("body_n") ?? 3),
  });
  if (!parsed.success) {
    console.error("createExperimentAction invalid:", parsed.error.issues);
    return;
  }
  const experiment = await createExperiment(parsed.data);
  revalidatePath("/experiments");
  redirect(`/experiments/${experiment.id}`);
}

export async function runGenerationAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const outcome = await runGeneration(id);
  if (!outcome.ok) {
    console.error("runGeneration failed:", outcome.error);
  }
  revalidatePath(`/experiments/${id}`);
  revalidatePath("/experiments");
}

export async function deleteExperimentAction(
  formData: FormData,
): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteExperiment(id);
  revalidatePath("/experiments");
  redirect("/experiments");
}

const CreateDraftFromPairSchema = z.object({
  experimentId: z.string().uuid(),
  headlineId: z.string().uuid(),
  bodyId: z.string().uuid(),
});

export async function createDraftFromPairAction(
  formData: FormData,
): Promise<void> {
  const parsed = CreateDraftFromPairSchema.safeParse({
    experimentId: formData.get("experimentId"),
    headlineId: formData.get("headlineId"),
    bodyId: formData.get("bodyId"),
  });
  if (!parsed.success) {
    console.error("createDraftFromPair invalid:", parsed.error.issues);
    return;
  }

  const [experiment, variants] = await Promise.all([
    getExperiment(parsed.data.experimentId),
    listVariants(parsed.data.experimentId),
  ]);
  if (!experiment) return;

  const headline = variants.find(
    (v) => v.id === parsed.data.headlineId && v.kind === "headline",
  );
  const body = variants.find(
    (v) => v.id === parsed.data.bodyId && v.kind === "body",
  );
  if (!headline || !body) {
    console.error("createDraftFromPair: variants not found");
    return;
  }

  const combinedText = `${headline.text.trim()}\n\n${body.text.trim()}`;
  const platform = PlatformSchema.parse(experiment.platform);

  const draft = await createDraft({
    text: combinedText,
    mediaUrls: [],
    source: `experiment:${platform}`,
    note: `experiment ${experiment.id}; headline ${headline.id} + body ${body.id}`,
  });

  await Promise.all([
    linkVariantToDraft(headline.id, draft.id),
    linkVariantToDraft(body.id, draft.id),
  ]);

  revalidatePath(`/experiments/${experiment.id}`);
  revalidatePath("/");
  redirect(`/?from=experiment-${experiment.id}`);
}
