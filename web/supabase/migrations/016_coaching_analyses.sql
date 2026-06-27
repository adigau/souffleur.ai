-- Per-scene and per-character coaching analyses generated at save time
ALTER TABLE play_ai_analysis
  ADD COLUMN IF NOT EXISTS scene_analyses JSONB,
  ADD COLUMN IF NOT EXISTS character_analyses JSONB;
