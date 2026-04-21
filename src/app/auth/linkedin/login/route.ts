import { NextResponse, type NextRequest } from "next/server";
import { buildAuthUrl, type OwnerType } from "@/lib/linkedin/oauth";

export async function GET(req: NextRequest) {
  const as = (req.nextUrl.searchParams.get("as") ?? "person") as OwnerType;
  if (as !== "person" && as !== "organization") {
    return NextResponse.json({ error: "invalid 'as' param" }, { status: 400 });
  }
  const { url } = buildAuthUrl(as);
  return NextResponse.redirect(url);
}
