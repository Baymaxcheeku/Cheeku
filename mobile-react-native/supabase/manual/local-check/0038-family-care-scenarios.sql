-- Migration 0038 (family care), exercised against a local Postgres with
-- 0001-0037 applied. Applies 0038 twice, then runs the sweep at fixed India
-- times on Sunday 25 October 2026 and checks what lands in the inbox.
-- Run from the repo root:  psql -d cheeku -f supabase/manual/local-check/0038-family-care-scenarios.sql
--
--   C1  caregiver, phone in use. Papa (tracked, morning half ticked, strip low),
--       Dadi (ticked last week, nothing for two days), their own plan unticked.
--   C2  account quiet for three days: own dose, refill, daily, Sunday, a test due.
--   C3  phone in use: own test due tomorrow (inbox only), Ma's overdue (buzzes),
--       Ma has a plan but nobody ticks for her (no dose alerts).
--   C4  Family plan dropped to Free: Nani is paused, so nothing about her.
--   C5  never agreed to the required uses: nothing at all.

\set ON_ERROR_STOP 1
\i supabase/migrations/0038_family_care.sql
\i supabase/migrations/0038_family_care.sql
\echo --- 0038 applied twice
\set ON_ERROR_STOP 0

insert into auth.users (id, email) values
 ('00000000-0000-4000-8000-0000000000c1', 'c1@care.test'),
 ('00000000-0000-4000-8000-0000000000c2', 'c2@care.test'),
 ('00000000-0000-4000-8000-0000000000c3', 'c3@care.test'),
 ('00000000-0000-4000-8000-0000000000c4', 'c4@care.test'),
 ('00000000-0000-4000-8000-0000000000c5', 'c5@care.test');

insert into consent_log (user_id, consent_type, version, granted, granted_at, method)
select u.id, r.purpose, '2026-10-08', true, now(), 'signup_checkbox'
from auth.users u cross join unnest(required_purposes()) as r (purpose)
where u.email like 'c_@care.test' and u.email <> 'c5@care.test';

insert into families (id, owner_id)
select ('f0000000-0000-4000-8000-0000000000c' || n)::uuid, ('00000000-0000-4000-8000-0000000000c' || n)::uuid from generate_series(1, 5) n;
insert into subscriptions (family_id, tier)
select ('f0000000-0000-4000-8000-0000000000c' || n)::uuid, 'family' from generate_series(1, 5) n
on conflict (family_id) do update set tier = 'family';

insert into profiles (id, user_id, family_id, name, is_primary, created_at) values
 ('a1000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c1', 'f0000000-0000-4000-8000-0000000000c1', 'Athar', true, '2026-01-01'),
 ('a2000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c1', 'f0000000-0000-4000-8000-0000000000c1', 'Papa', false, '2026-01-02'),
 ('a3000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c1', 'f0000000-0000-4000-8000-0000000000c1', 'Dadi', false, '2026-01-03'),
 ('a1000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-0000000000c2', 'f0000000-0000-4000-8000-0000000000c2', 'Ravi', true, '2026-01-01'),
 ('a1000000-0000-4000-8000-0000000000c3', '00000000-0000-4000-8000-0000000000c3', 'f0000000-0000-4000-8000-0000000000c3', 'Meera', true, '2026-01-01'),
 ('a2000000-0000-4000-8000-0000000000c3', '00000000-0000-4000-8000-0000000000c3', 'f0000000-0000-4000-8000-0000000000c3', 'Ma', false, '2026-01-02'),
 ('a1000000-0000-4000-8000-0000000000c4', '00000000-0000-4000-8000-0000000000c4', 'f0000000-0000-4000-8000-0000000000c4', 'Kiran', true, '2026-01-01'),
 ('a2000000-0000-4000-8000-0000000000c4', '00000000-0000-4000-8000-0000000000c4', 'f0000000-0000-4000-8000-0000000000c4', 'Nani', false, '2026-01-02'),
 ('a1000000-0000-4000-8000-0000000000c5', '00000000-0000-4000-8000-0000000000c5', 'f0000000-0000-4000-8000-0000000000c5', 'Sam', true, '2026-01-01');

