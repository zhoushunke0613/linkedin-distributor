CREATE TABLE IF NOT EXISTS post_draft (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text        TEXT NOT NULL,
  media_urls  JSONB NOT NULL DEFAULT '[]'::jsonb,
  source      TEXT NOT NULL DEFAULT 'manual',
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_draft_created_at
  ON post_draft(created_at DESC);

CREATE TABLE IF NOT EXISTS linkedin_publication (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id               UUID NOT NULL REFERENCES post_draft(id) ON DELETE RESTRICT,
  author_urn             TEXT NOT NULL REFERENCES linkedin_tokens(author_urn) ON DELETE RESTRICT,
  kind                   TEXT NOT NULL CHECK (kind IN ('organic','ads')),
  status                 TEXT NOT NULL DEFAULT 'scheduled'
                          CHECK (status IN ('scheduled','publishing','published','failed','canceled')),
  scheduled_window_start TIMESTAMPTZ NOT NULL,
  scheduled_window_end   TIMESTAMPTZ NOT NULL,
  scheduled_at           TIMESTAMPTZ,
  published_at           TIMESTAMPTZ,
  platform_urn           TEXT,
  retry_count            INT NOT NULL DEFAULT 0,
  error_message          TEXT,
  meta                   JSONB,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (scheduled_window_end >= scheduled_window_start)
);

CREATE INDEX IF NOT EXISTS idx_linkedin_publication_due
  ON linkedin_publication(status, scheduled_window_start)
  WHERE status IN ('scheduled','publishing');

CREATE INDEX IF NOT EXISTS idx_linkedin_publication_author_published
  ON linkedin_publication(author_urn, published_at DESC)
  WHERE published_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_linkedin_publication_draft
  ON linkedin_publication(draft_id);
