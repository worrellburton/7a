-- SEO backlink tracking fields per directory. Adds three free-text
-- columns to directory_states so the team can record where the
-- backlink lives on the directory site, where it points back to on
-- sevenarrowsrecoveryarizona.com, and the anchor text that was
-- used. Surfaces on /app/seo/directories as four new columns
-- (Website / Backlinks URL / Target URL / Anchor Text); the
-- Website column reads the existing curated `url` and doesn't
-- need a stored value.
ALTER TABLE directory_states
  ADD COLUMN IF NOT EXISTS backlink_url text,
  ADD COLUMN IF NOT EXISTS backlink_url_set_by uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS backlink_url_set_at timestamptz,
  ADD COLUMN IF NOT EXISTS target_url text,
  ADD COLUMN IF NOT EXISTS target_url_set_by uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS target_url_set_at timestamptz,
  ADD COLUMN IF NOT EXISTS anchor_text text,
  ADD COLUMN IF NOT EXISTS anchor_text_set_by uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS anchor_text_set_at timestamptz;
