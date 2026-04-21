import { NextResponse } from "next/server";
import { cancelPublication, getPublication } from "@/lib/publications";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const pub = await getPublication(id);
  if (!pub) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ publication: pub });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ok = await cancelPublication(id);
  if (!ok) {
    return NextResponse.json(
      { error: "not cancellable (wrong status or not found)" },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true });
}
