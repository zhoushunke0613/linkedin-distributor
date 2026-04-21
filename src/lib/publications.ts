import { z } from "zod";
import { sql } from "@/lib/db";

export const PublicationKindSchema = z.enum(["organic", "ads"]);
export type PublicationKind = z.infer<typeof PublicationKindSchema>;

export const PublicationStatusSchema = z.enum([
  "scheduled",
  "publishing",
  "published",
  "failed",
  "canceled",
]);
export type PublicationStatus = z.infer<typeof PublicationStatusSchema>;

export const SchedulePublicationSchema = z
  .object({
    draftId: z.string().uuid(),
    authorUrn: z.string().min(1),
    kind: PublicationKindSchema,
    windowStart: z.coerce.date(),
    windowEnd: z.coerce.date(),
    meta: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((v) => v.windowEnd.getTime() >= v.windowStart.getTime(), {
    message: "windowEnd must be >= windowStart",
    path: ["windowEnd"],
  });
export type SchedulePublicationInput = z.infer<typeof SchedulePublicationSchema>;

export type Publication = {
  id: string;
  draftId: string;
  authorUrn: string;
  kind: PublicationKind;
  status: PublicationStatus;
  windowStart: Date;
  windowEnd: Date;
  scheduledAt: Date | null;
  publishedAt: Date | null;
  platformUrn: string | null;
  retryCount: number;
  errorMessage: string | null;
  meta: Record<string, unknown> | null;
  createdAt: Date;
};

function rowToPublication(r: Record<string, unknown>): Publication {
  return {
    id: r.id as string,
    draftId: r.draft_id as string,
    authorUrn: r.author_urn as string,
    kind: r.kind as PublicationKind,
    status: r.status as PublicationStatus,
    windowStart: new Date(r.scheduled_window_start as string),
    windowEnd: new Date(r.scheduled_window_end as string),
    scheduledAt: r.scheduled_at ? new Date(r.scheduled_at as string) : null,
    publishedAt: r.published_at ? new Date(r.published_at as string) : null,
    platformUrn: (r.platform_urn as string | null) ?? null,
    retryCount: r.retry_count as number,
    errorMessage: (r.error_message as string | null) ?? null,
    meta: (r.meta as Record<string, unknown> | null) ?? null,
    createdAt: new Date(r.created_at as string),
  };
}

export async function schedulePublication(
  input: SchedulePublicationInput,
): Promise<Publication> {
  const rows = await sql`
    INSERT INTO linkedin_publication (
      draft_id, author_urn, kind,
      scheduled_window_start, scheduled_window_end,
      meta
    ) VALUES (
      ${input.draftId}, ${input.authorUrn}, ${input.kind},
      ${input.windowStart.toISOString()}, ${input.windowEnd.toISOString()},
      ${input.meta ? JSON.stringify(input.meta) : null}::jsonb
    )
    RETURNING *
  `;
  return rowToPublication(rows[0]);
}

export async function listPublications(limit = 100): Promise<Publication[]> {
  const rows = await sql`
    SELECT * FROM linkedin_publication
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return rows.map(rowToPublication);
}

export async function listPublicationsForDraft(
  draftId: string,
): Promise<Publication[]> {
  const rows = await sql`
    SELECT * FROM linkedin_publication
    WHERE draft_id = ${draftId}
    ORDER BY created_at DESC
  `;
  return rows.map(rowToPublication);
}

export async function getPublication(id: string): Promise<Publication | null> {
  const rows = await sql`
    SELECT * FROM linkedin_publication WHERE id = ${id} LIMIT 1
  `;
  return rows[0] ? rowToPublication(rows[0]) : null;
}

export async function cancelPublication(id: string): Promise<boolean> {
  const rows = await sql`
    UPDATE linkedin_publication
    SET status = 'canceled'
    WHERE id = ${id} AND status = 'scheduled'
    RETURNING id
  `;
  return rows.length > 0;
}
