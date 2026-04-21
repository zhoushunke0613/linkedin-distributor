ALTER TABLE linkedin_tokens ALTER COLUMN refresh_token_ct DROP NOT NULL;
ALTER TABLE linkedin_tokens ALTER COLUMN refresh_token_iv DROP NOT NULL;
ALTER TABLE linkedin_tokens ALTER COLUMN refresh_expires_at DROP NOT NULL;
