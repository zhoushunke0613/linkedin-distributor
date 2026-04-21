import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { authorizeCron } from "@/lib/cron-auth";
import {
  findDuePublications,
  processPublicationTick,
  type TickOutcome,
} from "@/lib/linkedin/scheduler";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(req: Request) {
  const auth = authorizeCron(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }
  if (!env.LINKEDIN_PUBLISH_ENABLED) {
    return NextResponse.json({ skipped: "LINKEDIN_PUBLISH_ENABLED=false" });
  }

  const due = await findDuePublications(5);
  const outcomes: TickOutcome[] = [];
  for (const pub of due) {
    try {
      outcomes.push(await processPublicationTick(pub));
    } catch (err) {
      outcomes.push({
        id: pub.id,
        action: "dispatched",
        ok: false,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ processed: due.length, outcomes });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
