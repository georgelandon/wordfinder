create or replace function public.create_or_join_room(
  p_user_id uuid,
  p_nickname text,
  p_room_code text default null,
  p_create_if_missing boolean default true,
  p_device_kind text default 'controller'
)
returns table (
  room_id uuid,
  player_id uuid,
  host_player_id uuid,
  room_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  desired_code text := upper(nullif(trim(p_room_code), ''));
  v_room public.rooms%rowtype;
  v_player public.players%rowtype;
begin
  if p_user_id is null then
    raise exception 'Missing auth user id';
  end if;

  if coalesce(trim(p_nickname), '') = '' then
    raise exception 'Nickname is required';
  end if;

  if desired_code is not null then
    select r.*
    into v_room
    from public.rooms as r
    where r.code = desired_code
      and r.status not in ('ended', 'expired')
      and r.expires_at > timezone('utc', now())
    limit 1;
  end if;

  if v_room.id is null and p_create_if_missing then
    insert into public.rooms (code, status, board_size, round_duration_seconds)
    values (coalesce(desired_code, public.generate_room_code()), 'lobby', 4, 120)
    returning * into v_room;
  end if;

  if v_room.id is null then
    raise exception 'Room not found';
  end if;

  insert into public.players (
    room_id,
    auth_user_id,
    nickname,
    connected,
    ready,
    device_kind,
    disconnected_at
  )
  values (
    v_room.id,
    p_user_id,
    trim(p_nickname),
    true,
    false,
    coalesce(nullif(trim(p_device_kind), ''), 'controller'),
    null
  )
  on conflict on constraint players_room_id_auth_user_id_key
  do update
    set nickname = excluded.nickname,
        connected = true,
        ready = false,
        device_kind = excluded.device_kind,
        last_seen_at = timezone('utc', now()),
        disconnected_at = null
  returning * into v_player;

  insert into public.session_totals (room_id, player_id)
  values (v_room.id, v_player.id)
  on conflict on constraint session_totals_pkey do nothing;

  select public.sync_room_host(v_room.id) into host_player_id;

  room_id := v_room.id;
  player_id := v_player.id;
  room_code := v_room.code;
  return next;
end;
$$;

create or replace function public.set_player_state(
  p_room_code text,
  p_user_id uuid,
  p_connected boolean default true,
  p_ready boolean default null
)
returns table (
  player_id uuid,
  room_id uuid,
  host_player_id uuid,
  room_status public.room_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.rooms%rowtype;
  v_player public.players%rowtype;
begin
  select r.*
  into v_room
  from public.rooms as r
  where r.code = upper(trim(p_room_code))
  limit 1;

  if v_room.id is null then
    raise exception 'Room not found';
  end if;

  select p.*
  into v_player
  from public.players as p
  where p.room_id = v_room.id
    and p.auth_user_id = p_user_id
  limit 1;

  if v_player.id is null then
    raise exception 'Player not found for this room';
  end if;

  update public.players as p
  set connected = coalesce(p_connected, p.connected),
      ready = coalesce(p_ready, p.ready),
      last_seen_at = case when coalesce(p_connected, p.connected) then timezone('utc', now()) else p.last_seen_at end,
      disconnected_at = case when p_connected = false then timezone('utc', now()) else null end
  where p.id = v_player.id;

  update public.players as p
  set connected = false,
      disconnected_at = coalesce(p.disconnected_at, timezone('utc', now()))
  where p.room_id = v_room.id
    and p.connected = true
    and p.last_seen_at < timezone('utc', now()) - interval '35 seconds';

  select public.sync_room_host(v_room.id) into host_player_id;

  select r.status into room_status
  from public.rooms as r
  where r.id = v_room.id;

  player_id := v_player.id;
  room_id := v_room.id;
  return next;
end;
$$;
