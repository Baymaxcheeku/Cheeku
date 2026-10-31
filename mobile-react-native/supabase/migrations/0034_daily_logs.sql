-- 0034: the day, logged.
--
-- Today's action plan (Home, after 0033) asks for small proofs through the
-- day: a step count with a screenshot of the watch, a photo of each meal, a
-- reading, how last night's sleep felt, a breathing session finished. This
-- is where they go.
--
--   1. daily_logs     one row per thing logged, many a day, each tied to the
--                     task it answers and the pillar it trains
--   2. daily_prefs    per-member preferences the plan reads (step goal,
--                     bedtime, vegetarian), on profiles
--   3. guards         own rows only, covered members only, consent, a daily
--                     cap, and photo keys that can only point at the
--                     member's own folder
--
-- Completion still lives in today_actions (0033): a log is the evidence, an
-- action is "done". A step count under the goal is a log without an action.
--
-- Safe to run again.

-- ----------------------------------------------------------- 1. daily_logs --

create table if not exists daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  day date not null check (day > date '2024-01-01'),
  task_key text not null check (task_key ~ '^[a-z0-9_:.-]{1,80}$'),
  pillar text not null check (pillar in ('move', 'eat', 'sleep', 'mind', 'check')),
  kind text not null check (kind in ('steps', 'meal', 'reading', 'rating', 'timer', 'habit', 'note')),
  -- Meals only: which part of the day.
  slot text check (slot is null or slot in ('breakfast', 'lunch', 'snacks', 'dinner', 'drinks')),
  value numeric check (value is null or (value >= 0 and value < 1000000)),
  value_text text check (value_text is null or char_length(value_text) <= 200),
  unit text check (unit is null or char_length(unit) <= 20),
  -- What is on the plate, tapped by the person: "roti", "fried", "sweet".
  tags text[] not null default '{}' check (cardinality(tags) <= 20),
  -- A key in the private documents bucket, never a URL, and only ever under
  -- this member's own daily folder.
  photo_path text check (
    photo_path is null
    or (photo_path like user_id::text || '/' || profile_id::text || '/daily/%' and char_length(photo_path) <= 300)
  ),
  -- Reserved for the server's reading of a photo. Not trusted from the app.
  analysis jsonb,
  created_at timestamptz not null default now()
);

create index if not exists daily_logs_profile_day_idx on daily_logs (profile_id, day desc);
create index if not exists daily_logs_user_day_idx on daily_logs (user_id, day desc);

alter table daily_logs enable row level security;

drop policy if exists "users manage own daily logs" on daily_logs;
create policy "users manage own daily logs" on daily_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and exists (select 1 from profiles p where p.id = profile_id and p.user_id = auth.uid()));

-- Analysis is written by the server only: an app write of its own is dropped.
create or replace function daily_logs_strip_analysis () returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.analysis := case when tg_op = 'UPDATE' then old.analysis else null end;
  end if;
  return new;
end;
$$;

drop trigger if exists daily_logs_strip_analysis_trigger on daily_logs;
create trigger daily_logs_strip_analysis_trigger before insert or update on daily_logs for each row
execute function daily_logs_strip_analysis ();

-- A day has a few dozen honest logs at most. A runaway client stops here.
create or replace function daily_logs_cap () returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from daily_logs where profile_id = new.profile_id and day = new.day) >= 80 then
    raise exception 'too many logs for one day' using errcode = 'P0001', hint = 'daily_cap';
  end if;
  return new;
end;
$$;

revoke execute on function daily_logs_cap () from public, anon, authenticated;

drop trigger if exists daily_logs_cap_trigger on daily_logs;
create trigger daily_logs_cap_trigger before insert on daily_logs for each row
execute function daily_logs_cap ();

-- Only members the plan covers, like every other health write (0011).
drop trigger if exists daily_logs_plan_scope_trigger on daily_logs;
create trigger daily_logs_plan_scope_trigger before insert on daily_logs for each row
execute function enforce_document_plan_scope ();

-- Consent before health data, like documents and readings (0031). Only when
-- 0031 is in.
do $$
begin
  if to_regprocedure('enforce_core_consent()') is not null then
    execute 'drop trigger if exists daily_logs_consent_guard on daily_logs';
    execute 'create trigger daily_logs_consent_guard before insert on daily_logs for each row execute function enforce_core_consent()';
  end if;
end $$;

-- ---------------------------------------------------------- 2. daily_prefs --

alter table profiles add column if not exists daily_prefs jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_daily_prefs_check') then
    alter table profiles add constraint profiles_daily_prefs_check
      check (jsonb_typeof(daily_prefs) = 'object' and pg_column_size(daily_prefs) <= 2000);
  end if;
end $$;
