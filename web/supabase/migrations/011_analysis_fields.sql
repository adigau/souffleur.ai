alter table play_ai_analysis
  add column if not exists description text,
  add column if not exists play_type text,
  add column if not exists detected_language text;
