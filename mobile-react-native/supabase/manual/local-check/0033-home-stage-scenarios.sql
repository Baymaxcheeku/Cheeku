-- Migration 0033, exercised against a local Postgres with 0001-0032 applied.
-- Run this file; it applies 0033 itself after seeding the backfill account.
--
--   S  new, nothing at all                        -> starter
--   C  asked one question, no records             -> building
--   R  uploaded a lab report                      -> today via report
--   P  uploaded a prescription                    -> today via prescription
--   M  typed their medicines into the profile     -> today via medicines
--   B  had a report BEFORE 0033 was applied       -> today via backfill
--   K  five chats over two days, three facts      -> building, then today via chat once switched on

\set ON_ERROR_STOP 0
insert into auth.users (id, email) values
 ('00000000-0000-4000-8000-0000000000b1', 's@x.test'),
 ('00000000-0000-4000-8000-0000000000b2', 'c@x.test'),
 ('00000000-0000-4000-8000-0000000000b3', 'r@x.test'),
 ('00000000-0000-4000-8000-0000000000b4', 'p@x.test'),
 ('00000000-0000-4000-8000-0000000000b5', 'm@x.test'),
 ('00000000-0000-4000-8000-0000000000b6', 'b@x.test'),
 ('00000000-0000-4000-8000-0000000000b7', 'k@x.test');

-- Everyone has agreed to the required uses, so the write guard lets data in.
insert into consent_log (user_id, consent_type, version, granted, granted_at, method)
select u.id, r.purpose, '2026-10-08', true, now(), 'signup_checkbox'
from auth.users u cross join unnest(required_purposes()) as r (purpose)
where u.email like '%@x.test' and u.id::text like '00000000-0000-4000-8000-0000000000b%';

insert into families (id, owner_id)
select ('f0000000-0000-4000-8000-0000000000b' || n)::uuid, ('00000000-0000-4000-8000-0000000000b' || n)::uuid from generate_series(1, 7) n;
insert into profiles (id, user_id, family_id, name, is_primary)
select ('a1000000-0000-4000-8000-0000000000b' || n)::uuid, ('00000000-0000-4000-8000-0000000000b' || n)::uuid, ('f0000000-0000-4000-8000-0000000000b' || n)::uuid, 'U' || n, true from generate_series(1, 7) n;

-- B has a lab report before 0033 exists.
insert into documents (profile_id, user_id, storage_path, mime_type, doc_type, status)
values ('a1000000-0000-4000-8000-0000000000b6', '00000000-0000-4000-8000-0000000000b6', '00000000-0000-4000-8000-0000000000b6/a1000000-0000-4000-8000-0000000000b6/r.pdf', 'application/pdf', 'lab_report', 'filed');

\echo --- applying 0033
\set ON_ERROR_STOP 1
\i /tmp/supa_copy/migrations/0033_home_stage.sql
\set ON_ERROR_STOP 0

select 'H1 backfill: B = ' || home_stage || ' via ' || coalesce(today_unlocked_via, '-') from families where owner_id = '00000000-0000-4000-8000-0000000000b6';
select 'H2 backfill left the empty ones alone: S = ' || home_stage from families where owner_id = '00000000-0000-4000-8000-0000000000b1';

-- Data for the others, written as the service would.
insert into conversations (id, profile_id, user_id, title) values ('c0000000-0000-4000-8000-0000000000b2', 'a1000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b2', 'q');
insert into messages (conversation_id, user_id, role, content) values ('c0000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b2', 'user', 'Is 6.1 HbA1c bad?');
insert into documents (profile_id, user_id, storage_path, mime_type, doc_type, status)
values ('a1000000-0000-4000-8000-0000000000b3', '00000000-0000-4000-8000-0000000000b3', '00000000-0000-4000-8000-0000000000b3/a1000000-0000-4000-8000-0000000000b3/r.pdf', 'application/pdf', 'lab_report', 'needs_review'),
       ('a1000000-0000-4000-8000-0000000000b4', '00000000-0000-4000-8000-0000000000b4', '00000000-0000-4000-8000-0000000000b4/a1000000-0000-4000-8000-0000000000b4/p.jpg', 'image/jpeg', 'prescription', 'filed');
