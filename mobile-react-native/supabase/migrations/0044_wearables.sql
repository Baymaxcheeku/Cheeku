-- Wearables: one summary row per family member per day (wearables module).
--
-- WHAT IS STORED. Daily totals and readings the person's own phone or watch
-- already holds: steps, distance, active energy, sleep, resting heart rate,
-- HRV, SpO2, weight, blood pressure, blood sugar and up to a dozen workouts.
-- Never the raw minute-by-minute samples. One row per member per day, so a
-- year of history is 365 small rows, and a re-sync just overwrites the day.
--
-- WHO WRITES IT. The app, as the signed-in person, after reading Apple Health
-- or Health Connect on the phone. Google Health (Fitbit, Pixel Watch) comes
-- through the wearables-google Edge Function and lands here the same way.
-- Sample data shown in Expo Go or on the web is never written.
--
-- PLUG AND PLAY. Nothing else in the database reads this table. Removing the
-- wearables module from the app leaves it here, unused and harmless.

create table if not exists wearable_days (
  user_id uuid not null default auth.uid () references auth.users (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  day date not null check (day > date '2024-01-01'),
  steps integer check (steps is null or (steps >= 0 and steps < 200000)),
  distance_km numeric check (distance_km is null or (distance_km >= 0 and distance_km < 500)),
  active_kcal numeric check (active_kcal is null or (active_kcal >= 0 and active_kcal < 20000)),
  sleep_minutes integer check (sleep_minutes is null or (sleep_minutes >= 0 and sleep_minutes <= 1440)),
  resting_hr numeric check (resting_hr is null or (resting_hr > 15 and resting_hr < 250)),
  hrv_ms numeric check (hrv_ms is null or (hrv_ms > 0 and hrv_ms < 500)),
  spo2 numeric check (spo2 is null or (spo2 >= 50 and spo2 <= 100)),
  weight_kg numeric check (weight_kg is null or (weight_kg > 1 and weight_kg < 400)),
  systolic numeric check (systolic is null or (systolic > 40 and systolic < 300)),
  diastolic numeric check (diastolic is null or (diastolic > 20 and diastolic < 200)),
  glucose_mg_dl numeric check (glucose_mg_dl is null or (glucose_mg_dl > 10 and glucose_mg_dl < 1000)),
  -- [{ "type": "running", "start": "...", "minutes": 32, "kcal": 310, "km": 5.1 }]
  workouts jsonb not null default '[]' check (jsonb_typeof(workouts) = 'array' and jsonb_array_length(workouts) <= 12 and pg_column_size(workouts) <= 6000),
  sources text[] not null default '{}' check (
    cardinality(sources) <= 6
    and sources <@ array['apple_health', 'health_connect', 'google_health', 'strava']::text[]
  ),
  updated_at timestamptz not null default now(),
  primary key (profile_id, day)
);

create index if not exists wearable_days_user_day_idx on wearable_days (user_id, day desc);

alter table wearable_days enable row level security;

drop policy if exists "users manage own wearable days" on wearable_days;
create policy "users manage own wearable days" on wearable_days for all
  using (auth.uid () = user_id)
  with check (auth.uid () = user_id and exists (select 1 from profiles p where p.id = profile_id and p.user_id = auth.uid ()));

create or replace function wearable_days_touch () returns trigger
language plpgsql
set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists wearable_days_touch_trigger on wearable_days;
create trigger wearable_days_touch_trigger before insert or update on wearable_days for each row execute function wearable_days_touch ();

revoke execute on function wearable_days_touch () from public, anon, authenticated;

grant select, insert, update, delete on wearable_days to authenticated;

-- ------------------------------------------------- Google Health sign-in --
--
-- The refresh token Google hands back, and the short-lived "state" that ties
-- a consent screen to the account that opened it. Row-level security is on
-- and there are NO policies, so the app can never read or write either
-- table. Only the wearables-google Edge Function touches them, with the
-- service key that lives on the server.

create table if not exists wearable_links (
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('google_health')),
  refresh_token text not null check (char_length(refresh_token) <= 2000),
  scopes text not null default '' check (char_length(scopes) <= 1000),
  created_at timestamptz not null default now(),
  primary key (user_id, provider)
);

alter table wearable_links enable row level security;
revoke all on wearable_links from anon, authenticated;

create table if not exists wearable_link_states (
  state text primary key check (char_length(state) between 32 and 128),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('google_health')),
  return_to text not null check (return_to like 'cheekuai://%' and char_length(return_to) <= 200),
  created_at timestamptz not null default now()
);

alter table wearable_link_states enable row level security;
revoke all on wearable_link_states from anon, authenticated;
