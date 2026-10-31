-- Fitness sessions: book a class at a partner gym or studio (loop-fitness).
--
-- A partner network sells single sessions to Cheeku at a base price; Cheeku
-- adds its markup and sells them on. Until the partner's master API is
-- connected (int-fitness), the app books against a preview network of sample
-- studios (src/lib/fitness/provider.ts) and records the booking here, so the
-- whole flow, the inbox and the reminders work end to end. This adds:
--
--   1. app_config 'fitness_pricing': the markup rule, { pct, min }. The app
--      shows the same rule; the price written here is always the server's.
--   2. fitness_bookings: one row per booked class. Read only from the app;
--      every write goes through the two functions below.
--   3. create_fitness_booking() and cancel_fitness_booking().
--   4. two notification kinds, fitness_booked and fitness_cancelled, on the
--      appointments shelf (they buzz under "Appointment reminders").
--
-- WORDS. Titles stay inside 40 with the longest activity and a 10-letter
-- name; bodies inside 90 with the studio cut to 28. The lock screen shows
-- push-dispatch's generic appointment line, so "Prenatal yoga" never shows
-- on a locked phone.
--
-- WHAT IS STORED. The studio and session as they were when booked (a snapshot,
-- so the booking still reads right if the partner renames a studio), the
-- price split, the check-in code and the short reason the app showed. Never a
-- condition or reading: matching happens on the phone (match.ts), and the
-- reason is the card's own line ("Low impact, kind to knees").
--
-- WHEN THE PARTNER API ARRIVES the booking call to the partner moves into an
-- Edge Function that calls this function's checks first; provider changes
-- from 'preview' to the partner's id and nothing on the phone changes.

-- ------------------------------------------------------------- 1. pricing --

insert into app_config (key, value, note)
values (
  'fitness_pricing',
  '{"pct": 15, "min": 25}'::jsonb,
  'Markup on a partner session: pct percent of the base price, at least min rupees; the total rounds up to the next 10. Mirrored in src/lib/fitness/catalog.ts (MARKUP).'
)
on conflict (key) do nothing;

-- ------------------------------------------------------------ 2. bookings --

create table if not exists fitness_bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  provider text not null default 'preview' check (provider ~ '^[a-z0-9_]{2,24}$'),
  provider_ref text not null check (char_length(provider_ref) between 3 and 64),
  studio_id text not null check (char_length(studio_id) between 1 and 64),
  studio_name text not null check (char_length(studio_name) between 2 and 60),
  area text check (char_length(area) <= 60),
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  activity text not null check (
    activity in ('gym', 'yoga', 'zumba', 'swimming', 'dance', 'pilates', 'functional', 'hiit', 'aerobics', 'kickboxing', 'prenatal_yoga', 'meditation', 'aqua')
  ),
  session_title text not null check (char_length(session_title) between 2 and 60),
  starts_at timestamptz not null,
  duration_min int not null check (duration_min between 15 and 180),
  base_price int not null check (base_price between 0 and 5000),
  markup int not null check (markup >= 0),
  price int not null check (price >= 0),
  status text not null default 'booked' check (status in ('booked', 'checked_in', 'attended', 'cancelled', 'missed')),
  checkin_code text not null check (checkin_code ~ '^[A-Z0-9]{4,10}$'),
  reason text check (char_length(reason) <= 36),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);

create index if not exists fitness_bookings_user_idx on fitness_bookings (user_id, starts_at desc);

-- One live booking per member per start time.
create unique index if not exists fitness_bookings_one_slot on fitness_bookings (profile_id, starts_at)
where
  status <> 'cancelled';

alter table fitness_bookings enable row level security;

drop policy if exists "users read own fitness bookings" on fitness_bookings;

create policy "users read own fitness bookings" on fitness_bookings for select using (auth.uid() = user_id);

-- ------------------------------------------------------------- 3. kinds --

alter table notifications drop constraint if exists notifications_kind_check;

