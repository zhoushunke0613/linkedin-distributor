import { sql } from "@/lib/db";
import { loadToken } from "./token_store";
import type { PublicationKind } from "@/lib/publications";

const LIMITS: Record<string, number> = {
  "person|organic": 2,
  "organization|organic": 5,
};

export async function checkRateLimit(args: {
  authorUrn: string;
  kind: PublicationKind;
}): Promise<{ allowed: boolean; used: number; limit: number | null }> {
  const token = await loadToken(args.authorUrn);
  if (!token) return { allowed: true, used: 0, limit: null };

  const key = `${token.ownerType}|${args.kind}`;
  const limit = LIMITS[key];
  if (!limit) return { allowed: true, used: 0, limit: null };

  const rows = await sql`
    SELECT COUNT(*)::int AS n FROM linkedin_publication
    WHERE author_urn = ${args.authorUrn}
      AND kind = ${args.kind}
      AND status = 'published'
      AND published_at > NOW() - INTERVAL '24 hours'
  `;
  const used = Number(rows[0]?.n ?? 0);
  return { allowed: used < limit, used, limit };
}

export async function pushToNextWindow(args: {
  publicationId: string;
  authorUrn: string;
  kind: PublicationKind;
}): Promise<void> {
  const rows = await sql`
    SELECT MIN(published_at) AS earliest FROM linkedin_publication
    WHERE author_urn = ${args.authorUrn}
      AND kind = ${args.kind}
      AND status = 'published'
      AND published_at > NOW() - INTERVAL '24 hours'
  `;
  const earliestRaw = rows[0]?.earliest;
  const fallback = new Date(Date.now() + 30 * 60 * 1000);
  const basis = earliestRaw ? new Date(earliestRaw as string) : fallback;
  const jitterMs = Math.floor(Math.random() * 30 * 60 * 1000);
  const nextStart = new Date(basis.getTime() + 24 * 60 * 60 * 1000 + jitterMs);

  await sql`
    UPDATE linkedin_publication
    SET scheduled_window_start = ${nextStart.toISOString()},
        scheduled_window_end = GREATEST(
          scheduled_window_end,
          ${nextStart.toISOString()}::timestamptz + INTERVAL '1 hour'
        ),
        scheduled_at = NULL,
        error_message = 'rate_limited: rescheduled into next 24h window'
    WHERE id = ${args.publicationId}
  `;
}
