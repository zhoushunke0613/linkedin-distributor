import { NextResponse, type NextRequest } from "next/server";
import {
  exchangeCode,
  fetchUserInfo,
  verifyState,
} from "@/lib/linkedin/oauth";
import { upsertToken } from "@/lib/linkedin/token_store";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const err = params.get("error");
  if (err) {
    return NextResponse.json(
      { error: err, description: params.get("error_description") },
      { status: 400 },
    );
  }

  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state) {
    return NextResponse.json({ error: "missing code/state" }, { status: 400 });
  }

  const verified = verifyState(state);
  if (!verified) {
    return NextResponse.json({ error: "invalid state" }, { status: 400 });
  }

  const token = await exchangeCode(code);
  const info = await fetchUserInfo(token.access_token);

  const authorUrn =
    verified.as === "person"
      ? `urn:li:person:${info.sub}`
      : `urn:li:organization:${info.sub}`;

  await upsertToken({
    authorUrn,
    ownerType: verified.as,
    displayName: info.name ?? null,
    token,
  });

  const url = new URL("/", req.nextUrl.origin);
  url.searchParams.set("connected", authorUrn);
  return NextResponse.redirect(url);
}
