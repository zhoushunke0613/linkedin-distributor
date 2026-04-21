import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { authorizeCron } from "@/lib/cron-auth";
import {
  getFreshAccessToken,
  listTokens,
} from "@/lib/linkedin/token_store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(req: Request) {
  const auth = authorizeCron(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  const all = await listTokens();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  const refreshed: string[] = [];
  const skipped: Array<{ urn: string; reason: string }> = [];
  const warnings: Array<{ urn: string; reason: string }> = [];

  for (const t of all) {
    const accessMsLeft = t.accessExpiresAt.getTime() - now;
    if (accessMsLeft > sevenDaysMs) {
      skipped.push({ urn: t.authorUrn, reason: "access ok" });
      continue;
    }

    if (!t.refreshExpiresAt) {
      warnings.push({ urn: t.authorUrn, reason: "no refresh token — user must re-OAuth" });
      continue;
    }
    if (t.refreshExpiresAt.getTime() - now < thirtyDaysMs) {
      warnings.push({
        urn: t.authorUrn,
        reason: "refresh expiring <30d — re-OAuth soon",
      });
    }

    try {
      await getFreshAccessToken(t.authorUrn);
      refreshed.push(t.authorUrn);
    } catch (err) {
      warnings.push({
        urn: t.authorUrn,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  await sql`SELECT 1`.catch(() => null);

  return NextResponse.json({
    scanned: all.length,
    refreshed,
    skipped,
    warnings,
  });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
