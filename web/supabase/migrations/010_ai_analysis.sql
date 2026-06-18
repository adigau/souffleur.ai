create table if not exists play_ai_analysis (
  id uuid primary key default gen_random_uuid(),
  play_id uuid not null references plays(id) on delete cascade unique,
  content_hash text not null,
  summary text,
  character_profiles jsonb,
  analysis_model text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table play_ai_analysis enable row level security;

create policy "Users can read analysis for their plays"
  on play_ai_analysis for select
  using (
    exists (
      select 1 from user_plays
      where user_plays.play_id = play_ai_analysis.play_id
        and user_plays.user_id = auth.uid()
    )
  );

create policy "Users can upsert analysis for their plays"
  on play_ai_analysis for all
  using (
    exists (
      select 1 from user_plays
      where user_plays.play_id = play_ai_analysis.play_id
        and user_plays.user_id = auth.uid()
    )
  );
