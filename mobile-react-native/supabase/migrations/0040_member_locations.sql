-- Where each family member is, kept on the server (loc-live).
--
-- Until now a place lived only on the phone (fitness, 0039) and nothing else
-- knew it: Profile could not show it, labs could not fill in the collection
-- address, and every screen asked again. This adds:
--
--   1. member_locations: one current place per family member. The account
--      holder's comes from the phone (GPS, while the app is open); anyone's
--      can be set by searching a place or picking a city ("Papa lives in
--      Lucknow"). Read own rows only; written only through the functions.
--   2. set_member_location(): validates, rounds to 4 decimals (about 11 m),
--      skips a fix that has not really moved, caps writes per day, and fills
--      in the address the geo function looked up.
--   3. forget_member_location(): one member or all of them. Account deletion
--      cascades through auth.users like everything else.
--   4. geo_cache and geo_quota for the geo Edge Function: answers cached by
--      rounded point or by query for 30 days, and a daily call cap per user,
--      so a free geocoding tier is never burned by one phone. Deny-all:
--      only the function (service role) reads or writes them.
--
-- PRIVACY. Location is personal data. It is saved only after the person
-- taps "Use my location" on our own card (which says it is saved to their
-- account), can be turned off and wiped from Profile, and is never sent to a
-- partner: a booking carries the studio's or the address the person typed.
-- No history is kept, only the latest place per member.

-- --------------------------------------------- the privacy policy, again --
--
-- The policy said "we do not collect precise location". It now says we do,
-- only when allowed. That widens what is collected, so the new version is
-- material: every signed-in person agrees again once, on their next open
-- (src/lib/legal/documents.ts holds the same text and hash).

insert into legal_documents (kind, version, effective_on, material, summary, text_sha256) values
  ('privacy', '2026-10-25', '2026-10-25', true,
   'We collect what Cheeku needs to keep your family''s health records and answer your questions, and nothing for advertising. We never sell your data, and you can see, correct, export or delete it at any time.',
   '4102c77321e9586f8b997bc162b52e60ba8b9b7884e5bdf953749d54425938da')
on conflict (kind, version) do nothing;

-- --------------------------------------------------------------- helpers --

-- Great-circle distance in km.
create or replace function geo_km (a_lat double precision, a_lng double precision, b_lat double precision, b_lng double precision) returns double precision
immutable
set
  search_path = public as $$
  select 2 * 6371 * asin(least(1, sqrt(
    power(sin(radians(b_lat - a_lat) / 2), 2)
    + cos(radians(a_lat)) * cos(radians(b_lat)) * power(sin(radians(b_lng - a_lng) / 2), 2)
  )));
$$ language sql;

grant execute on function geo_km (double precision, double precision, double precision, double precision) to authenticated;

-- A short text field from the looked-up place, trimmed and capped.
create or replace function geo_text (p_place jsonb, p_key text, p_max int) returns text
immutable
set
  search_path = public as $$
  select nullif(left(trim(regexp_replace(coalesce(p_place ->> p_key, ''), '[[:cntrl:]]', '', 'g')), p_max), '');
$$ language sql;

-- ------------------------------------------------------------- the table --

create table if not exists member_locations (
  profile_id uuid primary key references profiles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  accuracy_m int check (accuracy_m between 0 and 100000),
  label text check (char_length(label) <= 80),
  locality text check (char_length(locality) <= 60),
  city text check (char_length(city) <= 60),
  district text check (char_length(district) <= 60),
  state text check (char_length(state) <= 60),
  pincode text check (pincode ~ '^[1-9][0-9]{5}$'),
  country_code text check (country_code ~ '^[A-Z]{2}$'),
  formatted text check (char_length(formatted) <= 200),
  source text not null check (source in ('gps', 'search', 'city', 'manual')),
  provider text not null default 'none' check (provider in ('ola', 'osm', 'device', 'none')),
  captured_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  write_day date not null default current_date,
  write_count int not null default 0
);

create index if not exists member_locations_user_idx on member_locations (user_id);

alter table member_locations enable row level security;

drop policy if exists "users read own member locations" on member_locations;

create policy "users read own member locations" on member_locations for select using (auth.uid() = user_id);

-- ------------------------------------------------------------- functions --

-- Saves a member's place. Returns { saved, reason }: reason is 'saved',
-- 'unchanged' (moved under 100 m within 2 minutes) or 'limit'.
create or replace function set_member_location (
  p_profile uuid,
  p_lat double precision,
  p_lng double precision,
  p_accuracy int default null,
  p_source text default 'gps',
  p_place jsonb default '{}'::jsonb
) returns jsonb
security definer
set
  search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_old member_locations;
  v_lat double precision := round(p_lat::numeric, 4)::double precision;
  v_lng double precision := round(p_lng::numeric, 4)::double precision;
  v_place jsonb := case when jsonb_typeof(p_place) = 'object' then p_place else '{}'::jsonb end;
  v_pin text := regexp_replace(coalesce(p_place ->> 'pincode', ''), '\s', '', 'g');
  v_cc text := upper(left(coalesce(p_place ->> 'countryCode', ''), 2));
  v_provider text := coalesce(nullif(p_place ->> 'provider', ''), 'none');
begin
  if v_user is null then
    raise exception 'not signed in' using errcode = 'insufficient_privilege';
  end if;
  if not has_core_consent(v_user) then
    raise exception 'agree to the required uses first' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from profiles where id = p_profile and user_id = v_user) then
    raise exception 'unknown family member' using errcode = 'check_violation';
  end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 or (abs(p_lat) < 0.001 and abs(p_lng) < 0.001) then
    raise exception 'that is not a place' using errcode = 'check_violation';
  end if;
  if p_source not in ('gps', 'search', 'city', 'manual') then
    raise exception 'unknown source' using errcode = 'check_violation';
  end if;
  if v_provider not in ('ola', 'osm', 'device', 'none') then
    v_provider := 'none';
  end if;

  select * into v_old from member_locations where profile_id = p_profile for update;

  if found then
    -- A phone in a pocket reports every few seconds: only a real move counts.
    if p_source = 'gps' and v_old.source = 'gps'
       and v_old.captured_at > now() - interval '2 minutes'
       and geo_km(v_old.lat, v_old.lng, v_lat, v_lng) < 0.1 then
      return jsonb_build_object('saved', false, 'reason', 'unchanged');
    end if;
    if v_old.write_day = current_date and v_old.write_count >= 200 then
      return jsonb_build_object('saved', false, 'reason', 'limit');
    end if;
  end if;

  insert into member_locations as m (
    profile_id, user_id, lat, lng, accuracy_m, label, locality, city, district, state, pincode,
    country_code, formatted, source, provider, captured_at, updated_at, write_day, write_count
  )
  values (
    p_profile, v_user, v_lat, v_lng,
    case when p_accuracy between 0 and 100000 then p_accuracy end,
    geo_text(v_place, 'label', 80), geo_text(v_place, 'locality', 60), geo_text(v_place, 'city', 60),
    geo_text(v_place, 'district', 60), geo_text(v_place, 'state', 60),
    case when v_pin ~ '^[1-9][0-9]{5}$' then v_pin end,
    case when v_cc ~ '^[A-Z]{2}$' then v_cc end,
    geo_text(v_place, 'formatted', 200),
    p_source, v_provider, now(), now(), current_date, 1
  )
  on conflict (profile_id) do update set
    lat = excluded.lat,
    lng = excluded.lng,
    accuracy_m = excluded.accuracy_m,
    -- A fix with no address keeps the last one only if it is still close by.
    label = coalesce(excluded.label, case when geo_km(m.lat, m.lng, excluded.lat, excluded.lng) < 0.5 then m.label end),
    locality = coalesce(excluded.locality, case when geo_km(m.lat, m.lng, excluded.lat, excluded.lng) < 0.5 then m.locality end),
    city = coalesce(excluded.city, case when geo_km(m.lat, m.lng, excluded.lat, excluded.lng) < 5 then m.city end),
    district = coalesce(excluded.district, case when geo_km(m.lat, m.lng, excluded.lat, excluded.lng) < 5 then m.district end),
    state = coalesce(excluded.state, case when geo_km(m.lat, m.lng, excluded.lat, excluded.lng) < 50 then m.state end),
    pincode = coalesce(excluded.pincode, case when geo_km(m.lat, m.lng, excluded.lat, excluded.lng) < 0.5 then m.pincode end),
    country_code = coalesce(excluded.country_code, m.country_code),
    formatted = coalesce(excluded.formatted, case when geo_km(m.lat, m.lng, excluded.lat, excluded.lng) < 0.5 then m.formatted end),
    source = excluded.source,
    provider = case when excluded.provider = 'none' and geo_km(m.lat, m.lng, excluded.lat, excluded.lng) < 0.5 then m.provider else excluded.provider end,
    captured_at = now(),
    updated_at = now(),
    write_day = current_date,
    write_count = case when m.write_day = current_date then m.write_count + 1 else 1 end;

  return jsonb_build_object('saved', true, 'reason', 'saved');
