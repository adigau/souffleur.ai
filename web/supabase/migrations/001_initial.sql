-- Public-domain plays (seeded, readable by all authenticated users)
create table plays (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  author       text,
  is_sample    boolean default false,
  is_monologue boolean default false,
  created_at   timestamptz default now()
);

-- Scenes within a play
create table scenes (
  id         uuid primary key default gen_random_uuid(),
  play_id    uuid references plays on delete cascade not null,
  act        text,
  scene      text,
  sort_order int default 0,
  content    jsonb -- array of {ch, text, you} line objects
);

-- Each user's copy of a play + their progress
create table user_plays (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users on delete cascade not null,
  play_id        uuid references plays on delete cascade not null,
  role           text,
  off_book_pct   int default 0,
  last_practiced timestamptz,
  state          text default 'ready' check (state in ('ready', 'processing', 'attention')),
  note           text,
  progress       int default 0,
  created_at     timestamptz default now(),
  unique(user_id, play_id)
);

-- RLS
alter table user_plays enable row level security;

create policy "users read own plays" on user_plays
  for select using (auth.uid() = user_id);

create policy "users insert own plays" on user_plays
  for insert with check (auth.uid() = user_id);

create policy "users update own plays" on user_plays
  for update using (auth.uid() = user_id);

create policy "users delete own plays" on user_plays
  for delete using (auth.uid() = user_id);

-- Plays are public to authenticated users (read-only)
alter table plays enable row level security;
create policy "authenticated read plays" on plays
  for select using (auth.role() = 'authenticated');

alter table scenes enable row level security;
create policy "authenticated read scenes" on scenes
  for select using (auth.role() = 'authenticated');

-- Auto-add sample plays when a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
as $$
begin
  insert into public.user_plays (user_id, play_id, state)
  select new.id, id, 'ready'
  from public.plays
  where is_sample = true;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
