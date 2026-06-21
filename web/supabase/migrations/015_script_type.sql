-- Add script_type (movie, sitcom, theater_play, monologue) to AI analysis
ALTER TABLE play_ai_analysis
  ADD COLUMN IF NOT EXISTS script_type text,
  ADD COLUMN IF NOT EXISTS script_type_options jsonb DEFAULT '[]';