end;
$$ language plpgsql;

revoke execute on function set_member_location (uuid, double precision, double precision, int, text, jsonb) from public, anon;
grant execute on function set_member_location (uuid, double precision, double precision, int, text, jsonb) to authenticated;

-- One member, or everyone on the account when p_profile is null.
create or replace function forget_member_location (p_profile uuid default null) returns int
security definer
set
  search_path = public as $$
declare
  v_n int;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = 'insufficient_privilege';
  end if;
  delete from member_locations where user_id = auth.uid() and (p_profile is null or profile_id = p_profile);
  get diagnostics v_n = row_count;
  return v_n;
end;
$$ language plpgsql;

revoke execute on function forget_member_location (uuid) from public, anon;
grant execute on function forget_member_location (uuid) to authenticated;

-- ------------------------------------------- the geo function's own tables --

create table if not exists geo_cache (
  key text primary key check (char_length(key) between 3 and 200),
  place jsonb not null,
  provider text not null,
  hits int not null default 0,
  created_at timestamptz not null default now()
);

alter table geo_cache enable row level security;

create table if not exists geo_quota (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default current_date,
  calls int not null default 0,
  primary key (user_id, day)
);

alter table geo_quota enable row level security;

-- Counts one call and says whether it is within the day's cap. Service role only.
create or replace function geo_take_quota (p_user uuid, p_limit int default 300) returns boolean
security definer
set
  search_path = public as $$
declare
  v_calls int;
begin
  insert into geo_quota as q (user_id, day, calls) values (p_user, current_date, 1)
  on conflict (user_id, day) do update set calls = q.calls + 1
  returning calls into v_calls;
  return v_calls <= p_limit;
end;
$$ language plpgsql;

revoke execute on function geo_take_quota (uuid, int) from public, anon, authenticated;

-- Old cache rows and old quota days. Called by the function now and then.
create or replace function geo_prune () returns void
security definer
set
  search_path = public as $$
  delete from geo_cache where created_at < now() - interval '30 days';
  delete from geo_quota where day < current_date - 7;
$$ language sql;

revoke execute on function geo_prune () from public, anon, authenticated;
