import { env } from "@/lib/env";

export function authorizeCron(req: Request): { ok: boolean; reason?: string } {
  if (!env.CRON_SECRET) {
    return { ok: false, reason: "CRON_SECRET is not configured" };
  }
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${env.CRON_SECRET}`;
  if (header !== expected) {
    return { ok: false, reason: "bad authorization header" };
  }
  return { ok: true };
}
