CREATE TABLE IF NOT EXISTS linkedin_tokens (
  author_urn         TEXT PRIMARY KEY,
  owner_type         TEXT NOT NULL CHECK (owner_type IN ('person', 'organization')),
  display_name       TEXT,
  access_token_ct    TEXT NOT NULL,
  access_token_iv    TEXT NOT NULL,
  refresh_token_ct   TEXT NOT NULL,
  refresh_token_iv   TEXT NOT NULL,
  access_expires_at  TIMESTAMPTZ NOT NULL,
  refresh_expires_at TIMESTAMPTZ NOT NULL,
  scopes             TEXT NOT NULL,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_linkedin_tokens_access_expiry
  ON linkedin_tokens(access_expires_at);

CREATE TABLE IF NOT EXISTS _migrations (
  id         TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
