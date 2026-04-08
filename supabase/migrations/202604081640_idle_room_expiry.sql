create index if not exists idx_rooms_expires_at on public.rooms(expires_at);

alter table public.rooms
  alter column expires_at set default timezone('utc', now()) + interval '2 hours';

update public.rooms
set expires_at = timezone('utc', now()) + interval '2 hours'
where status not in ('ended', 'expired');

create or replace function public.expire_stale_rooms()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer := 0;
begin
  with deleted as (
    delete from public.rooms as r
    where r.expires_at <= timezone('utc', now())
    returning 1
  )
  select count(*) into deleted_count from deleted;

  return deleted_count;
end;
$$;

create or replace function public.bump_room_expiry(p_room_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  next_expires_at timestamptz;
begin
  update public.rooms as r
  set expires_at = timezone('utc', now()) + interval '2 hours'
  where r.id = p_room_id
    and r.status not in ('ended', 'expired')
  returning r.expires_at into next_expires_at;

  return next_expires_at;
end;
$$;

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
  perform public.expire_stale_rooms();

  insert into public.rooms (code, status, board_size, round_duration_seconds)
  values (coalesce(desired_code, public.generate_room_code()), 'lobby', 4, 120)
  returning * into v_room;

  perform public.bump_room_expiry(v_room.id);

  room_id := v_room.id;
  room_code := v_room.code;
  return next;
end;
$$;

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
  perform public.expire_stale_rooms();

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

  perform public.bump_room_expiry(v_room.id);
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
  next_connected boolean;
begin
  perform public.expire_stale_rooms();

  select r.*
  into v_room
  from public.rooms as r
  where r.code = upper(trim(p_room_code))
    and r.status not in ('ended', 'expired')
    and r.expires_at > timezone('utc', now())
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

  next_connected := coalesce(p_connected, v_player.connected);

  update public.players as p
  set connected = next_connected,
      ready = coalesce(p_ready, p.ready),
      last_seen_at = case when next_connected then timezone('utc', now()) else p.last_seen_at end,
      disconnected_at = case when p_connected = false then timezone('utc', now()) else null end
  where p.id = v_player.id;

  update public.players as p
  set connected = false,
      disconnected_at = coalesce(p.disconnected_at, timezone('utc', now()))
  where p.room_id = v_room.id
    and p.connected = true
    and p.last_seen_at < timezone('utc', now()) - interval '35 seconds';

  if next_connected then
    perform public.bump_room_expiry(v_room.id);
  end if;

  select public.sync_room_host(v_room.id) into host_player_id;

  select r.status into room_status
  from public.rooms as r
  where r.id = v_room.id;

  player_id := v_player.id;
  room_id := v_room.id;
  return next;
end;
$$;

grant execute on function public.expire_stale_rooms() to authenticated;
grant execute on function public.bump_room_expiry(uuid) to authenticated;
