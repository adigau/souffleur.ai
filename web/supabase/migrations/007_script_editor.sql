-- Allow authenticated users to create their own (non-sample) plays
create policy "authenticated users can create plays" on plays
  for insert
  with check (
    auth.role() = 'authenticated'
    and is_sample = false
  );

-- Allow users to modify scenes for non-sample plays in their library
create policy "owners can write scenes" on scenes
  for all
  using (
    exists (
      select 1 from plays p
      join user_plays up on up.play_id = p.id
      where p.id = scenes.play_id
        and up.user_id = auth.uid()
        and p.is_sample = false
    )
  )
  with check (
    exists (
      select 1 from plays p
      join user_plays up on up.play_id = p.id
      where p.id = scenes.play_id
        and up.user_id = auth.uid()
        and p.is_sample = false
    )
  );

-- Allow users to delete non-sample plays they own
create policy "owners can delete plays" on plays
  for delete
  using (
    is_sample = false
    and exists (
      select 1 from user_plays
      where user_plays.play_id = plays.id
        and user_plays.user_id = auth.uid()
    )
  );

-- Allow users to update the title of non-sample plays they own
create policy "owners can update play title" on plays
  for update
  using (
    is_sample = false
    and exists (
      select 1 from user_plays
      where user_plays.play_id = plays.id
        and user_plays.user_id = auth.uid()
    )
  )
  with check (
    is_sample = false
    and exists (
      select 1 from user_plays
      where user_plays.play_id = plays.id
        and user_plays.user_id = auth.uid()
    )
  );
