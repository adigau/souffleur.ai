CREATE TABLE play_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_play_id uuid NOT NULL REFERENCES user_plays(id) ON DELETE CASCADE,
  title text,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_chat_sessions_user_play ON play_chat_sessions(user_play_id, created_at DESC);

ALTER TABLE play_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own chat sessions" ON play_chat_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_plays
      WHERE user_plays.id = play_chat_sessions.user_play_id
        AND user_plays.user_id = auth.uid()
    )
  );
