create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'room_status') then
    create type public.room_status as enum ('lobby', 'countdown', 'active', 'scoring', 'results', 'ended', 'expired');
  end if;

  if not exists (select 1 from pg_type where typname = 'round_status') then
    create type public.round_status as enum ('countdown', 'active', 'scoring', 'results', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'scored_word_status') then
    create type public.scored_word_status as enum (
      'valid',
      'too_short',
      'invalid_dictionary',
      'invalid_path',
      'duplicate_self',
      'duplicate_global'
    );
  end if;
end $$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{4,6}$'),
  status public.room_status not null default 'lobby',
  session_state jsonb not null default '{}'::jsonb,
  board_size integer not null default 4 check (board_size in (4, 5)),
  round_duration_seconds integer not null default 120 check (round_duration_seconds between 30 and 600),
  current_round_number integer not null default 0,
  active_round_id uuid,
  host_player_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  ended_at timestamptz,
  expires_at timestamptz not null default timezone('utc', now()) + interval '24 hours'
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  auth_user_id uuid not null,
  nickname text not null check (char_length(trim(nickname)) between 1 and 24),
  ready boolean not null default false,
  connected boolean not null default true,
  device_kind text not null default 'controller' check (device_kind in ('controller', 'display')),
  joined_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  disconnected_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  unique(room_id, auth_user_id)
);

create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  round_number integer not null,
  seed text not null,
  board jsonb not null,
  board_size integer not null default 4 check (board_size in (4, 5)),
  duration_seconds integer not null check (duration_seconds between 30 and 600),
  status public.round_status not null default 'countdown',
  created_at timestamptz not null default timezone('utc', now()),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  scored_at timestamptz,
  summary_ready_at timestamptz,
  results_published_at timestamptz,
  unique(room_id, round_number)
);

alter table public.rooms
  add constraint rooms_active_round_id_fkey
  foreign key (active_round_id) references public.rounds(id) on delete set null;

alter table public.rooms
  add constraint rooms_host_player_id_fkey
  foreign key (host_player_id) references public.players(id) on delete set null;

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  word text not null,
  normalized_word text not null,
  submitted_at timestamptz not null default timezone('utc', now()),
  unique(round_id, player_id, normalized_word)
);

create table if not exists public.scored_words (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  word text not null,
  normalized_word text not null,
  status public.scored_word_status not null,
  points integer not null default 0,
  reason text,
  path jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique(round_id, player_id, normalized_word)
);

