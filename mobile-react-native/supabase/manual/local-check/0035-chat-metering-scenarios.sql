-- Migration 0035 against a local Postgres that already ran the 0033 scenarios
-- (b2, b7 on Free; b4 on the Family plan). Run from the repo root:
--   psql -d home -f supabase/manual/local-check/0035-chat-metering-scenarios.sql
\set ON_ERROR_STOP 1
\i supabase/migrations/0035_chat_metering.sql
\i supabase/migrations/0035_chat_metering.sql
\echo --- applied twice
\set ON_ERROR_STOP 0

delete from model_calls;
update subscriptions set chats_used_this_month = 0, period_start = current_date - 1
where family_id in (select id from families where owner_id in ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b7'));

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000b2', false);
select 'M1 free, yesterday''s count: ' || claim_model_call()::text;
select 'M2 calls 2 to 6: ' || string_agg(claim_model_call() ->> 'ok', ',') from generate_series(2, 6);
select 'M3 seventh in a minute: ' || claim_model_call()::text;
\echo M4 writing the meter directly (expect a refusal):
insert into model_calls (user_id, tier) values ('00000000-0000-4000-8000-0000000000b2', 'free');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000b4', false);
select 'M5 another account sees ' || count(*) || ' of b2''s calls' from model_calls;
reset role;

-- The allowance: b7 has 19 of 20 left... spent, then one more.
update subscriptions set chats_used_this_month = 19, period_start = current_date
where family_id = (select id from families where owner_id = '00000000-0000-4000-8000-0000000000b7');
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000b7', false);
select 'M6 free with 19 used: ' || (claim_model_call() ->> 'remaining_today') || ' left before this chat';
insert into conversations (id, profile_id, user_id) values ('c0000000-0000-4000-8000-0000000000b7', 'a1000000-0000-4000-8000-0000000000b7', '00000000-0000-4000-8000-0000000000b7')
on conflict (id) do nothing;
insert into messages (id, conversation_id, user_id, role, content, citations, safety_status)
values (gen_random_uuid(), 'c0000000-0000-4000-8000-0000000000b7', '00000000-0000-4000-8000-0000000000b7', 'user', 'twentieth', '[]', 'clear');
select 'M7 twentieth chat saved; claim now: ' || claim_model_call()::text;
\echo M8 twenty-first chat (expect free chat allowance exhausted):
insert into messages (id, conversation_id, user_id, role, content, citations, safety_status)
values (gen_random_uuid(), 'c0000000-0000-4000-8000-0000000000b7', '00000000-0000-4000-8000-0000000000b7', 'user', 'twenty-first', '[]', 'clear');
insert into messages (id, conversation_id, user_id, role, content, citations, safety_status)
values (gen_random_uuid(), 'c0000000-0000-4000-8000-0000000000b7', '00000000-0000-4000-8000-0000000000b7', 'user', 'chest pain', '[]', 'escalated');
select 'M9 an emergency after the allowance still saves: ' || count(*) from messages where conversation_id = 'c0000000-0000-4000-8000-0000000000b7' and safety_status = 'escalated';
reset role;

-- Paid fair-use ceiling, tightened for the test and then restored.
update app_config set value = value || '{"paid_model_daily": 3}' where key = 'chat_limits';
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000b4', false);
select 'M10 family plan, calls 1 to 3: ' || string_agg(claim_model_call() ->> 'ok', ',') from generate_series(1, 3);
select 'M11 fourth over the ceiling: ' || (claim_model_call() ->> 'reason');
select set_config('request.jwt.claim.sub', '', false);
select 'M12 signed out: ' || (claim_model_call() ->> 'reason');
reset role;
update app_config set value = value || '{"paid_model_daily": 300}' where key = 'chat_limits';

-- A broken config row cannot loosen the defaults away.
update app_config set value = '{}' where key = 'chat_limits';
select 'M13 empty config falls back to: ' || (chat_limits() ->> 'free_daily') || ' a day';
update app_config set value = '{"free_daily": 20, "free_model_extra": 5, "per_minute": 6, "per_hour": 60, "paid_model_daily": 300}' where key = 'chat_limits';

set role anon;
\echo M14 anon calling the claim (expect permission denied):
select claim_model_call();
reset role;

delete from messages where conversation_id = 'c0000000-0000-4000-8000-0000000000b7';
delete from conversations where id = 'c0000000-0000-4000-8000-0000000000b7';
delete from model_calls;
