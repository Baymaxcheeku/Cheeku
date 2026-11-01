-- Migration 0032, exercised against a local Postgres with 0001-0031 applied.
-- Run this file, which applies 0032 itself half way through.
-- Four accounts: O signed up in the old app (no consent saved), L in the
-- legacy web build (a 'dpdp_processing' row), N in the new app (trigger rows),
-- W in the new app and then withdrew.

\set ON_ERROR_STOP 0
insert into auth.users (id, email, created_at, raw_user_meta_data) values
 ('00000000-0000-4000-8000-0000000000a1', 'old@x.test', '2026-08-01 10:00+00', '{}'),
 ('00000000-0000-4000-8000-0000000000a2', 'legacy@x.test', '2026-05-01 10:00+00', '{}'),
 ('00000000-0000-4000-8000-0000000000a3', 'new@x.test', now(), '{"consent":{"accepted":true,"purposes":["account","health_records","ai_assistance","family_profiles","care_bookings"],"versions":{"terms":"2026-10-08","privacy":"2026-10-08","health_consent":"2026-10-08"},"fingerprint":"f","source":"ios"}}'),
 ('00000000-0000-4000-8000-0000000000a4', 'withdrew@x.test', now(), '{"consent":{"accepted":true,"purposes":["account","health_records","ai_assistance","family_profiles","care_bookings"],"versions":{"terms":"2026-10-08","privacy":"2026-10-08","health_consent":"2026-10-08"},"fingerprint":"f","source":"ios"}}');
insert into consent_log (user_id, consent_type, version, granted, granted_at) values
 ('00000000-0000-4000-8000-0000000000a2', 'dpdp_processing', '1.0.0', true, '2026-05-01 10:00+00');
insert into families (id, owner_id) values ('f0000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1');
insert into profiles (id, user_id, family_id, name, is_primary) values ('a1000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', 'f0000000-0000-4000-8000-0000000000a1', 'O', true);

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a4', false);
select 'W withdraws: ' || (record_consent(array['account','health_records','ai_assistance','family_profiles','care_bookings','product_improvement','research_insights','marketing'], false, 'withdrawal', '{"terms":"2026-10-08","privacy":"2026-10-08","health_consent":"2026-10-08"}') ->> 'reason');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a1', false);
select 'C1 before 0032, O reason = ' || (my_consent_state() ->> 'reason');
\echo C2 before 0032, O uploads (expect consent error):
insert into documents (profile_id, user_id, storage_path, mime_type) values ('a1000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1/a1000000-0000-4000-8000-0000000000a1/x.jpg', 'image/jpeg');
reset role;

\echo --- applying 0032
\i /home/user/Baymax/supabase/migrations/0032_carry_over_signup_consent.sql

select 'C3 rows added: O=' || (select count(*) from consent_log where user_id = '00000000-0000-4000-8000-0000000000a1')
  || ' L=' || (select count(*) from consent_log where user_id = '00000000-0000-4000-8000-0000000000a2')
  || ' N=' || (select count(*) from consent_log where user_id = '00000000-0000-4000-8000-0000000000a3')
  || ' W=' || (select count(*) from consent_log where user_id = '00000000-0000-4000-8000-0000000000a4');
select 'C4 O rows dated at sign-up: ' || bool_and(granted_at = '2026-08-01 10:00+00' and method = 'carried_over' and granted) from consent_log where user_id = '00000000-0000-4000-8000-0000000000a1';
select 'C5 optional uses carried over: ' || count(*) from consent_log where method = 'carried_over' and consent_type in ('product_improvement', 'research_insights', 'marketing');

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a1', false);
select 'C6 O reason = ' || (my_consent_state() ->> 'reason') || ', missing = ' || (my_consent_state() -> 'missing')::text || ', stale = ' || (my_consent_state() -> 'stale')::text;
insert into documents (profile_id, user_id, storage_path, mime_type) values ('a1000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1/a1000000-0000-4000-8000-0000000000a1/x.jpg', 'image/jpeg');
select 'C7 O can upload after carry-over: ' || count(*) from documents;
select 'C8 O optional uses still off: ' || coalesce((my_consent_state() -> 'purposes' -> 'product_improvement' ->> 'granted'), 'not set');
select 'C9 O agrees to the update: reason = ' || coalesce(record_consent(array['account','health_records','ai_assistance','family_profiles','care_bookings'], true, 'reconsent_sheet', '{"terms":"2026-10-08","privacy":"2026-10-08","health_consent":"2026-10-08"}') ->> 'reason', 'none');
select 'C10 O turns on Help improve: ' || (record_consent(array['product_improvement'], true, 'privacy_settings', '{"terms":"2026-10-08","privacy":"2026-10-08","health_consent":"2026-10-08"}') -> 'purposes' -> 'product_improvement' ->> 'granted');
\echo C11 a client cannot claim carried_over (expect unknown method):
select record_consent(array['marketing'], true, 'carried_over', '{"terms":"2026-10-08","privacy":"2026-10-08","health_consent":"2026-10-08"}');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a2', false);
select 'C12 L reason = ' || (my_consent_state() ->> 'reason');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a3', false);
select 'C13 N reason = ' || coalesce(my_consent_state() ->> 'reason', 'none');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a4', false);
select 'C14 W still paused: ' || (my_consent_state() ->> 'reason');
reset role;

\echo --- applying 0032 again
\i /home/user/Baymax/supabase/migrations/0032_carry_over_signup_consent.sql
select 'C15 carried-over rows after second run: ' || count(*) from consent_log where method = 'carried_over';
