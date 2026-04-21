import { env } from "@/lib/env";
import { classify, LinkedInApiError } from "./publisher/errors";

export type OrganicMetrics = {
  likes: number;
  comments: number;
  fetchedAt: string;
  raw?: unknown;
};

type SocialActionsResponse = {
  likesSummary?: {
    totalLikes?: number;
  };
  commentsSummary?: {
    aggregatedTotalComments?: number;
    totalFirstLevelComments?: number;
  };
};

function apiHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "LinkedIn-Version": env.LINKEDIN_API_VERSION,
    "X-Restli-Protocol-Version": "2.0.0",
  };
}

export async function fetchOrganicMetrics(args: {
  accessToken: string;
  platformUrn: string;
}): Promise<OrganicMetrics | null> {
  const encoded = encodeURIComponent(args.platformUrn);
  const url = `https://api.linkedin.com/rest/socialActions/${encoded}`;

  const res = await fetch(url, { headers: apiHeaders(args.accessToken) });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw classify(
      res.status,
      res.headers.get("retry-after"),
      await res.text(),
    );
  }

  const data = (await res.json()) as SocialActionsResponse;
  return {
    likes: data.likesSummary?.totalLikes ?? 0,
    comments:
      data.commentsSummary?.aggregatedTotalComments ??
      data.commentsSummary?.totalFirstLevelComments ??
      0,
    fetchedAt: new Date().toISOString(),
    raw: data,
  };
}

export function extractStoredMetrics(
  meta: Record<string, unknown> | null,
): OrganicMetrics | null {
  if (!meta) return null;
  const m = meta.metrics;
  if (!m || typeof m !== "object") return null;
  const obj = m as Record<string, unknown>;
  if (typeof obj.likes !== "number" || typeof obj.comments !== "number") {
    return null;
  }
  return {
    likes: obj.likes,
    comments: obj.comments,
    fetchedAt:
      typeof obj.fetchedAt === "string" ? obj.fetchedAt : new Date(0).toISOString(),
  };
}

export function isRetryable(err: unknown): boolean {
  return err instanceof LinkedInApiError && err.shouldRetry;
}
