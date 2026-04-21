import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

async function handle(req: Request) {
  const auth = authorizeCron(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }
  return NextResponse.json({
    skipped: "metrics collector not implemented yet (PR 5 scope)",
  });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
