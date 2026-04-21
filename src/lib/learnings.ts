import { sql } from "@/lib/db";
import {
  extractStoredMetrics,
  type OrganicMetrics,
} from "@/lib/linkedin/analytics";

export type PublishedSample = {
  publicationId: string;
  platformUrn: string;
  publishedAt: Date;
  text: string;
  hasMedia: boolean;
  mediaCount: number;
  authorUrn: string;
  metrics: OrganicMetrics | null;
};

export type Bucket = { label: string; n: number; avgEngagement: number };

export type LearningsReport = {
  sampleSize: number;
  coveredSampleSize: number;
  overallAvgEngagement: number;
  byTextLength: Bucket[];
  byHasMedia: Bucket[];
  byDayOfWeek: Bucket[];
  byHourOfDay: Bucket[];
  byAuthor: Bucket[];
  topPosts: Array<{
    platformUrn: string;
    engagement: number;
    likes: number;
    comments: number;
    textPreview: string;
    publishedAt: string;
  }>;
  generatedAt: string;
};

type PubRow = {
  id: string;
  platform_urn: string;
  published_at: string;
  meta: Record<string, unknown> | null;
  author_urn: string;
  text: string;
  media_count: number;
};

async function getSamples(): Promise<PublishedSample[]> {
  const rows = (await sql`
    SELECT
      p.id,
      p.platform_urn,
      p.published_at,
      p.meta,
      p.author_urn,
      d.text,
      COALESCE(jsonb_array_length(d.media_urls), 0) AS media_count
    FROM linkedin_publication p
    JOIN post_draft d ON d.id = p.draft_id
    WHERE p.status = 'published'
      AND p.platform_urn IS NOT NULL
    ORDER BY p.published_at DESC
  `) as unknown as PubRow[];

  return rows.map((r) => ({
    publicationId: r.id,
    platformUrn: r.platform_urn,
    publishedAt: new Date(r.published_at),
    text: r.text,
    mediaCount: Number(r.media_count),
    hasMedia: Number(r.media_count) > 0,
    authorUrn: r.author_urn,
    metrics: extractStoredMetrics(r.meta),
  }));
}

function engagementScore(m: OrganicMetrics): number {
  return m.likes + 3 * m.comments;
}

function textLengthBucket(text: string): string {
  const n = text.length;
  if (n < 300) return "<300 chars";
  if (n < 800) return "300–800 chars";
  if (n < 1500) return "800–1500 chars";
  return "1500+ chars";
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function bucket<T>(
  entries: T[],
  scoreOf: (e: T) => number,
  keyOf: (e: T) => string,
  order?: string[],
): Bucket[] {
  const groups = new Map<string, number[]>();
  for (const e of entries) {
    const k = keyOf(e);
    const arr = groups.get(k) ?? [];
    arr.push(scoreOf(e));
    groups.set(k, arr);
  }
  const rows: Bucket[] = [];
  for (const [label, scores] of groups.entries()) {
    rows.push({
      label,
      n: scores.length,
      avgEngagement:
        scores.reduce((a, b) => a + b, 0) / Math.max(scores.length, 1),
    });
  }
  if (order) {
    rows.sort(
      (a, b) => order.indexOf(a.label) - order.indexOf(b.label),
    );
  } else {
    rows.sort((a, b) => b.avgEngagement - a.avgEngagement);
  }
  return rows;
}

export async function computeLearnings(): Promise<LearningsReport> {
  const samples = await getSamples();
  const covered = samples.filter((s) => s.metrics !== null);

  const scored = covered.map((s) => ({
    sample: s,
    score: engagementScore(s.metrics!),
  }));

  const overallAvg =
    scored.length > 0
      ? scored.reduce((a, b) => a + b.score, 0) / scored.length
      : 0;

  const topPosts = [...scored]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((e) => ({
      platformUrn: e.sample.platformUrn,
      engagement: e.score,
      likes: e.sample.metrics!.likes,
      comments: e.sample.metrics!.comments,
      textPreview:
        e.sample.text.length > 120
          ? `${e.sample.text.slice(0, 120)}…`
          : e.sample.text,
      publishedAt: e.sample.publishedAt.toISOString(),
    }));

  return {
    sampleSize: samples.length,
    coveredSampleSize: scored.length,
    overallAvgEngagement: overallAvg,
    byTextLength: bucket(
      scored,
      (e) => e.score,
      (e) => textLengthBucket(e.sample.text),
    ),
    byHasMedia: bucket(
      scored,
      (e) => e.score,
      (e) => (e.sample.hasMedia ? "with media" : "text-only"),
    ),
    byDayOfWeek: bucket(
      scored,
      (e) => e.score,
      (e) => DAYS[e.sample.publishedAt.getUTCDay()],
      [...DAYS],
    ),
    byHourOfDay: bucket(
      scored,
      (e) => e.score,
      (e) => `${String(e.sample.publishedAt.getUTCHours()).padStart(2, "0")}:00 UTC`,
    ),
    byAuthor: bucket(
      scored,
      (e) => e.score,
      (e) => e.sample.authorUrn,
    ),
    topPosts,
    generatedAt: new Date().toISOString(),
  };
}
