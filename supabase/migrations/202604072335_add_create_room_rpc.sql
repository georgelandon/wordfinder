create or replace function public.create_room(
  p_room_code text default null
)
returns table (
  room_id uuid,
  room_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  desired_code text := upper(nullif(trim(p_room_code), ''));
  v_room public.rooms%rowtype;
begin
  insert into public.rooms (code, status, board_size, round_duration_seconds)
  values (coalesce(desired_code, public.generate_room_code()), 'lobby', 4, 120)
  returning * into v_room;

  room_id := v_room.id;
  room_code := v_room.code;
  return next;
end;
$$;

grant execute on function public.create_room(text) to authenticated;
