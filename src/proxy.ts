import { NextResponse, type NextRequest } from "next/server";

const REALM = "linkedin-distributor";

export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Cron routes authenticate themselves via CRON_SECRET.
  if (path.startsWith("/api/cron/")) return NextResponse.next();

  const header = req.headers.get("authorization");

  // Bearer API_KEY — programmatic access (e.g. growth-system AI agent).
  const apiKey = process.env.API_KEY;
  if (apiKey && header?.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length).trim();
    if (token === apiKey) return NextResponse.next();
  }

  // Basic Auth APP_ACCESS_PASSWORD — UI access.
  const password = process.env.APP_ACCESS_PASSWORD;
  if (!password) return NextResponse.next();
  if (header?.startsWith("Basic ")) {
    const [, b64] = header.split(" ");
    const decoded = Buffer.from(b64, "base64").toString("utf8");
    const [, pass] = decoded.split(":");
    if (pass === password) return NextResponse.next();
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": `Basic realm="${REALM}"` },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
