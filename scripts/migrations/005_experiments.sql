CREATE TABLE IF NOT EXISTS experiment (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform     TEXT NOT NULL DEFAULT 'linkedin'
                CHECK (platform IN ('linkedin','xiaohongshu','x','google_ads')),
  topic        TEXT NOT NULL,
  brief        TEXT,
  constraints  JSONB,
  headline_n   INT NOT NULL DEFAULT 0,
  body_n       INT NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','generating','ready','failed','archived')),
  generator_meta JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_experiment_created_at
  ON experiment(created_at DESC);

CREATE TABLE IF NOT EXISTS variant (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES experiment(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN ('headline','body','full')),
  text          TEXT NOT NULL,
  meta          JSONB,
  status        TEXT NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft','humanized','selected','archived')),
  post_url      TEXT,
  draft_id      UUID REFERENCES post_draft(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_variant_experiment
  ON variant(experiment_id);

CREATE INDEX IF NOT EXISTS idx_variant_draft
  ON variant(draft_id) WHERE draft_id IS NOT NULL;