update profiles set medications = '[{"name":"Telmisartan","dose":"40 mg"}]'::jsonb where id = 'a1000000-0000-4000-8000-0000000000b5';
-- K: five questions over two days and three facts, nothing dated.
insert into conversations (id, profile_id, user_id, title) values ('c0000000-0000-4000-8000-0000000000b7', 'a1000000-0000-4000-8000-0000000000b7', '00000000-0000-4000-8000-0000000000b7', 'q');
insert into messages (conversation_id, user_id, role, content, created_at)
select 'c0000000-0000-4000-8000-0000000000b7', '00000000-0000-4000-8000-0000000000b7', 'user', 'q' || n, now() - (n || ' days')::interval * (n % 2) from generate_series(1, 5) n;
insert into memory_facts (user_id, profile_id, key, label, value, observed_on)
select '00000000-0000-4000-8000-0000000000b7', 'a1000000-0000-4000-8000-0000000000b7', 'k' || n, 'Fact ' || n, n, current_date from generate_series(1, 3) n;

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000b1', false);
select 'H3 S new user: ' || (home_state() ->> 'stage') || ', signals report=' || (home_state() -> 'signals' ->> 'report');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000b2', false);
select 'H4 C chat only: ' || (home_state() ->> 'stage') || ', asked=' || (home_state() -> 'signals' ->> 'asked');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000b3', false);
select 'H5 R lab report (unconfirmed counts): ' || (home_state() ->> 'stage') || ' via ' || (home_state() ->> 'unlocked_via');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000b4', false);
select 'H6 P prescription: ' || (home_state() ->> 'stage') || ' via ' || (home_state() ->> 'unlocked_via');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000b5', false);
select 'H7 M declared medicines: ' || (home_state() ->> 'stage') || ' via ' || (home_state() ->> 'unlocked_via');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000b7', false);
select 'H8 K chat volume, unlock off: ' || (home_state() ->> 'stage');
reset role;

-- The ratchet: R deletes the only record and stays on Today.
delete from documents where user_id = '00000000-0000-4000-8000-0000000000b3';
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000b3', false);
select 'H9 R after deleting the record: ' || (home_state() ->> 'stage') || ', signals evaluated=' || ((home_state() -> 'signals') <> '{}'::jsonb)::text;
reset role;

-- Switching the chat unlock on is a config change, no release.
update app_config set value = jsonb_set(value, '{chat_unlock,enabled}', 'true') where key = 'home_stage';
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000b7', false);
select 'H10 K with chat unlock on: ' || (home_state() ->> 'stage') || ' via ' || (home_state() ->> 'unlocked_via');
reset role;
update app_config set value = jsonb_set(value, '{chat_unlock,enabled}', 'false') where key = 'home_stage';

-- The Today payload: a due loop for P's parent, a far-off loop, a done step. P is on the Family plan.
insert into subscriptions (family_id, tier) values ('f0000000-0000-4000-8000-0000000000b4', 'family') on conflict (family_id) do update set tier = 'family';
insert into profiles (id, user_id, family_id, name, relationship) values ('a2000000-0000-4000-8000-0000000000b4', '00000000-0000-4000-8000-0000000000b4', 'f0000000-0000-4000-8000-0000000000b4', 'Papa', 'father');
insert into open_loops (user_id, profile_id, key, type, title, due_by) values
 ('00000000-0000-4000-8000-0000000000b4', 'a2000000-0000-4000-8000-0000000000b4', 'kft', 'test_ordered', 'Kidney function test', current_date - 4),
 ('00000000-0000-4000-8000-0000000000b4', 'a1000000-0000-4000-8000-0000000000b4', 'far', 'followup_due', 'Follow-up in March', current_date + 90);
insert into today_actions (user_id, profile_id, day, step_key, status) values
 ('00000000-0000-4000-8000-0000000000b4', 'a1000000-0000-4000-8000-0000000000b4', current_date, 'walk_after_meals', 'done'),
 ('00000000-0000-4000-8000-0000000000b4', 'a1000000-0000-4000-8000-0000000000b4', current_date - 1, 'sleep_wind_down', 'done');
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000b4', false);
select 'H11 due list: ' || jsonb_array_length(home_state() -> 'due') || ' item(s), first = ' || (home_state() -> 'due' -> 0 ->> 'title') || ', far one excluded';
select 'H12 done days: ' || jsonb_array_length(home_state() -> 'done_days');
-- P can log their own step, and cannot log one for someone else's profile.
insert into today_actions (user_id, profile_id, day, step_key, status) values ('00000000-0000-4000-8000-0000000000b4', 'a1000000-0000-4000-8000-0000000000b4', current_date, 'drink_water', 'later');
\echo H13 P writing a step as another user (expect RLS error):
insert into today_actions (user_id, profile_id, day, step_key, status) values ('00000000-0000-4000-8000-0000000000b4', 'a1000000-0000-4000-8000-0000000000b3', current_date, 'drink_water', 'done');
insert into today_actions (user_id, profile_id, day, step_key, status) values ('00000000-0000-4000-8000-0000000000b3', 'a1000000-0000-4000-8000-0000000000b3', current_date, 'drink_water', 'done');
\echo H14 app_config is not readable by users (expect permission error or 0 rows):
select 'H14 rows = ' || count(*) from app_config;
\echo H15 home_signals is not callable by users (expect permission error):
select home_signals('00000000-0000-4000-8000-0000000000b3');
reset role;
