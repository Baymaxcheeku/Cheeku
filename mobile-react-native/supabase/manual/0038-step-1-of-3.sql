-- 0038 step 1 of 3. Family care: six new notification kinds, profiles.care_plan
-- and run_care_sweep(). Paste into the Supabase SQL editor and Run. Safe to run
-- again. Then step 2 (the schedule), step 3 (the push webhook), then
-- 0038-check.sql.

begin;

-- Family care: parent alerts and nudges sent from the server.
--
-- Until now every reminder was planned on the phone (engage.ts). That covers
-- anyone who opened the app in the last two days, and nobody else. It also
-- cannot tell the account holder that Papa's evening doses are still not
-- ticked, because only the server sees ticks made on every phone. This adds:
--
--   1. six notification kinds in three new shelves: medicines (dose_due,
--      refill_due), nudges (daily_nudge, retest_due, sunday_review) and care
--      (parent_alert)
--   2. profiles.care_plan: the dose plan each phone already works out
--      (slots, times, which medicines, when a strip runs out), written back
--      so the server can check it. Medicine keys only, never a name.
--   3. run_care_sweep(): every 15 minutes, compares the plan with what was
--      ticked, and writes inbox rows. push-dispatch decides what buzzes.
--   4. a pg_cron job that runs it, when pg_cron is available.
--
-- WHO GETS WHAT
--   parent_alert   the account holder, about a family member: doses not
--                  ticked 90 minutes after their time, a strip with three
--                  days or fewer left, or two days with no doses ticked.
--                  Only for members who are actually being tracked (a dose
--                  ticked in the last two days), so a parent nobody ticks
--                  for is not an alert every few hours.
--   dose_due, refill_due, daily_nudge, sunday_review
--                  only for accounts nobody has opened in 36 hours. A phone
--                  that is in use already plans these itself; the server
--                  takes over when it goes quiet, then stops after two weeks.
--   retest_due     a test or follow-up due within three days or overdue,
--                  once a week each, always in the inbox; it buzzes only for
--                  a family member's item or an account gone quiet.
--
-- TIME. Every local time is India time (Asia/Kolkata): the app is India-only.
-- Nothing is sent between 22:45 and 07:30.
--
-- WORDS. No medicine, condition or reading is ever named in a title or body
-- (content system rules). A family member is named by name, as everywhere
-- else in the inbox. Test titles appear in the inbox like the records list
-- already shows them; push-dispatch replaces them with a generic line.

-- --------------------------------------------------------------- 1. kinds --

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
    'parent_alert'
  )
);

-- Postgres cannot change a generated column in place (see 0025, 0027).
alter table notifications drop column if exists category;

alter table notifications
add column category text generated always as (
  case
    when kind like 'report\_%' then 'reports'
    when kind like 'appointment\_%' or kind like 'lab\_%' then 'appointments'
    when kind in ('family_added', 'family_removed') then 'family'
    when kind in ('plan_changed', 'plan_ended', 'password_changed', 'support_update') then 'account'
    when kind in ('dose_due', 'refill_due') then 'medicines'
    when kind in ('daily_nudge', 'retest_due', 'sunday_review') then 'nudges'
    when kind = 'parent_alert' then 'care'
    else 'updates'
  end
) stored;

-- ----------------------------------------------------------- 2. care plan --
--
-- Written by the app (src/lib/care/plan.ts), read only by the sweep:
--   { "v": 1,
--     "slots":   [{ "slot": "morning", "time": "08:00", "keys": ["telma_40"] }],
--     "refills": [{ "key": "telma_40", "last": "2026-10-28" }],
--     "remind":  true,      dose reminders for this member
--     "alerts":  true }     tell the account holder about this member
-- Keys are the ledger's ([a-z0-9_]), never a medicine's name.

alter table profiles add column if not exists care_plan jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_care_plan_check') then
    alter table profiles add constraint profiles_care_plan_check
      check (jsonb_typeof(care_plan) = 'object' and pg_column_size(care_plan) <= 2000);
  end if;
