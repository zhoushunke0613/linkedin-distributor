import { sql } from "@/lib/db";
import { dispatchPublication } from "./publisher/dispatch";
import { checkRateLimit, pushToNextWindow } from "./rate_limit";
import type { Publication, PublicationKind } from "@/lib/publications";

const MAX_PLAN_ATTEMPTS = 10;
const MINUTE_CLASH_WINDOW = 7;
const MIN_JITTER_MS = 60 * 1000;
const MAX_WINDOW_EXTENSION_MS = 60 * 60 * 1000;

type PubRow = {
  id: string;
  draft_id: string;
  author_urn: string;
  kind: PublicationKind;
  status: string;
  scheduled_window_start: string;
  scheduled_window_end: string;
  scheduled_at: string | null;
  published_at: string | null;
  platform_urn: string | null;
  retry_count: number;
  error_message: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
};

function rowToPublication(r: PubRow): Publication {
  return {
    id: r.id,
    draftId: r.draft_id,
    authorUrn: r.author_urn,
    kind: r.kind,
    status: r.status as Publication["status"],
    windowStart: new Date(r.scheduled_window_start),
    windowEnd: new Date(r.scheduled_window_end),
    scheduledAt: r.scheduled_at ? new Date(r.scheduled_at) : null,
    publishedAt: r.published_at ? new Date(r.published_at) : null,
    platformUrn: r.platform_urn,
    retryCount: r.retry_count,
    errorMessage: r.error_message,
    meta: r.meta,
    createdAt: new Date(r.created_at),
  };
}

async function recentMinutesOfHour(authorUrn: string): Promise<number[]> {
  const rows = await sql`
    SELECT EXTRACT(MINUTE FROM published_at)::int AS m
    FROM linkedin_publication
    WHERE author_urn = ${authorUrn}
      AND status = 'published'
      AND published_at > NOW() - INTERVAL '7 days'
  `;
  return rows.map((r) => Number((r as { m: number }).m));
}

function clashesWithRecent(candidateMinute: number, recent: number[]): boolean {
  for (const m of recent) {
    const diff = Math.abs(m - candidateMinute);
    const wrapDiff = Math.min(diff, 60 - diff);
    if (wrapDiff <= MINUTE_CLASH_WINDOW) return true;
  }
  return false;
}

export async function planScheduledAt(pub: Publication): Promise<Date> {
  const now = Date.now();
  const windowStartMs = Math.max(pub.windowStart.getTime(), now);
  const providedEndMs = pub.windowEnd.getTime();
  const maxEndMs = now + MAX_WINDOW_EXTENSION_MS;

  // If the stored window is a single instant ("publish now"), give ourselves
  // at least MIN_JITTER_MS of range and cap at maxEndMs.
  const windowEndMs = Math.min(
    Math.max(providedEndMs, windowStartMs + MIN_JITTER_MS),
    maxEndMs,
  );

  const recent = await recentMinutesOfHour(pub.authorUrn);

  let candidateMs = windowStartMs;
  for (let attempt = 0; attempt < MAX_PLAN_ATTEMPTS; attempt++) {
    const range = Math.max(windowEndMs - windowStartMs, MIN_JITTER_MS);
    candidateMs = windowStartMs + Math.floor(Math.random() * range);
    const candidateDate = new Date(candidateMs);
    candidateDate.setUTCSeconds(0, 0);
    const minute = candidateDate.getUTCMinutes();
    if (minute % 15 === 0) continue;
    if (clashesWithRecent(minute, recent)) continue;
    return candidateDate;
  }

  const fallback = new Date(candidateMs);
  fallback.setUTCSeconds(0, 0);
  return fallback;
}

async function setScheduledAt(
  publicationId: string,
  scheduledAt: Date,
): Promise<void> {
  await sql`
    UPDATE linkedin_publication
    SET scheduled_at = ${scheduledAt.toISOString()}
    WHERE id = ${publicationId}
  `;
}

export type TickOutcome =
  | { id: string; action: "planned"; scheduledAt: string }
  | { id: string; action: "waiting"; scheduledAt: string }
  | { id: string; action: "rate_limited"; used: number; limit: number }
  | { id: string; action: "dispatched"; ok: boolean; errorMessage?: string };

export async function processPublicationTick(
  pub: Publication,
): Promise<TickOutcome> {
  if (pub.status !== "scheduled") {
    return {
      id: pub.id,
      action: "waiting",
      scheduledAt: pub.scheduledAt?.toISOString() ?? "",
    };
  }

  if (!pub.scheduledAt) {
    const planned = await planScheduledAt(pub);
    await setScheduledAt(pub.id, planned);
    if (planned.getTime() > Date.now()) {
      return {
        id: pub.id,
        action: "planned",
        scheduledAt: planned.toISOString(),
      };
    }
    pub.scheduledAt = planned;
  }

  if (pub.scheduledAt.getTime() > Date.now()) {
    return {
      id: pub.id,
      action: "waiting",
      scheduledAt: pub.scheduledAt.toISOString(),
    };
  }

  const limit = await checkRateLimit({
    authorUrn: pub.authorUrn,
    kind: pub.kind,
  });
  if (!limit.allowed && limit.limit !== null) {
    await pushToNextWindow({
      publicationId: pub.id,
      authorUrn: pub.authorUrn,
      kind: pub.kind,
    });
    return {
      id: pub.id,
      action: "rate_limited",
      used: limit.used,
      limit: limit.limit,
    };
  }

  const outcome = await dispatchPublication(pub.id);
  return {
    id: pub.id,
    action: "dispatched",
    ok: outcome.ok,
    errorMessage: outcome.ok ? undefined : outcome.errorMessage,
  };
}

export async function findDuePublications(limit = 5): Promise<Publication[]> {
  const rows = (await sql`
    SELECT * FROM linkedin_publication
    WHERE status = 'scheduled'
      AND scheduled_window_start <= NOW()
    ORDER BY scheduled_window_start ASC
    LIMIT ${limit}
  `) as unknown as PubRow[];
  return rows.map(rowToPublication);
}
