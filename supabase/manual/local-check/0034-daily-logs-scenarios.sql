-- Migration 0034 against a local Postgres that already ran the 0033 scenarios
-- (accounts b1..b7; P = b4 on the Family plan with a parent profile).
\set ON_ERROR_STOP 1
\i /tmp/supa_copy/migrations/0034_daily_logs.sql
\i /tmp/supa_copy/migrations/0034_daily_logs.sql
\echo --- applied twice
\set ON_ERROR_STOP 0

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000b4', false);
insert into daily_logs (user_id, profile_id, day, task_key, pillar, kind, value, unit, photo_path)
values ('00000000-0000-4000-8000-0000000000b4', 'a1000000-0000-4000-8000-0000000000b4', current_date, 'steps', 'move', 'steps', 10450, 'steps',
        '00000000-0000-4000-8000-0000000000b4/a1000000-0000-4000-8000-0000000000b4/daily/2026-10-13/steps-1.jpg');
insert into daily_logs (user_id, profile_id, day, task_key, pillar, kind, slot, tags, analysis)
values ('00000000-0000-4000-8000-0000000000b4', 'a2000000-0000-4000-8000-0000000000b4', current_date, 'meal:lunch', 'eat', 'meal', 'lunch', '{roti,dal,sabzi}', '{"score": 99}');
select 'D1 own logs saved: ' || count(*) || ', analysis from app kept: ' || count(analysis) from daily_logs;
\echo D2 photo outside the member folder (expect check violation):
insert into daily_logs (user_id, profile_id, day, task_key, pillar, kind, photo_path)
values ('00000000-0000-4000-8000-0000000000b4', 'a1000000-0000-4000-8000-0000000000b4', current_date, 'steps', 'move', 'steps', '00000000-0000-4000-8000-0000000000b3/x/daily/a.jpg');
\echo D3 log for a member of another account (expect a refusal):
insert into daily_logs (user_id, profile_id, day, task_key, pillar, kind, value)
values ('00000000-0000-4000-8000-0000000000b4', 'a1000000-0000-4000-8000-0000000000b3', current_date, 'steps', 'move', 'steps', 1);
\echo D4 bad pillar (expect check violation):
insert into daily_logs (user_id, profile_id, day, task_key, pillar, kind)
values ('00000000-0000-4000-8000-0000000000b4', 'a1000000-0000-4000-8000-0000000000b4', current_date, 'x', 'party', 'habit');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000b3', false);
select 'D5 another account sees ' || count(*) || ' of P''s logs' from daily_logs;
update profiles set daily_prefs = '{"steps_goal": 9000, "veg": true}' where id = 'a1000000-0000-4000-8000-0000000000b3';
select 'D6 prefs saved: ' || (daily_prefs ->> 'steps_goal') from profiles where id = 'a1000000-0000-4000-8000-0000000000b3';
\echo D7 prefs must be an object (expect check violation):
update profiles set daily_prefs = '[1]' where id = 'a1000000-0000-4000-8000-0000000000b3';
reset role;

-- The cap: 80 a day per member.
insert into daily_logs (user_id, profile_id, day, task_key, pillar, kind)
select '00000000-0000-4000-8000-0000000000b4', 'a1000000-0000-4000-8000-0000000000b4', current_date - 3, 'water', 'eat', 'habit' from generate_series(1, 80);
\echo D8 81st log in a day (expect daily_cap):
insert into daily_logs (user_id, profile_id, day, task_key, pillar, kind)
values ('00000000-0000-4000-8000-0000000000b4', 'a1000000-0000-4000-8000-0000000000b4', current_date - 3, 'water', 'eat', 'habit');
delete from daily_logs where day = current_date - 3;