alter table notifications
add constraint notifications_kind_check check (
  kind in (
    'report_ready', 'report_review', 'report_flagged',
    'appointment_booked', 'appointment_rescheduled', 'appointment_cancelled',
    'lab_booked', 'lab_update', 'lab_cancelled',
    'family_added', 'family_removed',
    'plan_changed', 'plan_ended', 'password_changed', 'support_update',
    'service_live', 'welcome',
    'dose_due', 'refill_due',
    'daily_nudge', 'retest_due', 'sunday_review',
    'parent_alert',
    'fitness_booked', 'fitness_cancelled'
  )
);

-- Postgres cannot change a generated column in place (see 0025, 0027, 0038).
alter table notifications drop column if exists category;

alter table notifications
add column category text generated always as (
  case
    when kind like 'report\_%' then 'reports'
    when kind like 'appointment\_%' or kind like 'lab\_%' or kind like 'fitness\_%' then 'appointments'
    when kind in ('family_added', 'family_removed') then 'family'
    when kind in ('plan_changed', 'plan_ended', 'password_changed', 'support_update') then 'account'
    when kind in ('dose_due', 'refill_due') then 'medicines'
    when kind in ('daily_nudge', 'retest_due', 'sunday_review') then 'nudges'
    when kind = 'parent_alert' then 'care'
    else 'updates'
  end
) stored;

-- ---------------------------------------------------------- 4. functions --

-- "Yoga" for 'yoga', the same labels as the app's chips.
create or replace function fitness_label (p_activity text) returns text
immutable
set
  search_path = public as $$
  select case p_activity
    when 'gym' then 'Gym' when 'yoga' then 'Yoga' when 'zumba' then 'Zumba' when 'swimming' then 'Swimming'
    when 'dance' then 'Dance' when 'pilates' then 'Pilates' when 'functional' then 'Functional'
    when 'hiit' then 'HIIT' when 'aerobics' then 'Aerobics' when 'kickboxing' then 'Kickboxing'
    when 'prenatal_yoga' then 'Prenatal yoga' when 'meditation' then 'Meditation' when 'aqua' then 'Aqua aerobics'
    else 'Fitness' end;
$$ language sql;

-- "Mon 26 Oct, 7:00 am", India time.
create or replace function fitness_when (p_at timestamptz) returns text
immutable
set
  search_path = public as $$
  select to_char(p_at at time zone 'Asia/Kolkata', 'Dy DD Mon, FMHH12:MI ') || lower(to_char(p_at at time zone 'Asia/Kolkata', 'am'));
$$ language sql;

-- The markup rule, server side. Mirrors priceFor() in catalog.ts.
create or replace function fitness_price (p_base int) returns int
stable
set
  search_path = public as $$
  select (ceil((p_base + greatest(coalesce((c.value ->> 'min')::int, 25), round(p_base * coalesce((c.value ->> 'pct')::numeric, 15) / 100)::int)) / 10.0) * 10)::int
  from (select (select value from app_config where key = 'fitness_pricing') as value) c;
$$ language sql;

create or replace function create_fitness_booking (
  p_profile uuid,
  p_provider text,
  p_provider_ref text,
  p_studio_id text,
  p_studio_name text,
  p_area text,
  p_lat double precision,
  p_lng double precision,
  p_activity text,
  p_title text,
  p_starts_at timestamptz,
  p_duration int,
  p_base_price int,
  p_checkin text,
  p_reason text default null
) returns uuid
security definer
set
  search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_price int;
  v_id uuid;
  v_name text;
  v_primary boolean;
