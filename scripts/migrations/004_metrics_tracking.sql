ALTER TABLE linkedin_publication
  ADD COLUMN IF NOT EXISTS last_metrics_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_linkedin_publication_metrics_due
  ON linkedin_publication(status, published_at DESC, last_metrics_at)
  WHERE status = 'published';