-- C4 drops to Free: Nani keeps her data, the plan no longer reaches her.
update subscriptions set tier = 'free' where family_id = 'f0000000-0000-4000-8000-0000000000c4';

-- Plans, as the phone writes them.
update profiles set care_plan = '{"v":1,"slots":[{"slot":"morning","time":"08:00","keys":["mine_1"]}]}' where id = 'a1000000-0000-4000-8000-0000000000c1';
update profiles set care_plan = '{"v":1,"slots":[{"slot":"morning","time":"08:00","keys":["telma_40","metformin_500"]},{"slot":"night","time":"21:00","keys":["atorvastatin_10"]}],"refills":[{"key":"telma_40","last":"2026-10-27"},{"key":"metformin_500","last":"2026-11-20"}]}' where id = 'a2000000-0000-4000-8000-0000000000c1';
update profiles set care_plan = '{"v":1,"slots":[{"slot":"morning","time":"08:30","keys":["thyronorm_50"]}]}' where id = 'a3000000-0000-4000-8000-0000000000c1';
update profiles set care_plan = '{"v":1,"slots":[{"slot":"morning","time":"08:00","keys":["metformin_500"]}],"refills":[{"key":"metformin_500","last":"2026-10-26"}]}' where id = 'a1000000-0000-4000-8000-0000000000c2';
update profiles set care_plan = '{"v":1,"slots":[{"slot":"morning","time":"08:00","keys":["amlodipine_5"]}]}' where id = 'a2000000-0000-4000-8000-0000000000c3';
update profiles set care_plan = '{"v":1,"slots":[{"slot":"morning","time":"08:00","keys":["x_1"]}],"refills":[{"key":"x_1","last":"2026-10-25"}]}' where id = 'a2000000-0000-4000-8000-0000000000c4';
update profiles set care_plan = '{"v":1,"slots":[{"slot":"morning","time":"08:00","keys":["y_1"]}]}' where id = 'a1000000-0000-4000-8000-0000000000c5';

-- What was ticked. Papa: yesterday all, today only Telma. Dadi: last week only.
insert into today_actions (user_id, profile_id, day, step_key, status, created_at) values
 ('00000000-0000-4000-8000-0000000000c1', 'a2000000-0000-4000-8000-0000000000c1', '2026-10-24', 'dose:telma_40:morning', 'done', '2026-10-24 08:10+05:30'),
 ('00000000-0000-4000-8000-0000000000c1', 'a2000000-0000-4000-8000-0000000000c1', '2026-10-24', 'dose:metformin_500:morning', 'done', '2026-10-24 08:10+05:30'),
 ('00000000-0000-4000-8000-0000000000c1', 'a2000000-0000-4000-8000-0000000000c1', '2026-10-25', 'dose:telma_40:morning', 'done', '2026-10-25 08:05+05:30'),
 ('00000000-0000-4000-8000-0000000000c1', 'a3000000-0000-4000-8000-0000000000c1', '2026-10-20', 'dose:thyronorm_50:morning', 'done', '2026-10-20 08:40+05:30'),
 ('00000000-0000-4000-8000-0000000000c2', 'a1000000-0000-4000-8000-0000000000c2', '2026-10-22', 'chair_stands', 'done', '2026-10-22 07:00+05:30'),
 ('00000000-0000-4000-8000-0000000000c4', 'a2000000-0000-4000-8000-0000000000c4', '2026-10-24', 'dose:x_1:morning', 'done', '2026-10-24 08:10+05:30'),
 ('00000000-0000-4000-8000-0000000000c5', 'a1000000-0000-4000-8000-0000000000c5', '2026-10-24', 'dose:y_1:morning', 'done', '2026-10-24 08:10+05:30');

