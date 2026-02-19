-- Studio OS — Shares table
-- Enables shareable moodboard links (no auth required to view)

CREATE TABLE IF NOT EXISTS shares (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  share_id    TEXT        UNIQUE NOT NULL,                          -- nanoid, used in URL: /share/{share_id}
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id  UUID        REFERENCES projects(id) ON DELETE CASCADE, -- optional project link
  project_name TEXT       NOT NULL DEFAULT 'Studio Moodboard',
  snapshot    JSONB       NOT NULL DEFAULT '[]',                    -- frozen copy of references at share time
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast share_id lookup
CREATE INDEX IF NOT EXISTS shares_share_id_idx ON shares (share_id);

-- Index for user's shares list
CREATE INDEX IF NOT EXISTS shares_user_id_idx ON shares (user_id);

-- Enable RLS
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;

-- Public can read active, non-expired shares
CREATE POLICY "Anyone can view active shares"
  ON shares FOR SELECT
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Authenticated users can create shares
CREATE POLICY "Authenticated users can create shares"
  ON shares FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Owners can update their shares (e.g. revoke)
CREATE POLICY "Owners can update their shares"
  ON shares FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Owners can delete their shares
CREATE POLICY "Owners can delete their shares"
  ON shares FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
