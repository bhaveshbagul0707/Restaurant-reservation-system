create table if not exists public.restaurant_tables (
  table_number smallint primary key check (table_number between 1 and 99),
  capacity smallint not null check (capacity between 1 and 20),
  active boolean not null default true
);

insert into public.restaurant_tables (table_number, capacity)
values (1, 2), (2, 2), (3, 4), (4, 4), (5, 6), (6, 6)
on conflict (table_number) do nothing;

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null check (char_length(guest_name) between 1 and 100),
  email text not null check (char_length(email) <= 254),
  phone text not null check (char_length(phone) between 3 and 30),
  reservation_date date not null,
  reservation_time time without time zone not null,
  guests smallint not null check (guests between 1 and 20),
  table_number smallint not null references public.restaurant_tables(table_number),
  sms_consent boolean not null default false,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);

create unique index if not exists reservations_one_active_booking_per_table_slot
  on public.reservations (reservation_date, reservation_time, table_number)
  where status = 'confirmed';

create index if not exists reservations_date_time_idx
  on public.reservations (reservation_date, reservation_time)
  where status = 'confirmed';

create table if not exists public.admin_credentials (
  singleton boolean primary key default true check (singleton),
  username text not null unique check (username ~ '^[a-zA-Z0-9._@-]{3,32}$'),
  salt text not null check (salt ~ '^[a-f0-9]{32}$'),
  password_hash text not null check (password_hash ~ '^[a-f0-9]{128}$'),
  session_version uuid not null default gen_random_uuid(),
  updated_at timestamptz not null default now()
);

create table if not exists public.api_rate_limits (
  rate_key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.reservation_notifications (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id),
  channel text not null check (channel in ('email', 'sms')),
  event_type text not null check (event_type in ('booking_confirmed', 'booking_cancelled')),
  recipient text not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'skipped', 'not_configured')),
  attempts smallint not null default 0 check (attempts >= 0),
  last_error text,
  provider_message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (reservation_id, channel, event_type)
);

alter table public.restaurant_tables enable row level security;
alter table public.reservations enable row level security;
alter table public.admin_credentials enable row level security;
alter table public.api_rate_limits enable row level security;
alter table public.reservation_notifications enable row level security;

revoke all on public.restaurant_tables, public.reservations,
  public.admin_credentials, public.reservation_notifications from anon, authenticated;
revoke all on public.api_rate_limits from anon, authenticated;
grant select, insert, update, delete on public.restaurant_tables,
  public.reservations, public.admin_credentials,
  public.reservation_notifications to service_role;
grant select, insert, update, delete on public.api_rate_limits to service_role;

