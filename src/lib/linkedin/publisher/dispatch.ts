import { sql } from "@/lib/db";
import { getDraft } from "@/lib/drafts";
import { getFreshAccessToken, loadToken } from "@/lib/linkedin/token_store";
import { getPublication } from "@/lib/publications";
import { LinkedInApiError } from "./errors";
import { publishOrganic, type OrganicPublishResult } from "./organic";

export type DispatchOutcome =
  | {
      ok: true;
      publicationId: string;
      platformUrn: string;
      mediaUrns: string[];
    }
  | {
      ok: false;
      publicationId: string;
      errorMessage: string;
      permanent: boolean;
    };

async function lockForPublishing(id: string): Promise<boolean> {
  const rows = await sql`
    UPDATE linkedin_publication
    SET status = 'publishing'
    WHERE id = ${id} AND status = 'scheduled'
    RETURNING id
  `;
  return rows.length > 0;
}

async function markPublished(
  id: string,
  result: OrganicPublishResult,
): Promise<void> {
  const metaPatch = JSON.stringify({ mediaUrns: result.mediaUrns });
  await sql`
    UPDATE linkedin_publication
    SET status = 'published',
        platform_urn = ${result.platformUrn},
        published_at = NOW(),
        scheduled_at = NOW(),
        meta = COALESCE(meta, '{}'::jsonb) || ${metaPatch}::jsonb
    WHERE id = ${id}
  `;
}

async function markFailed(
  id: string,
  errorMessage: string,
  permanent: boolean,
): Promise<void> {
  const nextStatus = permanent ? "failed" : "scheduled";
  await sql`
    UPDATE linkedin_publication
    SET status = ${nextStatus},
        retry_count = retry_count + 1,
        error_message = ${errorMessage}
    WHERE id = ${id}
  `;
}

export async function dispatchPublication(
  publicationId: string,
): Promise<DispatchOutcome> {
  const locked = await lockForPublishing(publicationId);
  if (!locked) {
    return {
      ok: false,
      publicationId,
      errorMessage: "publication is not in 'scheduled' state",
      permanent: true,
    };
  }

  try {
    const pub = await getPublication(publicationId);
    if (!pub) throw new Error("publication vanished after lock");

    if (pub.kind === "ads") {
      throw new Error(
        "ads publishing not implemented yet (see PR 6 roadmap)",
      );
    }

    const [draft, token] = await Promise.all([
      getDraft(pub.draftId),
      loadToken(pub.authorUrn),
    ]);
    if (!draft) throw new Error(`draft ${pub.draftId} not found`);
    if (!token) throw new Error(`author ${pub.authorUrn} not connected`);

    const accessToken = await getFreshAccessToken(pub.authorUrn);

    const result = await publishOrganic({
      accessToken,
      authorUrn: pub.authorUrn,
      text: draft.text,
      mediaSourceUrls: draft.mediaUrls.map((m) => m.url),
    });

    await markPublished(publicationId, result);

    return {
      ok: true,
      publicationId,
      platformUrn: result.platformUrn,
      mediaUrns: result.mediaUrns,
    };
  } catch (err) {
    const permanent =
      err instanceof LinkedInApiError ? err.isPermanent : false;
    const msg =
      err instanceof Error ? err.message : "unknown publisher error";
    await markFailed(publicationId, msg.slice(0, 500), permanent);
    return {
      ok: false,
      publicationId,
      errorMessage: msg,
      permanent,
    };
  }
}
