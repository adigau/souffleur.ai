-- Structured confidence arrays for AI-detected fields
alter table play_ai_analysis
  add column if not exists play_type_options jsonb,
  add column if not exists detected_language_options jsonb;

-- Enable Realtime on user_plays so the library can receive live state updates
alter publication supabase_realtime add table user_plays;