begin
  if v_user is null then
    raise exception 'not signed in' using errcode = 'insufficient_privilege';
  end if;

  if not has_core_consent(v_user) then
    raise exception 'agree to the required uses first' using errcode = 'insufficient_privilege';
  end if;

  if not exists (select 1 from covered_profile_ids(v_user) c(id) where c.id = p_profile) then
    raise exception 'that family member is not covered by the current plan' using errcode = 'check_violation';
  end if;

  if p_starts_at < now() + interval '15 minutes' or p_starts_at > now() + interval '15 days' then
    raise exception 'pick a class in the next two weeks' using errcode = 'check_violation';
  end if;

  if p_base_price is null or p_base_price < 0 or p_base_price > 5000 then
    raise exception 'that price does not look right' using errcode = 'check_violation';
  end if;

  -- A family books a handful of classes ahead, not a season.
  if (select count(*) from fitness_bookings where user_id = v_user and status = 'booked' and starts_at > now()) >= 12 then
    raise exception 'twelve upcoming classes is the most at once' using errcode = 'check_violation';
  end if;

  if exists (
    select 1 from fitness_bookings
    where profile_id = p_profile and status <> 'cancelled'
      and tstzrange(starts_at, starts_at + make_interval(mins => duration_min)) && tstzrange(p_starts_at, p_starts_at + make_interval(mins => p_duration))
  ) then
    raise exception 'already booked into a class at that time' using errcode = 'unique_violation';
  end if;

  v_price := fitness_price(p_base_price);

  insert into fitness_bookings (
    user_id, profile_id, provider, provider_ref, studio_id, studio_name, area, lat, lng,
    activity, session_title, starts_at, duration_min, base_price, markup, price, checkin_code, reason
  )
  values (
    v_user, p_profile, coalesce(nullif(p_provider, ''), 'preview'), p_provider_ref, p_studio_id, trim(p_studio_name), nullif(trim(p_area), ''), p_lat, p_lng,
    p_activity, trim(p_title), p_starts_at, p_duration, p_base_price, v_price - p_base_price, v_price, upper(p_checkin), nullif(trim(p_reason), '')
  )
  returning id into v_id;

  select care_name(name), is_primary into v_name, v_primary from profiles where id = p_profile;

  perform notify_user(
    v_user, p_profile, null, 'fitness_booked',
    case when v_primary then 'Your ' || lower(fitness_label(p_activity)) || ' class is booked' else 'Class booked for ' || v_name end,
    case when v_primary
      then fitness_when(p_starts_at) || ' at ' || left(trim(p_studio_name), 28) || '. Show code ' || upper(p_checkin) || ' at the desk.'
      else fitness_label(p_activity) || ', ' || fitness_when(p_starts_at) || ' at ' || left(trim(p_studio_name), 28) || '. Code ' || upper(p_checkin) || '.'
    end,
    '/fitness/booking/' || v_id,
    'fitness:' || v_id || ':booked'
  );
  return v_id;
end;
$$ language plpgsql;

revoke execute on function create_fitness_booking (uuid, text, text, text, text, text, double precision, double precision, text, text, timestamptz, int, int, text, text) from public, anon;
grant execute on function create_fitness_booking (uuid, text, text, text, text, text, double precision, double precision, text, text, timestamptz, int, int, text, text) to authenticated;

-- Cancels up to an hour before the class, the partner's usual window.
create or replace function cancel_fitness_booking (p_id uuid) returns boolean
security definer
set
  search_path = public as $$
declare
  v_row fitness_bookings;
begin
  update fitness_bookings set status = 'cancelled', cancelled_at = now()
  where id = p_id and user_id = auth.uid() and status = 'booked' and starts_at > now() + interval '1 hour'
  returning * into v_row;
  if not found then
    return false;
  end if;
  perform notify_user(
    v_row.user_id, v_row.profile_id, null, 'fitness_cancelled',
    fitness_label(v_row.activity) || ' class cancelled',
    fitness_when(v_row.starts_at) || ' at ' || left(v_row.studio_name, 28) || ' is off. Nothing more to do.',
    '/fitness/booking/' || v_row.id,
    'fitness:' || v_row.id || ':cancelled'
  );
  return true;
end;
$$ language plpgsql;

revoke execute on function cancel_fitness_booking (uuid) from public, anon;
grant execute on function cancel_fitness_booking (uuid) to authenticated;

revoke execute on function fitness_price (int) from public, anon;
grant execute on function fitness_price (int) to authenticated;
