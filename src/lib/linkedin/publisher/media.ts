import { env } from "@/lib/env";
import { classify, LinkedInApiError, withBackoff } from "./errors";

const INIT_URL = "https://api.linkedin.com/rest/images?action=initializeUpload";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
]);
const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif"];

function apiHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "LinkedIn-Version": env.LINKEDIN_API_VERSION,
    "X-Restli-Protocol-Version": "2.0.0",
    "Content-Type": "application/json",
  };
}

type InitUploadResponse = {
  value: {
    uploadUrl: string;
    uploadUrlExpiresAt?: number;
    image: string;
  };
};

async function initUpload(
  accessToken: string,
  ownerUrn: string,
): Promise<InitUploadResponse["value"]> {
  const res = await fetch(INIT_URL, {
    method: "POST",
    headers: apiHeaders(accessToken),
    body: JSON.stringify({ initializeUploadRequest: { owner: ownerUrn } }),
  });
  if (!res.ok) {
    throw classify(
      res.status,
      res.headers.get("retry-after"),
      await res.text(),
    );
  }
  const data = (await res.json()) as InitUploadResponse;
  return data.value;
}

function hasAcceptedExtension(url: string): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return ACCEPTED_EXTENSIONS.some((ext) => path.endsWith(ext));
  } catch {
    return false;
  }
}

async function fetchImageBytes(url: string): Promise<ArrayBuffer> {
  if (!hasAcceptedExtension(url)) {
    throw new Error(
      `unsupported media URL: ${url} — LinkedIn accepts only JPG, PNG, GIF`,
    );
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`image fetch failed: ${res.status} ${url}`);
  }
  const contentType = (res.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (contentType && !ACCEPTED_CONTENT_TYPES.has(contentType)) {
    throw new Error(
      `unsupported content-type '${contentType}' for ${url} — LinkedIn accepts only JPG, PNG, GIF`,
    );
  }
  const ab = await res.arrayBuffer();
  if (ab.byteLength > MAX_IMAGE_BYTES) {
    throw new Error(
      `image too large: ${ab.byteLength} bytes (max ${MAX_IMAGE_BYTES})`,
    );
  }
  return ab;
}

async function putBytes(uploadUrl: string, bytes: ArrayBuffer): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: bytes,
  });
  if (!res.ok) {
    throw new LinkedInApiError({
      kind: res.status >= 500 ? "server_error" : "other",
      status: res.status,
      body: await res.text().catch(() => ""),
      message: `upload PUT failed: ${res.status}`,
    });
  }
}

export async function uploadImage(args: {
  accessToken: string;
  ownerUrn: string;
  sourceUrl: string;
}): Promise<string> {
  return withBackoff(async () => {
    const { uploadUrl, image } = await initUpload(
      args.accessToken,
      args.ownerUrn,
    );
    const bytes = await fetchImageBytes(args.sourceUrl);
    await putBytes(uploadUrl, bytes);
    return image;
  });
}
