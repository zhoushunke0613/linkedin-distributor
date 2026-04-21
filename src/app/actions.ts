"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { env } from "@/lib/env";
import { sql } from "@/lib/db";
import { isBlobEnabled, uploadImageFile } from "@/lib/blob";
import { CreateDraftSchema, createDraft, deleteDraft } from "@/lib/drafts";
import { dispatchPublication } from "@/lib/linkedin/publisher/dispatch";
import {
  cancelPublication,
  schedulePublication,
  SchedulePublicationSchema,
} from "@/lib/publications";

export async function createDraftAction(formData: FormData): Promise<void> {
  const rawMedia = String(formData.get("media_urls") ?? "").trim();
  const urlMedia = rawMedia
    ? rawMedia
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((url) => ({ url }))
    : [];

  const uploadedMedia: { url: string }[] = [];
  if (isBlobEnabled()) {
    const files = formData.getAll("image_files");
    for (const entry of files) {
      if (entry instanceof File && entry.size > 0) {
        try {
          const { url } = await uploadImageFile(entry);
          uploadedMedia.push({ url });
        } catch (err) {
          console.error(
            "createDraftAction upload failed:",
            entry.name,
            err instanceof Error ? err.message : err,
          );
          return;
        }
      }
    }
  }

  const parsed = CreateDraftSchema.safeParse({
    text: String(formData.get("text") ?? ""),
    mediaUrls: [...urlMedia, ...uploadedMedia],
    note: formData.get("note") ? String(formData.get("note")) : undefined,
  });
  if (!parsed.success) {
    console.error("createDraftAction invalid input:", parsed.error.issues);
    return;
  }

  const draft = await createDraft(parsed.data);

  // Auto-publish: if the user checked the box, schedule a "publish now"
  // publication right after the draft is saved.
  if (String(formData.get("auto_publish") ?? "") === "on") {
    const authorUrn = String(formData.get("auto_author_urn") ?? "").trim();
    const kindRaw = String(formData.get("auto_kind") ?? "organic");
    const kind: "organic" | "ads" = kindRaw === "ads" ? "ads" : "organic";
    if (authorUrn) {
      try {
        const now = new Date();
        await schedulePublication({
          draftId: draft.id,
          authorUrn,
          kind,
          windowStart: now,
          windowEnd: now,
        });
      } catch (err) {
        console.error(
          "createDraftAction auto-publish schedule failed:",
          err instanceof Error ? err.message : err,
        );
      }
    } else {
      console.error(
        "createDraftAction auto-publish skipped: no authorUrn selected",
      );
    }
  }

  revalidatePath("/");
}

export async function deleteDraftAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  try {
    await deleteDraft(id);
  } catch (err) {
    console.error(
      "deleteDraftAction failed:",
      err instanceof Error ? err.message : err,
    );
  }
  revalidatePath("/");
}

const ScheduleFormSchema = z
  .object({
    draftId: z.string().uuid(),
    authorUrn: z.string().min(1),
    kind: z.enum(["organic", "ads"]),
    mode: z.enum(["now", "window"]),
    windowStart: z.string().optional(),
    windowEnd: z.string().optional(),
  })
  .transform((v) => {
    if (v.mode === "now") {
      const now = new Date();
      return {
        draftId: v.draftId,
        authorUrn: v.authorUrn,
        kind: v.kind,
        windowStart: now,
        windowEnd: now,
      };
    }
    return {
      draftId: v.draftId,
      authorUrn: v.authorUrn,
      kind: v.kind,
      windowStart: v.windowStart ? new Date(v.windowStart) : new Date(),
      windowEnd: v.windowEnd ? new Date(v.windowEnd) : new Date(),
    };
  });

export async function schedulePublicationAction(
  formData: FormData,
): Promise<void> {
  const parsedForm = ScheduleFormSchema.safeParse({
    draftId: formData.get("draftId"),
    authorUrn: formData.get("authorUrn"),
    kind: formData.get("kind"),
    mode: formData.get("mode"),
    windowStart: formData.get("windowStart") || undefined,
    windowEnd: formData.get("windowEnd") || undefined,
  });
  if (!parsedForm.success) {
    console.error(
      "schedulePublicationAction invalid form:",
      parsedForm.error.issues,
    );
    return;
  }

  const parsed = SchedulePublicationSchema.safeParse(parsedForm.data);
  if (!parsed.success) {
    console.error(
      "schedulePublicationAction invalid input:",
      parsed.error.issues,
    );
    return;
  }

  await schedulePublication(parsed.data);
  revalidatePath("/");
}

export async function cancelPublicationAction(
  formData: FormData,
): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await cancelPublication(id);
  revalidatePath("/");
}

const UpdateMetricsSchema = z.object({
  id: z.string().uuid(),
  likes: z.coerce.number().int().min(0).max(1_000_000),
  comments: z.coerce.number().int().min(0).max(1_000_000),
});

export async function updateMetricsAction(
  formData: FormData,
): Promise<void> {
  const parsed = UpdateMetricsSchema.safeParse({
    id: formData.get("id"),
    likes: formData.get("likes"),
    comments: formData.get("comments"),
  });
  if (!parsed.success) {
    console.error("updateMetricsAction invalid input:", parsed.error.issues);
    return;
  }
  const metricsPatch = JSON.stringify({
    metrics: {
      likes: parsed.data.likes,
      comments: parsed.data.comments,
      fetchedAt: new Date().toISOString(),
      source: "manual",
    },
  });
  await sql`
    UPDATE linkedin_publication
    SET meta = COALESCE(meta, '{}'::jsonb) || ${metricsPatch}::jsonb,
        last_metrics_at = NOW()
    WHERE id = ${parsed.data.id}
  `;
  revalidatePath("/");
}

export async function publishPublicationAction(
  formData: FormData,
): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  if (!env.LINKEDIN_PUBLISH_ENABLED) {
    console.error(
      "publishPublicationAction blocked: LINKEDIN_PUBLISH_ENABLED=false",
    );
    return;
  }
  const outcome = await dispatchPublication(id);
  if (!outcome.ok) {
    console.error("publish failed:", outcome.errorMessage);
  }
  revalidatePath("/");
}
