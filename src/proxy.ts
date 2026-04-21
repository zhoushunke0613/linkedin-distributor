import { NextResponse, type NextRequest } from "next/server";

const REALM = "linkedin-distributor";

export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path.startsWith("/api/cron/")) return NextResponse.next();

  const password = process.env.APP_ACCESS_PASSWORD;
  if (!password) return NextResponse.next();

  const header = req.headers.get("authorization");
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