create table if not exists public.round_totals (
  round_id uuid not null references public.rounds(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  total_points integer not null default 0,
  valid_word_count integer not null default 0,
  duplicate_word_count integer not null default 0,
  invalid_word_count integer not null default 0,
  rank integer,
  primary key (round_id, player_id)
);

create table if not exists public.session_totals (
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  cumulative_points integer not null default 0,
  rounds_played integer not null default 0,
  words_found integer not null default 0,
  last_updated_at timestamptz not null default timezone('utc', now()),
  primary key (room_id, player_id)
);

create index if not exists idx_rooms_code on public.rooms(code);
create index if not exists idx_rooms_status on public.rooms(status);
create index if not exists idx_players_room_joined on public.players(room_id, joined_at);
create index if not exists idx_players_room_last_seen on public.players(room_id, last_seen_at desc);
create index if not exists idx_players_auth on public.players(auth_user_id);
create index if not exists idx_rounds_room_number on public.rounds(room_id, round_number desc);
create index if not exists idx_submissions_round_player on public.submissions(round_id, player_id);
create index if not exists idx_scored_words_round_player on public.scored_words(round_id, player_id);
create index if not exists idx_round_totals_round on public.round_totals(round_id, rank);
create index if not exists idx_session_totals_room on public.session_totals(room_id, cumulative_points desc);

drop trigger if exists rooms_touch_updated_at on public.rooms;
create trigger rooms_touch_updated_at
before update on public.rooms
for each row
execute function public.touch_updated_at();

drop trigger if exists players_touch_updated_at on public.players;
create trigger players_touch_updated_at
before update on public.players
for each row
execute function public.touch_updated_at();

create or replace function public.normalize_word(input text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(coalesce(input, ''), '[^a-zA-Z]', '', 'g'));
$$;

create or replace function public.score_word_length(word_length integer)
returns integer
language sql
immutable
as $$
  select case
    when word_length < 3 then 0
    when word_length <= 4 then 1
    when word_length = 5 then 2
    when word_length = 6 then 3
    when word_length = 7 then 5
    else 11
  end;
$$;

create or replace function public.get_server_time()
returns timestamptz
language sql
stable
as $$
  select timezone('utc', now());
$$;

create or replace function public.generate_room_code()
returns text
language plpgsql
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  candidate text := '';
  position integer;
begin
  loop
    candidate := '';
    for position in 1..5 loop
      candidate := candidate || substr(alphabet, floor(random() * length(alphabet) + 1)::integer, 1);
    end loop;

    exit when not exists (select 1 from public.rooms where code = candidate);
  end loop;

  return candidate;
end;
$$;

create or replace function public.pick_host_candidate(p_room_id uuid)
returns uuid
language sql
stable
as $$
  select players.id
  from public.players
  where players.room_id = p_room_id
    and players.connected = true
    and players.last_seen_at >= timezone('utc', now()) - interval '35 seconds'
  order by players.joined_at asc, players.id asc
  limit 1;
$$;

create or replace function public.sync_room_host(p_room_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_host uuid;
  current_host_active boolean := false;
  next_host uuid;
begin
  select host_player_id
  into current_host
  from public.rooms
  where id = p_room_id
  for update;

  if current_host is not null then
    select exists (
      select 1
      from public.players
      where id = current_host
        and room_id = p_room_id
        and connected = true
        and last_seen_at >= timezone('utc', now()) - interval '35 seconds'
    )
    into current_host_active;
  end if;

  if current_host_active then
    return current_host;
  end if;

  select public.pick_host_candidate(p_room_id) into next_host;

  update public.rooms
  set host_player_id = next_host
  where id = p_room_id;

  return next_host;
end;
$$;

create or replace function public.players_sync_host_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_room_host(coalesce(new.room_id, old.room_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists players_sync_host_after_write on public.players;
create trigger players_sync_host_after_write
after insert or update of connected, last_seen_at, room_id on public.players
for each row
execute function public.players_sync_host_trigger();

create or replace function public.prevent_player_immutable_updates()
returns trigger
language plpgsql
as $$
begin
  new.room_id = old.room_id;
  new.auth_user_id = old.auth_user_id;
  new.joined_at = old.joined_at;
  return new;
end;
$$;

drop trigger if exists players_prevent_immutable_updates on public.players;
create trigger players_prevent_immutable_updates
before update on public.players
for each row
execute function public.prevent_player_immutable_updates();

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
    select *
    into v_room
    from public.rooms
    where code = desired_code
      and status not in ('ended', 'expired')
      and expires_at > timezone('utc', now())
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
  on conflict (room_id, auth_user_id)
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
  on conflict (room_id, player_id) do nothing;

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
  select *
  into v_room
  from public.rooms
  where code = upper(trim(p_room_code))
  limit 1;

  if v_room.id is null then
    raise exception 'Room not found';
  end if;

  select *
  into v_player
  from public.players
  where room_id = v_room.id
    and auth_user_id = p_user_id
  limit 1;

  if v_player.id is null then
    raise exception 'Player not found for this room';
  end if;

  update public.players
  set connected = coalesce(p_connected, connected),
      ready = coalesce(p_ready, ready),
      last_seen_at = case when coalesce(p_connected, connected) then timezone('utc', now()) else last_seen_at end,
      disconnected_at = case when p_connected = false then timezone('utc', now()) else null end
  where id = v_player.id;

  update public.players
  set connected = false,
      disconnected_at = coalesce(disconnected_at, timezone('utc', now()))
  where room_id = v_room.id
    and connected = true
    and last_seen_at < timezone('utc', now()) - interval '35 seconds';

  select public.sync_room_host(v_room.id) into host_player_id;

  select status into room_status from public.rooms where id = v_room.id;
  player_id := v_player.id;
  room_id := v_room.id;
  return next;
end;
$$;

grant execute on function public.get_server_time() to anon, authenticated;
grant execute on function public.create_or_join_room(uuid, text, text, boolean, text) to authenticated;
grant execute on function public.set_player_state(text, uuid, boolean, boolean) to authenticated;
grant execute on function public.sync_room_host(uuid) to authenticated;

alter table public.rooms enable row level security;
alter table public.players enable row level security;
alter table public.rounds enable row level security;
alter table public.submissions enable row level security;
alter table public.scored_words enable row level security;
alter table public.round_totals enable row level security;
alter table public.session_totals enable row level security;

drop policy if exists "rooms_select_authenticated" on public.rooms;
create policy "rooms_select_authenticated"
on public.rooms
for select
to authenticated
using (true);

drop policy if exists "players_select_authenticated" on public.players;
create policy "players_select_authenticated"
on public.players
for select
to authenticated
using (true);

drop policy if exists "players_update_own_row" on public.players;
create policy "players_update_own_row"
on public.players
for update
to authenticated
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);

drop policy if exists "rounds_select_authenticated" on public.rounds;
create policy "rounds_select_authenticated"
on public.rounds
for select
to authenticated
using (true);

drop policy if exists "submissions_select_own_words" on public.submissions;
create policy "submissions_select_authenticated"
on public.submissions
for select
to authenticated
using (true);

drop policy if exists "submissions_insert_own_words" on public.submissions;
create policy "submissions_insert_own_words"
on public.submissions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.players
    join public.rounds on public.rounds.id = submissions.round_id
    where public.players.id = submissions.player_id
      and public.players.auth_user_id = auth.uid()
      and public.rounds.status in ('countdown', 'active')
  )
);

drop policy if exists "submissions_update_own_words" on public.submissions;
create policy "submissions_update_own_words"
on public.submissions
for update
to authenticated
using (
  exists (
    select 1
    from public.players
    where public.players.id = submissions.player_id
      and public.players.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.players
    where public.players.id = submissions.player_id
      and public.players.auth_user_id = auth.uid()
  )
);

drop policy if exists "scored_words_select_authenticated" on public.scored_words;
create policy "scored_words_select_authenticated"
on public.scored_words
for select
to authenticated
using (true);

drop policy if exists "round_totals_select_authenticated" on public.round_totals;
create policy "round_totals_select_authenticated"
on public.round_totals
for select
to authenticated
using (true);

drop policy if exists "session_totals_select_authenticated" on public.session_totals;
create policy "session_totals_select_authenticated"
on public.session_totals
for select
to authenticated
using (true);

alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.rounds;
alter publication supabase_realtime add table public.round_totals;
alter publication supabase_realtime add table public.session_totals;
alter publication supabase_realtime add table public.scored_words;