end $$;

-- ------------------------------------------------------------- 3. helpers --

-- When the account was last in use: the phone checking in (register_push_device
-- runs on every launch), or anything ticked or logged.
create or replace function account_active_at (p_user uuid) returns timestamptz
stable
set
  search_path = public as $$
  select greatest(
    (select max(last_seen_at) from push_devices where user_id = p_user),
    (select max(created_at) from today_actions where user_id = p_user),
    (select max(created_at) from daily_logs where user_id = p_user)
  );
$$ language sql;

revoke execute on function account_active_at (uuid) from public, anon, authenticated;

-- A family member in a title: first name only, at most 10 characters, so
-- every title stays inside the content system's 40.
create or replace function care_name (p_name text) returns text
immutable
set
  search_path = public as $$
  select left(split_part(trim(p_name), ' ', 1), 10);
$$ language sql;

-- "HbA1c retest" keeps its case; "Kidney function test" reads "kidney
-- function test" after "Ma's".
create or replace function care_lower_first (p_text text) returns text
immutable
set
  search_path = public as $$
  select case when split_part(p_text, ' ', 1) ~ '^[A-Z][a-z]+$' then lower(left(p_text, 1)) || substr(p_text, 2) else p_text end;
$$ language sql;

-- "08:00" to minutes after midnight; null for anything else.
create or replace function care_minutes (p_time text) returns integer
immutable
set
  search_path = public as $$
  select case
    when p_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      then split_part(p_time, ':', 1)::int * 60 + split_part(p_time, ':', 2)::int
  end;
$$ language sql;

-- ---------------------------------------------------------------- 4. sweep --

create or replace function run_care_sweep (p_now timestamptz default now()) returns jsonb
security definer
set
  search_path = public as $$
declare
  v_local timestamp := p_now at time zone 'Asia/Kolkata';
  v_day date := (p_now at time zone 'Asia/Kolkata')::date;
  v_min int := extract(hour from (p_now at time zone 'Asia/Kolkata'))::int * 60
             + extract(minute from (p_now at time zone 'Asia/Kolkata'))::int;
  v_awake boolean;
  v_sent int := 0;
  v_before int;
  r record;
  s jsonb;
  f jsonb;
  v_slot text;
  v_time int;
  v_keys text[];
  v_taken int;
  v_last date;
  v_left int;
  v_tracked boolean;
  v_quiet_for int;
  v_title text;
