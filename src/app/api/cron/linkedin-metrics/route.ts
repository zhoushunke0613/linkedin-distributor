import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { authorizeCron } from "@/lib/cron-auth";
import { fetchOrganicMetrics } from "@/lib/linkedin/analytics";
import { getFreshAccessToken } from "@/lib/linkedin/token_store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Candidate = {
  id: string;
  author_urn: string;
  platform_urn: string;
};

type CronOutcome =
  | { id: string; ok: true; likes: number; comments: number }
  | { id: string; ok: false; reason: string };

async function handle(req: Request) {
  const auth = authorizeCron(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  const rows = (await sql`
    SELECT id, author_urn, platform_urn
    FROM linkedin_publication
    WHERE status = 'published'
      AND kind = 'organic'
      AND platform_urn IS NOT NULL
      AND published_at > NOW() - INTERVAL '7 days'
      AND (last_metrics_at IS NULL OR last_metrics_at < NOW() - INTERVAL '20 hours')
    ORDER BY published_at DESC
    LIMIT 20
  `) as unknown as Candidate[];

  const outcomes: CronOutcome[] = [];
  const tokenCache = new Map<string, string>();

  for (const c of rows) {
    try {
      let token = tokenCache.get(c.author_urn);
      if (!token) {
        token = await getFreshAccessToken(c.author_urn);
        tokenCache.set(c.author_urn, token);
      }

      const metrics = await fetchOrganicMetrics({
        accessToken: token,
        platformUrn: c.platform_urn,
      });

      if (!metrics) {
        await sql`
          UPDATE linkedin_publication
          SET last_metrics_at = NOW(),
              error_message = 'post not found on LinkedIn (deleted?)'
          WHERE id = ${c.id}
        `;
        outcomes.push({ id: c.id, ok: false, reason: "post not found" });
        continue;
      }

      const patch = JSON.stringify({ metrics });
      await sql`
        UPDATE linkedin_publication
        SET meta = COALESCE(meta, '{}'::jsonb) || ${patch}::jsonb,
            last_metrics_at = NOW()
        WHERE id = ${c.id}
      `;
      outcomes.push({
        id: c.id,
        ok: true,
        likes: metrics.likes,
        comments: metrics.comments,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      outcomes.push({ id: c.id, ok: false, reason: reason.slice(0, 300) });
    }
  }

  return NextResponse.json({
    scanned: rows.length,
    outcomes,
  });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
