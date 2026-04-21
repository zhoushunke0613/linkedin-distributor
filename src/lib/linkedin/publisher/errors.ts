export type LinkedInErrorKind =
  | "unauthorized"
  | "forbidden"
  | "unprocessable"
  | "rate_limited"
  | "server_error"
  | "network"
  | "other";

export class LinkedInApiError extends Error {
  readonly kind: LinkedInErrorKind;
  readonly status: number;
  readonly retryAfterMs: number | null;
  readonly body: string;

  constructor(args: {
    kind: LinkedInErrorKind;
    status: number;
    retryAfterMs?: number | null;
    body?: string;
    message: string;
  }) {
    super(args.message);
    this.kind = args.kind;
    this.status = args.status;
    this.retryAfterMs = args.retryAfterMs ?? null;
    this.body = args.body ?? "";
  }

  get shouldRetry(): boolean {
    return (
      this.kind === "rate_limited" ||
      this.kind === "server_error" ||
      this.kind === "network"
    );
  }

  get isPermanent(): boolean {
    return (
      this.kind === "forbidden" ||
      this.kind === "unprocessable" ||
      this.kind === "other"
    );
  }
}

export function classify(
  status: number,
  retryAfter: string | null,
  body: string,
): LinkedInApiError {
  const retryAfterMs = retryAfter
    ? (() => {
        const n = Number(retryAfter);
        return Number.isFinite(n) ? n * 1000 : null;
      })()
    : null;
  if (status === 401) {
    return new LinkedInApiError({
      kind: "unauthorized",
      status,
      retryAfterMs,
      body,
      message: "LinkedIn 401 unauthorized (token invalid or expired)",
    });
  }
  if (status === 403) {
    return new LinkedInApiError({
      kind: "forbidden",
      status,
      body,
      message: "LinkedIn 403 forbidden (scope or permission issue)",
    });
  }
  if (status === 422) {
    return new LinkedInApiError({
      kind: "unprocessable",
      status,
      body,
      message: "LinkedIn 422 content rejected",
    });
  }
  if (status === 429) {
    return new LinkedInApiError({
      kind: "rate_limited",
      status,
      retryAfterMs: retryAfterMs ?? 60_000,
      body,
      message: "LinkedIn 429 rate limited",
    });
  }
  if (status >= 500) {
    return new LinkedInApiError({
      kind: "server_error",
      status,
      retryAfterMs,
      body,
      message: `LinkedIn ${status} server error`,
    });
  }
  return new LinkedInApiError({
    kind: "other",
    status,
    body,
    message: `LinkedIn ${status} ${body.slice(0, 200)}`,
  });
}

export async function withBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!(err instanceof LinkedInApiError) || !err.shouldRetry) throw err;
      if (attempt === maxAttempts) throw err;
      const backoff =
        err.retryAfterMs ?? Math.min(2 ** attempt * 1000, 30_000);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw lastErr;
}