begin
  -- Nobody is woken: nothing between 22:45 and 07:30.
  v_awake := v_min >= 7 * 60 + 30 and v_min < 22 * 60 + 45;
  if not v_awake then
    return jsonb_build_object('sent', 0, 'awake', false, 'local', v_local);
  end if;

  select count(*) into v_before from notifications;

  for r in
    select
      p.id, p.user_id, p.name, p.is_primary, p.care_plan,
      coalesce((p.care_plan ->> 'remind')::boolean, true) as remind,
      coalesce((p.care_plan ->> 'alerts')::boolean, true) as alerts,
      (p_now - coalesce(account_active_at(p.user_id), '-infinity'::timestamptz)) > interval '36 hours' as away,
      exists (
        select 1 from today_actions t
        where t.profile_id = p.id and t.status = 'done' and t.step_key like 'dose:%'
          and t.day >= v_day - 1
      ) as tracked_now,
      exists (
        select 1 from today_actions t
        where t.profile_id = p.id and t.status = 'done' and t.step_key like 'dose:%'
          and t.day between v_day - 7 and v_day - 2
      ) as tracked_before
    from profiles p
    where jsonb_typeof(p.care_plan -> 'slots') = 'array'
      and has_core_consent(p.user_id)
      and p.id in (select covered_profile_ids(p.user_id))
  loop
    -- Doses, slot by slot.
    for s in select * from jsonb_array_elements(r.care_plan -> 'slots') loop
      v_slot := s ->> 'slot';
      v_time := care_minutes(s ->> 'time');
      continue when v_slot not in ('morning', 'afternoon', 'night') or v_time is null;
      select coalesce(array_agg(k), '{}') into v_keys
      from jsonb_array_elements_text(coalesce(s -> 'keys', '[]'::jsonb)) k
      where k ~ '^[a-z0-9_]{1,60}$';
      continue when cardinality(v_keys) = 0;

      select count(*) into v_taken
      from today_actions t
      where t.profile_id = r.id and t.day = v_day and t.status = 'done'
        and t.step_key = any (select 'dose:' || left(k, 80 - 6 - length(v_slot)) || ':' || v_slot from unnest(v_keys) k);
      continue when v_taken >= cardinality(v_keys);

      -- Their own dose, when nobody has opened the app in a day and a half.
      if r.is_primary and r.remind and r.away and v_min >= v_time and v_min < v_time + 60 then
        perform notify_user(
          r.user_id, r.id, null, 'dose_due',
          'Time for your ' || v_slot || ' medicines',
          case when cardinality(v_keys) = 1 then '1 dose. Tap to tick it off once it''s in.'
               else cardinality(v_keys) || ' doses. Tap to tick them off once they''re in.' end,
          '/medicines',
          'dose:' || r.id || ':' || v_day || ':' || v_slot,
          jsonb_build_object('slot', v_slot)
        );
      end if;

      -- A family member's, 90 minutes on, while they are being tracked.
      if not r.is_primary and r.alerts and r.tracked_now
         and v_min >= v_time + 90 and v_min < v_time + 360 then
        perform notify_user(
          r.user_id, r.id, null, 'parent_alert',
          care_name(r.name) || ' hasn''t ticked ' || v_slot || ' doses',
          'It''s been over an hour. A quick call might help.',
          '/care',
          'care:dose:' || r.id || ':' || v_day || ':' || v_slot,
          jsonb_build_object('reason', 'missed_dose', 'slot', v_slot, 'missing', cardinality(v_keys) - v_taken)
        );
      end if;
    end loop;

    -- Two days and nothing ticked, after a week of ticking: worth a call.
    if not r.is_primary and r.alerts and not r.tracked_now and r.tracked_before and v_min >= 11 * 60 then
      perform notify_user(
        r.user_id, r.id, null, 'parent_alert',
        'No doses ticked for ' || care_name(r.name) || ' in 2 days',
        'Worth a quick call to check in.',
        '/care',
        'care:quiet:' || r.id || ':' || ((v_day - date '2026-01-01') / 3),
        jsonb_build_object('reason', 'quiet')
      );
    end if;

    -- Strips running low: three days or fewer left.
    if jsonb_typeof(r.care_plan -> 'refills') = 'array' and v_min >= 10 * 60 then
      for f in select * from jsonb_array_elements(r.care_plan -> 'refills') loop
        continue when (f ->> 'key') !~ '^[a-z0-9_]{1,60}$' or (f ->> 'last') !~ '^\d{4}-\d{2}-\d{2}$';
        v_last := (f ->> 'last')::date;
        v_left := v_last - v_day + 1;
        continue when v_left < 0 or v_left > 3;
        if r.is_primary and r.remind and r.away then
          perform notify_user(
            r.user_id, r.id, null, 'refill_due',
            case when v_left = 0 then 'One of your medicines ran out' else 'A medicine is running low' end,
            case when v_left = 0 then 'Tap to refill it today.'
                 else 'About ' || v_left || ' day' || case when v_left = 1 then '' else 's' end || ' left. Tap to refill before it runs out.' end,
            '/medicines',
            'refill:' || r.id || ':' || (f ->> 'key') || ':' || v_last,
            '{}'::jsonb
          );
        elsif not r.is_primary and r.alerts then
          perform notify_user(
            r.user_id, r.id, null, 'parent_alert',
            care_name(r.name) || '''s medicine is running low',
            case when v_left = 0 then 'It ran out today. Tap to order a refill.'
                 else 'About ' || v_left || ' day' || case when v_left = 1 then '' else 's' end || ' left. Tap to order a refill.' end,
            '/care',
            'care:refill:' || r.id || ':' || (f ->> 'key') || ':' || v_last,
            jsonb_build_object('reason', 'refill', 'days', v_left)
          );
        end if;
      end loop;
    end if;
  end loop;

  -- Accounts gone quiet: one nudge on days 2, 3, 5, 8 and 13, then silence.
  -- Only people who have used Today at least once.
  if v_min >= 9 * 60 and v_min < 10 * 60 then
    for r in
      select p.user_id, p.id, (v_day - (account_active_at(p.user_id) at time zone 'Asia/Kolkata')::date) as days
      from profiles p
      where p.is_primary
        and has_core_consent(p.user_id)
        and exists (select 1 from today_actions t where t.user_id = p.user_id)
    loop
      continue when r.days is null or r.days not in (2, 3, 5, 8, 13);
      perform notify_user(
        r.user_id, r.id, null, 'daily_nudge',
        'Your 3 for today are ready',
        'Two minutes each. A fresh start is one tap away.',
        '/today',
        'nudge:' || v_day,
        jsonb_build_object('away_days', r.days)
      );
    end loop;
  end if;

  -- Sunday evening, for accounts quiet for a day and a half but not three weeks.
  if extract(isodow from v_local) = 7 and v_min >= 18 * 60 and v_min < 19 * 60 then
    for r in
      select p.user_id, p.id
      from profiles p
      where p.is_primary
        and has_core_consent(p.user_id)
        and exists (select 1 from today_actions t where t.user_id = p.user_id)
        and (p_now - coalesce(account_active_at(p.user_id), '-infinity'::timestamptz)) between interval '36 hours' and interval '21 days'
    loop
      perform notify_user(
        r.user_id, r.id, null, 'sunday_review',
        'A new week starts tomorrow',
        'Two minutes now: see what''s due and pick this week''s focus.',
        '/today',
        'sunday:' || v_day,
        '{}'::jsonb
      );
    end loop;
  end if;

  -- Tests and follow-ups due within three days, or up to a month overdue,
  -- once a week each.
  if v_min >= 10 * 60 then
    for r in
      select l.id, l.user_id, l.profile_id, l.title, l.due_by, p.name, p.is_primary,
        (p_now - coalesce(account_active_at(l.user_id), '-infinity'::timestamptz)) > interval '36 hours' as away
      from open_loops l
      join profiles p on p.id = l.profile_id
      where l.status = 'open'
        and l.type in ('test_ordered', 'followup_due', 'vaccine_due')
        and l.due_by between v_day - 30 and v_day + 3
        and has_core_consent(l.user_id)
        and l.profile_id in (select covered_profile_ids(l.user_id))
    loop
      v_title := case when r.is_primary then 'Your ' else care_name(r.name) || '''s ' end || care_lower_first(r.title)
        || case when r.due_by < v_day then ' is overdue' when r.due_by = v_day then ' is due today' else ' is due soon' end;
      perform notify_user(
        r.user_id, r.profile_id, null, 'retest_due',
        v_title,
        'Tap to plan it. Two minutes now saves a scramble later.',
        case when r.is_primary then '/today' else '/care' end,
        'due:' || r.id || ':' || to_char(v_day, 'IYYY-IW'),
        -- A phone in use already shows what is due; the inbox keeps the row,
        -- the buzz is saved for a family member's item or a quiet account.
        jsonb_build_object('quiet', r.is_primary and not r.away)
      );
    end loop;
  end if;

  select count(*) - v_before into v_sent from notifications;
  return jsonb_build_object('sent', v_sent, 'awake', true, 'local', v_local);
end;
$$ language plpgsql;

revoke execute on function run_care_sweep (timestamptz) from public, anon, authenticated;

commit;
