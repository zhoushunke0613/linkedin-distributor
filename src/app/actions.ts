"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { env } from "@/lib/env";
import { CreateDraftSchema, createDraft, deleteDraft } from "@/lib/drafts";
import { dispatchPublication } from "@/lib/linkedin/publisher/dispatch";
import {
  cancelPublication,
  schedulePublication,
  SchedulePublicationSchema,
} from "@/lib/publications";

export async function createDraftAction(formData: FormData): Promise<void> {
  const rawMedia = String(formData.get("media_urls") ?? "").trim();
  const mediaUrls = rawMedia
    ? rawMedia
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((url) => ({ url }))
    : [];

  const parsed = CreateDraftSchema.safeParse({
    text: String(formData.get("text") ?? ""),
    mediaUrls,
    note: formData.get("note") ? String(formData.get("note")) : undefined,
  });
  if (!parsed.success) {
    console.error("createDraftAction invalid input:", parsed.error.issues);
    return;
  }

  await createDraft(parsed.data);
  revalidatePath("/");
}

export async function deleteDraftAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteDraft(id);
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
