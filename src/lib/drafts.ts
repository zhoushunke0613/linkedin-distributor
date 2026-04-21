import { z } from "zod";
import { sql } from "@/lib/db";

export const MediaRefSchema = z.object({
  url: z.string().url(),
  alt: z.string().optional(),
});
export type MediaRef = z.infer<typeof MediaRefSchema>;

export const CreateDraftSchema = z.object({
  text: z.string().min(1).max(3000),
  mediaUrls: z.array(MediaRefSchema).max(20).default([]),
  source: z.string().default("manual"),
  note: z.string().optional(),
});
export type CreateDraftInput = z.infer<typeof CreateDraftSchema>;

export type Draft = {
  id: string;
  text: string;
  mediaUrls: MediaRef[];
  source: string;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function rowToDraft(r: Record<string, unknown>): Draft {
  return {
    id: r.id as string,
    text: r.text as string,
    mediaUrls: (r.media_urls as MediaRef[]) ?? [],
    source: r.source as string,
    note: (r.note as string | null) ?? null,
    createdAt: new Date(r.created_at as string),
    updatedAt: new Date(r.updated_at as string),
  };
}

export async function createDraft(input: CreateDraftInput): Promise<Draft> {
  const rows = await sql`
    INSERT INTO post_draft (text, media_urls, source, note)
    VALUES (
      ${input.text},
      ${JSON.stringify(input.mediaUrls)}::jsonb,
      ${input.source},
      ${input.note ?? null}
    )
    RETURNING *
  `;
  return rowToDraft(rows[0]);
}

export async function listDrafts(limit = 50): Promise<Draft[]> {
  const rows = await sql`
    SELECT * FROM post_draft ORDER BY created_at DESC LIMIT ${limit}
  `;
  return rows.map(rowToDraft);
}

export async function getDraft(id: string): Promise<Draft | null> {
  const rows = await sql`SELECT * FROM post_draft WHERE id = ${id} LIMIT 1`;
  return rows[0] ? rowToDraft(rows[0]) : null;
}

export async function deleteDraft(id: string): Promise<void> {
  await sql`DELETE FROM linkedin_publication WHERE draft_id = ${id}`;
  await sql`DELETE FROM post_draft WHERE id = ${id}`;
}
