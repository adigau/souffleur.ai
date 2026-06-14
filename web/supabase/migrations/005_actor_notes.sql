create table user_line_notes (
  id           uuid primary key default gen_random_uuid(),
  user_play_id uuid references user_plays(id) on delete cascade not null,
  scene_id     uuid references scenes(id) on delete cascade not null,
  line_index   int not null,
  text         text not null,
  updated_at   timestamptz default now(),
  unique(user_play_id, scene_id, line_index)
);

alter table user_line_notes enable row level security;

create policy "user owns their notes" on user_line_notes
  using (
    user_play_id in (
      select id from user_plays where user_id = auth.uid()
    )
  )
  with check (
    user_play_id in (
      select id from user_plays where user_id = auth.uid()
    )
  );
