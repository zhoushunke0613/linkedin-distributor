import { NextResponse } from "next/server";
import { computeLearnings } from "@/lib/learnings";

export const dynamic = "force-dynamic";

export async function GET() {
  const report = await computeLearnings();
  return NextResponse.json(report);
}
