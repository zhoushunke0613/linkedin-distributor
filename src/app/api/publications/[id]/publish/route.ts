import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { dispatchPublication } from "@/lib/linkedin/publisher/dispatch";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!env.LINKEDIN_PUBLISH_ENABLED) {
    return NextResponse.json(
      { error: "LINKEDIN_PUBLISH_ENABLED is false" },
      { status: 503 },
    );
  }

  const { id } = await params;
  const outcome = await dispatchPublication(id);
  if (!outcome.ok) {
    return NextResponse.json(
      { error: outcome.errorMessage, permanent: outcome.permanent },
      { status: outcome.permanent ? 422 : 502 },
    );
  }
  return NextResponse.json(outcome);
}