create or replace function public.consume_api_rate_limit(
  p_rate_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_limit < 1 or p_window_seconds < 1 or char_length(p_rate_key) > 128 then
    raise exception using errcode = '22023', message = 'Invalid rate limit parameters.';
  end if;

  insert into public.api_rate_limits (rate_key, window_started_at, request_count)
  values (p_rate_key, now(), 1)
  on conflict (rate_key) do update
  set
    request_count = case
      when public.api_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then 1
      else public.api_rate_limits.request_count + 1
    end,
    window_started_at = case
      when public.api_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then now()
      else public.api_rate_limits.window_started_at
    end,
    updated_at = now()
  returning request_count into v_count;

  delete from public.api_rate_limits
  where updated_at < now() - interval '2 days';

  return v_count <= p_limit;
end;
$$;

create or replace function public.create_reservation(
  p_guest_name text,
  p_email text,
  p_phone text,
  p_reservation_date date,
  p_reservation_time time without time zone,
  p_guests integer,
  p_table_number integer,
  p_sms_consent boolean default false
)
returns setof public.reservations
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_capacity smallint;
  v_reservation public.reservations;
begin
  if p_reservation_date < current_date + 1
    or p_reservation_date > current_date + 30 then
    raise exception using errcode = '22023', message = 'Choose a date from tomorrow through the next 30 days.';
  end if;

  if p_reservation_time < time '11:00'
    or p_reservation_time > time '21:30'
    or extract(minute from p_reservation_time)::integer not in (0, 30)
    or extract(second from p_reservation_time) <> 0 then
    raise exception using errcode = '22023', message = 'Choose an available 30-minute time slot between 11:00 and 21:30.';
  end if;

  if p_guests < 1 or p_guests > 20 then
    raise exception using errcode = '22023', message = 'The guest count is invalid.';
  end if;

  select capacity into v_capacity
  from public.restaurant_tables
  where table_number = p_table_number and active;

  if v_capacity is null then
    raise exception using errcode = '22023', message = 'That table is not available.';
  end if;
  if p_guests > v_capacity then
    raise exception using errcode = '22023', message = 'That table does not have enough seats for your party.';
  end if;

  insert into public.reservations (
      guest_name, email, phone, reservation_date, reservation_time,
      guests, table_number, sms_consent
    )
    values (
      btrim(p_guest_name), lower(btrim(p_email)), btrim(p_phone),
      p_reservation_date, p_reservation_time, p_guests, p_table_number,
      coalesce(p_sms_consent, false)
    )
    returning * into v_reservation;

  insert into public.reservation_notifications (
    reservation_id, channel, event_type, recipient, payload, status, last_error
  )
  values (
    v_reservation.id,
    'email',
    'booking_confirmed',
    v_reservation.email,
    jsonb_build_object(
      'name', v_reservation.guest_name,
      'date', v_reservation.reservation_date,
      'time', v_reservation.reservation_time,
      'guests', v_reservation.guests,
      'tableNumber', v_reservation.table_number
    ),
    'pending',
    null
  ), (
    v_reservation.id,
    'sms',
    'booking_confirmed',
    v_reservation.phone,
    jsonb_build_object(
      'name', v_reservation.guest_name,
      'date', v_reservation.reservation_date,
      'time', v_reservation.reservation_time,
      'guests', v_reservation.guests,
      'tableNumber', v_reservation.table_number
    ),
    case when v_reservation.sms_consent then 'pending' else 'skipped' end,
    case when v_reservation.sms_consent then null else 'Guest did not opt in to SMS notifications.' end
  );

  return next v_reservation;
end;
$$;

create or replace function public.cancel_reservation(p_reservation_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_reservation public.reservations;
  v_notifications jsonb;
begin
  update public.reservations
  set status = 'cancelled', cancelled_at = now()
  where id = p_reservation_id and status = 'confirmed'
  returning * into v_reservation;

  if not found then
    raise exception using errcode = 'P0002', message = 'Reservation was not found or is already cancelled.';
  end if;

  insert into public.reservation_notifications (reservation_id, channel, event_type, recipient, payload, status)
  values (
    v_reservation.id,
    'email',
    'booking_cancelled',
    v_reservation.email,
    jsonb_build_object(
      'name', v_reservation.guest_name,
      'date', v_reservation.reservation_date,
      'time', v_reservation.reservation_time,
      'guests', v_reservation.guests,
      'tableNumber', v_reservation.table_number
    ),
    'pending'
  );

  insert into public.reservation_notifications (reservation_id, channel, event_type, recipient, payload, status, last_error)
  values (
    v_reservation.id,
    'sms',
    'booking_cancelled',
    v_reservation.phone,
    jsonb_build_object(
      'name', v_reservation.guest_name,
      'date', v_reservation.reservation_date,
      'time', v_reservation.reservation_time,
      'guests', v_reservation.guests,
      'tableNumber', v_reservation.table_number
    ),
    case when v_reservation.sms_consent then 'pending' else 'skipped' end,
    case when v_reservation.sms_consent then null else 'Guest did not opt in to SMS notifications.' end
  );

  select coalesce(jsonb_agg(to_jsonb(n)), '[]'::jsonb)
  into v_notifications
  from public.reservation_notifications n
  where n.reservation_id = v_reservation.id;

  return jsonb_build_object(
    'reservation', to_jsonb(v_reservation),
    'notifications', v_notifications
  );
end;
$$;

revoke all on function public.create_reservation(text, text, text, date, time without time zone, integer, integer, boolean) from public, anon, authenticated;
grant execute on function public.create_reservation(text, text, text, date, time without time zone, integer, integer, boolean) to service_role;
revoke all on function public.cancel_reservation(uuid) from public, anon, authenticated;
grant execute on function public.cancel_reservation(uuid) to service_role;
revoke all on function public.consume_api_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, integer, integer) to service_role;
