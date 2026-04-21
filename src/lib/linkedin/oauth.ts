import { createHmac, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

const AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const USERINFO_URL = "https://api.linkedin.com/v2/userinfo";

export type OwnerType = "person" | "organization";

export const SCOPES: Record<OwnerType, string> = {
  person: "openid profile email w_member_social",
  organization:
    "openid profile email w_member_social r_organization_social w_organization_social rw_organization_admin",
};

export function buildAuthUrl(as: OwnerType): { url: string; state: string } {
  const stateRaw = randomBytes(16).toString("hex");
  const state = signState(stateRaw, as);
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.LINKEDIN_CLIENT_ID,
    redirect_uri: env.LINKEDIN_REDIRECT_URI,
    scope: SCOPES[as],
    state,
  });
  return { url: `${AUTH_URL}?${params}`, state };
}

export function signState(raw: string, as: OwnerType): string {
  const body = `${raw}.${as}.${Date.now()}`;
  const mac = createHmac("sha256", env.LINKEDIN_CLIENT_SECRET)
    .update(body)
    .digest("hex");
  return `${body}.${mac}`;
}

export function verifyState(state: string): { as: OwnerType } | null {
  const parts = state.split(".");
  if (parts.length !== 4) return null;
  const [raw, as, ts, mac] = parts;
  if (as !== "person" && as !== "organization") return null;
  const expected = createHmac("sha256", env.LINKEDIN_CLIENT_SECRET)
    .update(`${raw}.${as}.${ts}`)
    .digest("hex");
  if (expected !== mac) return null;
  const age = Date.now() - Number(ts);
  if (!Number.isFinite(age) || age < 0 || age > 10 * 60 * 1000) return null;
  return { as };
}

export type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_token_expires_in: number;
  scope: string;
  id_token?: string;
  token_type: "Bearer";
};

export async function exchangeCode(code: string): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: env.LINKEDIN_REDIRECT_URI,
      client_id: env.LINKEDIN_CLIENT_ID,
      client_secret: env.LINKEDIN_CLIENT_SECRET,
    }),
  });
  if (!res.ok) {
    throw new Error(`token exchange failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: env.LINKEDIN_CLIENT_ID,
      client_secret: env.LINKEDIN_CLIENT_SECRET,
    }),
  });
  if (!res.ok) {
    throw new Error(`refresh failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export type UserInfo = { sub: string; name?: string; email?: string };

export async function fetchUserInfo(accessToken: string): Promise<UserInfo> {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`userinfo failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}