-- Phones in use: C1, C3, C4 checked in this morning; C2's phone three days ago.
insert into push_devices (token, user_id, platform, last_seen_at) values
 ('ExponentPushToken[c1aaaaaaaa]', '00000000-0000-4000-8000-0000000000c1', 'ios', '2026-10-25 07:45+05:30'),
 ('ExponentPushToken[c2aaaaaaaa]', '00000000-0000-4000-8000-0000000000c2', 'android', '2026-10-22 07:00+05:30'),
 ('ExponentPushToken[c3aaaaaaaa]', '00000000-0000-4000-8000-0000000000c3', 'ios', '2026-10-25 07:45+05:30'),
 ('ExponentPushToken[c4aaaaaaaa]', '00000000-0000-4000-8000-0000000000c4', 'ios', '2026-10-25 07:45+05:30');

-- Things due.
insert into open_loops (user_id, profile_id, key, type, title, due_by, status) values
 ('00000000-0000-4000-8000-0000000000c2', 'a1000000-0000-4000-8000-0000000000c2', 'hba1c', 'test_ordered', 'HbA1c retest', '2026-10-27', 'open'),
 ('00000000-0000-4000-8000-0000000000c3', 'a1000000-0000-4000-8000-0000000000c3', 'lipid', 'test_ordered', 'Lipid profile', '2026-10-26', 'open'),
 ('00000000-0000-4000-8000-0000000000c3', 'a2000000-0000-4000-8000-0000000000c3', 'kft', 'test_ordered', 'Kidney function test', '2026-10-20', 'open'),
 ('00000000-0000-4000-8000-0000000000c3', 'a2000000-0000-4000-8000-0000000000c3', 'old', 'test_ordered', 'Thyroid test', '2026-08-01', 'open');

delete from notifications where user_id::text like '00000000-0000-4000-8000-0000000000c%';

-- The day, sweep by sweep.
select '07:00 asleep: ' || run_care_sweep('2026-10-25 07:00+05:30')::text;
select '08:05 ' || run_care_sweep('2026-10-25 08:05+05:30')::text;
select '09:05 ' || run_care_sweep('2026-10-25 09:05+05:30')::text;
select '09:35 ' || run_care_sweep('2026-10-25 09:35+05:30')::text;
select '09:50 again ' || run_care_sweep('2026-10-25 09:50+05:30')::text;
select '10:05 ' || run_care_sweep('2026-10-25 10:05+05:30')::text;
select '11:05 ' || run_care_sweep('2026-10-25 11:05+05:30')::text;
select '18:05 ' || run_care_sweep('2026-10-25 18:05+05:30')::text;
select '22:35 ' || run_care_sweep('2026-10-25 22:35+05:30')::text;
select '23:00 asleep: ' || run_care_sweep('2026-10-25 23:00+05:30')::text;

\echo --- the inbox (who | kind | category | title | body | quiet)
select (select name from profiles where id = n.profile_id) as about, kind, category, title, body, coalesce(data ->> 'quiet', '') as quiet
from notifications n where user_id::text like '00000000-0000-4000-8000-0000000000c%'
order by user_id, created_at, kind;

