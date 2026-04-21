import { sql } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/crypto";
import {
  refreshAccessToken,
  type OwnerType,
  type TokenResponse,
} from "./oauth";

export type StoredToken = {
  authorUrn: string;
  ownerType: OwnerType;
  displayName: string | null;
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
  scopes: string;
};

export async function upsertToken(args: {
  authorUrn: string;
  ownerType: OwnerType;
  displayName?: string | null;
  token: TokenResponse;
}): Promise<void> {
  const now = Date.now();
  const access = encrypt(args.token.access_token);
  const refresh = encrypt(args.token.refresh_token);
  const accessExpiresAt = new Date(now + args.token.expires_in * 1000);
  const refreshExpiresAt = new Date(
    now + args.token.refresh_token_expires_in * 1000,
  );

  await sql`
    INSERT INTO linkedin_tokens (
      author_urn, owner_type, display_name,
      access_token_ct, access_token_iv,
      refresh_token_ct, refresh_token_iv,
      access_expires_at, refresh_expires_at,
      scopes, updated_at
    ) VALUES (
      ${args.authorUrn}, ${args.ownerType}, ${args.displayName ?? null},
      ${access.ct}, ${access.iv},
      ${refresh.ct}, ${refresh.iv},
      ${accessExpiresAt.toISOString()}, ${refreshExpiresAt.toISOString()},
      ${args.token.scope}, NOW()
    )
    ON CONFLICT (author_urn) DO UPDATE SET
      owner_type = EXCLUDED.owner_type,
      display_name = COALESCE(EXCLUDED.display_name, linkedin_tokens.display_name),
      access_token_ct = EXCLUDED.access_token_ct,
      access_token_iv = EXCLUDED.access_token_iv,
      refresh_token_ct = EXCLUDED.refresh_token_ct,
      refresh_token_iv = EXCLUDED.refresh_token_iv,
      access_expires_at = EXCLUDED.access_expires_at,
      refresh_expires_at = EXCLUDED.refresh_expires_at,
      scopes = EXCLUDED.scopes,
      updated_at = NOW()
  `;
}

export async function loadToken(authorUrn: string): Promise<StoredToken | null> {
  const rows = await sql`
    SELECT * FROM linkedin_tokens WHERE author_urn = ${authorUrn} LIMIT 1
  `;
  const r = rows[0];
  if (!r) return null;
  return {
    authorUrn: r.author_urn,
    ownerType: r.owner_type,
    displayName: r.display_name,
    accessToken: decrypt({ ct: r.access_token_ct, iv: r.access_token_iv }),
    refreshToken: decrypt({ ct: r.refresh_token_ct, iv: r.refresh_token_iv }),
    accessExpiresAt: new Date(r.access_expires_at),
    refreshExpiresAt: new Date(r.refresh_expires_at),
    scopes: r.scopes,
  };
}

export async function listTokens(): Promise<
  Array<Omit<StoredToken, "accessToken" | "refreshToken">>
> {
  const rows = await sql`
    SELECT author_urn, owner_type, display_name,
           access_expires_at, refresh_expires_at, scopes
    FROM linkedin_tokens
    ORDER BY updated_at DESC
  `;
  return rows.map((r) => ({
    authorUrn: r.author_urn,
    ownerType: r.owner_type,
    displayName: r.display_name,
    accessExpiresAt: new Date(r.access_expires_at),
    refreshExpiresAt: new Date(r.refresh_expires_at),
    scopes: r.scopes,
  }));
}

const ACCESS_REFRESH_MARGIN_MS = 24 * 60 * 60 * 1000;

export async function getFreshAccessToken(authorUrn: string): Promise<string> {
  const token = await loadToken(authorUrn);
  if (!token) throw new Error(`no token for ${authorUrn}`);
  if (token.accessExpiresAt.getTime() - Date.now() > ACCESS_REFRESH_MARGIN_MS) {
    return token.accessToken;
  }
  if (token.refreshExpiresAt.getTime() <= Date.now()) {
    throw new Error(`refresh token expired for ${authorUrn}, re-auth required`);
  }
  const fresh = await refreshAccessToken(token.refreshToken);
  await upsertToken({
    authorUrn: token.authorUrn,
    ownerType: token.ownerType,
    displayName: token.displayName,
    token: fresh,
  });
  return fresh.access_token;
}
