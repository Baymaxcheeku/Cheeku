-- Migration 0031, exercised as two real users against a local Postgres.
-- Each T-line prints a result; each 'expect ...' line must be followed by
-- the error it names. Last run 2026-10-08: all 23 as expected.

\set ON_ERROR_STOP 0
-- Two users: A signs up with the consent payload the app sends; B signs up without one.
insert into auth.users (id, email, raw_user_meta_data) values
 ('aaaaaaaa-0000-4000-8000-000000000001', 'a@x.test', '{"consent":{"accepted":true,"purposes":["account","health_records","ai_assistance","family_profiles","care_bookings"],"versions":{"terms":"2026-10-08","privacy":"2026-10-08","health_consent":"2026-10-08"},"fingerprint":"terms:abc|privacy:def","source":"ios","app_version":"0.1.0","locale":"en-IN"}}'),
 ('bbbbbbbb-0000-4000-8000-000000000002', 'b@x.test', '{}');
select 'T1 signup trigger rows for A = ' || count(*) from consent_log where user_id = 'aaaaaaaa-0000-4000-8000-000000000001';
select 'T1b rows for B = ' || count(*) from consent_log where user_id = 'bbbbbbbb-0000-4000-8000-000000000002';

-- Fixtures as the owner: a family and profile each.
insert into families (id, owner_id) values ('f0000000-0000-4000-8000-00000000000a','aaaaaaaa-0000-4000-8000-000000000001'),('f0000000-0000-4000-8000-00000000000b','bbbbbbbb-0000-4000-8000-000000000002');
insert into profiles (id, user_id, family_id, name, is_primary) values ('a1000000-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000001','f0000000-0000-4000-8000-00000000000a','A',true),('b1000000-0000-4000-8000-000000000001','bbbbbbbb-0000-4000-8000-000000000002','f0000000-0000-4000-8000-00000000000b','B',true);

set role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-0000-4000-8000-000000000001', false);
select 'T2 A state: needs=' || (my_consent_state()->>'needs_consent') || ' reason=' || coalesce(my_consent_state()->>'reason','none');
insert into documents (profile_id, user_id, storage_path, mime_type) values ('a1000000-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000001/a1000000-0000-4000-8000-000000000001/x.jpg','image/jpeg');
select 'T3 A can write a document: ' || count(*) from documents;
select 'T4 A sees B consent rows: ' || count(*) from consent_log where user_id <> auth.uid();

select set_config('request.jwt.claim.sub','bbbbbbbb-0000-4000-8000-000000000002', false);
select 'T5 B state reason=' || (my_consent_state()->>'reason');
\echo T6 B writes a document without consent (expect consent error):
insert into documents (profile_id, user_id, storage_path, mime_type) values ('b1000000-0000-4000-8000-000000000001','bbbbbbbb-0000-4000-8000-000000000002','bbbbbbbb-0000-4000-8000-000000000002/b1000000-0000-4000-8000-000000000001/x.jpg','image/jpeg');
\echo T7 B grants only some required purposes (expect error):
select record_consent(array['account','health_records'], true, 'reconsent_sheet', '{"terms":"2026-10-08","privacy":"2026-10-08","health_consent":"2026-10-08"}');
\echo T8 B grants with outdated texts (expect stale_terms):
select record_consent(array['account','health_records','ai_assistance','family_profiles','care_bookings'], true, 'reconsent_sheet', '{"terms":"2025-01-01","privacy":"2026-10-08","health_consent":"2026-10-08"}');
\echo T9 B opts into marketing before core consent (expect consent_required):
select record_consent(array['marketing'], true, 'privacy_settings');
select 'T10 B grants all required: reason=' || coalesce(record_consent(array['account','health_records','ai_assistance','family_profiles','care_bookings'], true, 'reconsent_sheet', '{"terms":"2026-10-08","privacy":"2026-10-08","health_consent":"2026-10-08"}', 'fp', 'android', '0.1.0', 'en-IN')->>'reason', 'none');
insert into documents (profile_id, user_id, storage_path, mime_type) values ('b1000000-0000-4000-8000-000000000001','bbbbbbbb-0000-4000-8000-000000000002','bbbbbbbb-0000-4000-8000-000000000002/b1000000-0000-4000-8000-000000000001/x.jpg','image/jpeg');
select 'T11 B document after consent: ' || count(*) from documents where user_id = auth.uid();
select 'T12 B marketing on: ' || (record_consent(array['marketing'], true, 'privacy_settings')->'purposes'->'marketing'->>'granted');
select 'T13 B withdraws ai_assistance: reason=' || (record_consent(array['ai_assistance'], false, 'withdrawal')->>'reason');
\echo T14 B writes after withdrawal (expect consent error):
insert into documents (profile_id, user_id, storage_path, mime_type) values ('b1000000-0000-4000-8000-000000000001','bbbbbbbb-0000-4000-8000-000000000002','bbbbbbbb-0000-4000-8000-000000000002/b1000000-0000-4000-8000-000000000001/y.jpg','image/jpeg');
\echo T15 B calls has_core_consent on A (expect permission denied):
select has_core_consent('aaaaaaaa-0000-4000-8000-000000000001');
\echo T16 B edits a consent row (expect 0 rows, no update policy):
update consent_log set granted = true where user_id = auth.uid();
\echo T17 B closes own privacy request (expect RLS violation):
insert into privacy_requests (user_id, kind, status) values (auth.uid(), 'grievance', 'resolved');
insert into privacy_requests (user_id, kind, details) values (auth.uid(), 'correction', 'Wrong date on a report');
select 'T18 B request due in days: ' || (due_by - current_date) from privacy_requests;
\echo T19 B writes activity for A (expect RLS violation):
insert into account_activity (user_id, kind) values ('aaaaaaaa-0000-4000-8000-000000000001', 'sign_in');
select 'T20 B activity rows: ' || string_agg(kind, ',') from account_activity;
reset role;
-- A new MATERIAL privacy policy is published.
insert into legal_documents (kind, version, effective_on, material, summary, text_sha256) values ('privacy', '2026-10-09', current_date, true, 'v2', repeat('a',64));
set role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-0000-4000-8000-000000000001', false);
select 'T21 A after material update: reason=' || (my_consent_state()->>'reason') || ' stale=' || (my_consent_state()->>'stale');
reset role;
insert into legal_documents (kind, version, effective_on, material, summary, text_sha256) values ('terms', '2026-10-09', current_date, false, 'typo fix', repeat('b',64));
set role authenticated;
select 'T22 non-material terms update keeps stale=' || (my_consent_state()->>'stale');
reset role;
update app_flags set enabled = false where key = 'enforce_consent';
set role authenticated;
select set_config('request.jwt.claim.sub','bbbbbbbb-0000-4000-8000-000000000002', false);
insert into documents (profile_id, user_id, storage_path, mime_type) values ('b1000000-0000-4000-8000-000000000001','bbbbbbbb-0000-4000-8000-000000000002','bbbbbbbb-0000-4000-8000-000000000002/b1000000-0000-4000-8000-000000000001/z.jpg','image/jpeg');
select 'T23 guard switched off, B writes: ' || count(*) from documents where user_id = auth.uid();
