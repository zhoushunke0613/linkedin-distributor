import { env } from "@/lib/env";
import { classify, withBackoff } from "./errors";
import { uploadImage } from "./media";

const POSTS_URL = "https://api.linkedin.com/rest/posts";

function apiHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "LinkedIn-Version": env.LINKEDIN_API_VERSION,
    "X-Restli-Protocol-Version": "2.0.0",
    "Content-Type": "application/json",
  };
}

type PostDistribution = {
  feedDistribution: "MAIN_FEED";
  targetEntities: never[];
  thirdPartyDistributionChannels: never[];
};

const DEFAULT_DISTRIBUTION: PostDistribution = {
  feedDistribution: "MAIN_FEED",
  targetEntities: [],
  thirdPartyDistributionChannels: [],
};

type BasePayload = {
  author: string;
  commentary: string;
  visibility: "PUBLIC";
  distribution: PostDistribution;
  lifecycleState: "PUBLISHED";
  isReshareDisabledByAuthor: false;
};

type PostPayload =
  | BasePayload
  | (BasePayload & {
      content: {
        media: { id: string; altText?: string };
      };
    })
  | (BasePayload & {
      content: {
        multiImage: {
          images: Array<{ id: string; altText?: string }>;
        };
      };
    });

function basePayload(authorUrn: string, text: string): BasePayload {
  return {
    author: authorUrn,
    commentary: text,
    visibility: "PUBLIC",
    distribution: DEFAULT_DISTRIBUTION,
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };
}

async function submitPost(
  accessToken: string,
  payload: PostPayload,
): Promise<string> {
  return withBackoff(async () => {
    const res = await fetch(POSTS_URL, {
      method: "POST",
      headers: apiHeaders(accessToken),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw classify(
        res.status,
        res.headers.get("retry-after"),
        await res.text(),
      );
    }
    const urn = res.headers.get("x-restli-id");
    if (!urn) {
      throw new Error("LinkedIn post succeeded but x-restli-id missing");
    }
    return urn;
  });
}

export type OrganicPublishArgs = {
  accessToken: string;
  authorUrn: string;
  text: string;
  mediaSourceUrls?: string[];
};

export type OrganicPublishResult = {
  platformUrn: string;
  mediaUrns: string[];
};

export async function publishOrganic(
  args: OrganicPublishArgs,
): Promise<OrganicPublishResult> {
  const sources = args.mediaSourceUrls ?? [];

  if (sources.length === 0) {
    const urn = await submitPost(
      args.accessToken,
      basePayload(args.authorUrn, args.text),
    );
    return { platformUrn: urn, mediaUrns: [] };
  }

  const mediaUrns = await Promise.all(
    sources.slice(0, 20).map((sourceUrl) =>
      uploadImage({
        accessToken: args.accessToken,
        ownerUrn: args.authorUrn,
        sourceUrl,
      }),
    ),
  );

  const payload: PostPayload =
    mediaUrns.length === 1
      ? {
          ...basePayload(args.authorUrn, args.text),
          content: { media: { id: mediaUrns[0] } },
        }
      : {
          ...basePayload(args.authorUrn, args.text),
          content: {
            multiImage: { images: mediaUrns.map((id) => ({ id })) },
          },
        };

  const urn = await submitPost(args.accessToken, payload);
  return { platformUrn: urn, mediaUrns };
}
