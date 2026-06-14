-- Add email to get_play_cast so the UI can show it on hover
drop function if exists get_play_cast(uuid);

create or replace function get_play_cast(p_play_id uuid)
returns table(
  role         text,
  display_name text,
  email        text,
  is_you       boolean
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
    r as role,
    coalesce(
      u.raw_user_meta_data->>'full_name',
      split_part(u.email, '@', 1)
    ) as display_name,
    u.email as email,
    (u.id = auth.uid()) as is_you
  from public.user_plays up
  cross join unnest(up.role) as r
  join auth.users u on u.id = up.user_id
  where up.play_id = p_play_id
    and up.role is not null
    and array_length(up.role, 1) > 0;
end;
$$;

grant execute on function get_play_cast(uuid) to authenticated;
