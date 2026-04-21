import { NextResponse, type NextRequest } from "next/server";
import { CreateDraftSchema, createDraft, listDrafts } from "@/lib/drafts";

export async function GET() {
  const drafts = await listDrafts();
  return NextResponse.json({ drafts });
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = CreateDraftSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const draft = await createDraft(parsed.data);
  return NextResponse.json({ draft }, { status: 201 });
}
