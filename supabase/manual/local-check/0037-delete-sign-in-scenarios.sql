-- Migration 0037 against the local Postgres used by the earlier scenarios.
-- Deletes one test account's sign-in the way the delete-account function does
-- and checks what goes and what stays. Run from the repo root:
--   psql -d home -f supabase/manual/local-check/0037-delete-sign-in-scenarios.sql
\set ON_ERROR_STOP 1
\i supabase/migrations/0037_keep_rights_records.sql
\i supabase/migrations/0037_keep_rights_records.sql
\echo --- applied twice
\i supabase/manual/0037-check.sql

-- A throwaway account with something in every kind of table that matters.
-- The kept rows from an earlier run are cleared first so the counts read the same.
delete from consent_log where user_id = '00000000-0000-4000-8000-0000000000d1';
delete from privacy_requests where user_id = '00000000-0000-4000-8000-0000000000d1';
insert into auth.users (id, email) values ('00000000-0000-4000-8000-0000000000d1', 'erase-me@example.com') on conflict do nothing;
insert into families (id, owner_id) values ('f0000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000d1')
on conflict do nothing;
insert into consent_log (user_id, consent_type, version, granted)
select '00000000-0000-4000-8000-0000000000d1', consent_type, version, true from consent_log limit 1;
insert into privacy_requests (user_id, kind, status, details, response, resolved_at)
values ('00000000-0000-4000-8000-0000000000d1', 'erasure', 'resolved', 'Deleted account in the app', 'Account, records and sign-in removed.', now());
insert into notifications (user_id, kind, title, body)
select '00000000-0000-4000-8000-0000000000d1', kind, 'Hi', 'There' from notifications limit 1;

select 'D1 before: families ' || (select count(*) from families where owner_id = '00000000-0000-4000-8000-0000000000d1')
  || ', consent ' || (select count(*) from consent_log where user_id = '00000000-0000-4000-8000-0000000000d1')
  || ', requests ' || (select count(*) from privacy_requests where user_id = '00000000-0000-4000-8000-0000000000d1')
  || ', inbox ' || (select count(*) from notifications where user_id = '00000000-0000-4000-8000-0000000000d1');

-- What auth.admin.deleteUser does underneath.
delete from auth.users where id = '00000000-0000-4000-8000-0000000000d1';

select 'D2 after: sign-in ' || (select count(*) from auth.users where id = '00000000-0000-4000-8000-0000000000d1')
  || ', families ' || (select count(*) from families where owner_id = '00000000-0000-4000-8000-0000000000d1')
  || ', inbox ' || (select count(*) from notifications where user_id = '00000000-0000-4000-8000-0000000000d1')
  || ', consent kept ' || (select count(*) from consent_log where user_id = '00000000-0000-4000-8000-0000000000d1')
  || ', requests kept ' || (select count(*) from privacy_requests where user_id = '00000000-0000-4000-8000-0000000000d1');

-- Nobody can read the kept rows through the API: auth.uid() never matches again.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000b2', false);
select 'D3 another account sees ' || (select count(*) from consent_log where user_id = '00000000-0000-4000-8000-0000000000d1') || ' consent rows and '
  || (select count(*) from privacy_requests where user_id = '00000000-0000-4000-8000-0000000000d1') || ' requests of the deleted account';
reset role;

-- The editor step file is the same change and runs clean on top.
\i supabase/manual/0037-step-1-of-1.sql
\echo --- editor step ran clean
