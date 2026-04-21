import { NextResponse, type NextRequest } from "next/server";
import {
  listPublications,
  schedulePublication,
  SchedulePublicationSchema,
} from "@/lib/publications";
import { getDraft } from "@/lib/drafts";
import { loadToken } from "@/lib/linkedin/token_store";

export async function GET() {
  const publications = await listPublications();
  return NextResponse.json({ publications });
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = SchedulePublicationSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const [draft, token] = await Promise.all([
    getDraft(parsed.data.draftId),
    loadToken(parsed.data.authorUrn),
  ]);
  if (!draft) {
    return NextResponse.json({ error: "draft not found" }, { status: 404 });
  }
  if (!token) {
    return NextResponse.json(
      { error: "author not connected" },
      { status: 404 },
    );
  }

  const pub = await schedulePublication(parsed.data);
  return NextResponse.json({ publication: pub }, { status: 201 });
}