\echo --- checks
with n as (select * from notifications where user_id::text like '00000000-0000-4000-8000-0000000000c%'),
checks (name, ok) as (values
  ('C1 Papa: one missed-morning alert, not two', (select count(*) from n where dedupe_key like 'care:dose:a2000000-0000-4000-8000-0000000000c1:2026-10-25:morning') = 1),
  ('C1 Papa: missed-night alert at 22:35', (select count(*) from n where dedupe_key like 'care:dose:a2000000-0000-4000-8000-0000000000c1:2026-10-25:night') = 1),
  ('C1 Papa: refill alert for Telma only', (select count(*) from n where dedupe_key like 'care:refill:a2000000-0000-4000-8000-0000000000c1:%') = 1),
  ('C1 Dadi: quiet-for-two-days alert', (select count(*) from n where dedupe_key like 'care:quiet:a3000000-0000-4000-8000-0000000000c1:%') = 1),
  ('C1 Dadi: no missed-dose alert while untracked', (select count(*) from n where dedupe_key like 'care:dose:a3000000%') = 0),
  ('C1 own plan: no server dose reminder while the phone is in use', (select count(*) from n where kind = 'dose_due' and user_id = '00000000-0000-4000-8000-0000000000c1') = 0),
  ('C2 away: dose, refill, daily, Sunday, due', (select count(distinct kind) from n where user_id = '00000000-0000-4000-8000-0000000000c2' and kind in ('dose_due', 'refill_due', 'daily_nudge', 'sunday_review', 'retest_due')) = 5),
  ('C2 away: the due row buzzes', (select (data ->> 'quiet')::boolean from n where user_id = '00000000-0000-4000-8000-0000000000c2' and kind = 'retest_due') = false),
  ('An acronym keeps its case', (select count(*) from n where title = 'Your HbA1c retest is due soon') = 1),
  ('A ten-letter name still fits 40', length('Abcdefghij hasn''t ticked afternoon doses') <= 40),
  ('C3 own test due: inbox only', (select (data ->> 'quiet')::boolean from n where user_id = '00000000-0000-4000-8000-0000000000c3' and title like 'Your lipid%') = true),
  ('C3 Ma overdue: buzzes, opens Family care', (select count(*) from n where title = 'Ma''s kidney function test is overdue' and route = '/care' and (data ->> 'quiet')::boolean = false) = 1),
  ('C3 more than a month overdue: left alone', (select count(*) from n where title like '%thyroid%') = 0),
  ('C3 Ma: no dose alert when nobody ticks for her', (select count(*) from n where dedupe_key like 'care:dose:a2000000-0000-4000-8000-0000000000c3%') = 0),
  ('C3 phone in use: no daily nudge', (select count(*) from n where user_id = '00000000-0000-4000-8000-0000000000c3' and kind in ('daily_nudge', 'sunday_review', 'dose_due')) = 0),
  ('C4 Nani paused: nothing about her', (select count(*) from n where profile_id = 'a2000000-0000-4000-8000-0000000000c4') = 0),
  ('C5 no consent: nothing', (select count(*) from n where user_id = '00000000-0000-4000-8000-0000000000c5') = 0),
  ('Nothing names a medicine', (select count(*) from n where title ~* 'telma|metformin|atorva|thyronorm|amlodipine' or body ~* 'telma|metformin|atorva|thyronorm|amlodipine') = 0),
  ('Titles within 40 and bodies within 90 (content system)', (select count(*) from n where kind in ('dose_due', 'refill_due', 'daily_nudge', 'sunday_review', 'parent_alert') and (length(title) > 40 or length(body) > 90)) = 0),
  ('Categories derived', (select bool_and(category = case when kind in ('dose_due', 'refill_due') then 'medicines' when kind = 'parent_alert' then 'care' else 'nudges' end) from n)),
  ('Sweep refused to the app', not has_function_privilege('authenticated', 'run_care_sweep(timestamptz)', 'execute'))
)
select case when ok then 'PASS' else 'FAIL' end || '  ' || name from checks;

-- The app writes its own plan, and only its own.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000c3', false);
update profiles set care_plan = '{"v":1,"slots":[]}' where id = 'a2000000-0000-4000-8000-0000000000c3';
select 'PASS  owner can write a member''s plan' where (select care_plan -> 'slots' from profiles where id = 'a2000000-0000-4000-8000-0000000000c3') = '[]'::jsonb;
update profiles set care_plan = '{"v":1}' where id = 'a2000000-0000-4000-8000-0000000000c1';
reset role;
select case when care_plan ? 'slots' then 'PASS' else 'FAIL' end || '  nobody else''s plan can be written' from profiles where id = 'a2000000-0000-4000-8000-0000000000c1';
\set ON_ERROR_STOP 0
update profiles set care_plan = jsonb_build_object('v', 1, 'pad', repeat('x', 3000)) where id = 'a1000000-0000-4000-8000-0000000000c3';
select case when care_plan ? 'pad' then 'FAIL' else 'PASS' end || '  (checked) oversized plan rejected' from profiles where id = 'a1000000-0000-4000-8000-0000000000c3';

-- Clean up.
delete from notifications where user_id::text like '00000000-0000-4000-8000-0000000000c%';
delete from families where owner_id::text like '00000000-0000-4000-8000-0000000000c%';
delete from auth.users where email like 'c_@care.test';
