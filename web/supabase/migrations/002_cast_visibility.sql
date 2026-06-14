-- Expose cast info across users who share the same play.
-- Uses SECURITY DEFINER to access auth.users safely.
-- Only returns rows for plays the calling user also has in their library.

create or replace function get_play_cast(p_play_id uuid)
returns table(
  role        text,
  display_name text,
  is_you      boolean
)
language plpgsql security definer
as $$
begin
  if not exists (
    select 1 from public.user_plays
    where play_id = p_play_id and user_id = auth.uid()
  ) then
    return;
  end if;

  return query
  select
    up.role,
    coalesce(
      u.raw_user_meta_data->>'full_name',
      split_part(u.email, '@', 1)
    ) as display_name,
    (u.id = auth.uid()) as is_you
  from public.user_plays up
  join auth.users u on u.id = up.user_id
  where up.play_id = p_play_id
    and up.role is not null;
end;
$$;

grant execute on function get_play_cast(uuid) to authenticated;
