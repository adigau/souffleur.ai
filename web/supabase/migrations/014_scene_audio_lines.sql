CREATE TABLE scene_audio_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  play_id uuid NOT NULL REFERENCES plays(id) ON DELETE CASCADE,
  scene_sort_order int NOT NULL,
  line_index int NOT NULL,
  character_name text NOT NULL,
  speech_text text NOT NULL,
  content_hash text NOT NULL,
  storage_path text,
  duration_ms int,
  word_timestamps jsonb,
  tts_voice_id text,
  generation_state text NOT NULL DEFAULT 'pending',
  error_message text,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(play_id, scene_sort_order, line_index)
);

CREATE INDEX idx_audio_lines_play_state ON scene_audio_lines(play_id, generation_state);
CREATE INDEX idx_audio_lines_play_scene ON scene_audio_lines(play_id, scene_sort_order, line_index);

ALTER TABLE scene_audio_lines ENABLE ROW LEVEL SECURITY;

-- Users can access audio lines for plays they have a user_plays record for
CREATE POLICY "Users access own audio lines" ON scene_audio_lines
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_plays
      WHERE user_plays.play_id = scene_audio_lines.play_id
        AND user_plays.user_id = auth.uid()
    )
  );

ALTER TABLE user_plays ADD COLUMN IF NOT EXISTS voice_mode text DEFAULT 'browser';

-- Storage bucket for generated audio (run once; safe to re-run)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('play-audio', 'play-audio', false, 15728640, ARRAY['audio/mpeg'])
ON CONFLICT (id) DO NOTHING;

-- RLS for storage: users can read audio for plays they own
CREATE POLICY "Users read own play audio" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'play-audio'
    AND EXISTS (
      SELECT 1 FROM user_plays up
      JOIN plays p ON p.id = up.play_id
      WHERE up.user_id = auth.uid()
        AND (storage.foldername(name))[1] = p.id::text
    )
  );
