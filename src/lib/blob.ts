import { put, type PutBlobResult } from "@vercel/blob";

const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
]);

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
};

const MAX_BYTES = 10 * 1024 * 1024;

export function isBlobEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function randomSlug(): string {
  return Math.random().toString(36).slice(2, 10);
}

export async function uploadImageFile(
  file: File,
): Promise<{ url: string }> {
  if (!isBlobEnabled()) {
    throw new Error(
      "Vercel Blob is not configured (BLOB_READ_WRITE_TOKEN missing)",
    );
  }
  const type = (file.type || "").toLowerCase();
  if (!ACCEPTED_TYPES.has(type)) {
    throw new Error(
      `unsupported file type '${file.type}' — LinkedIn accepts only JPG, PNG, GIF`,
    );
  }
  if (file.size > MAX_BYTES) {
    throw new Error(
      `file too large: ${file.size} bytes (max ${MAX_BYTES})`,
    );
  }
  const ext = EXT_BY_TYPE[type] ?? ".bin";
  const pathname = `draft-media/${Date.now()}-${randomSlug()}${ext}`;
  const result: PutBlobResult = await put(pathname, file, {
    access: "public",
    contentType: type,
    addRandomSuffix: false,
  });
  return { url: result.url };
}
