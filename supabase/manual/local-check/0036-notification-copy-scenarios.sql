-- Migration 0036 against a local Postgres that already ran 0035 and the 0033
-- scenarios (b4 on the Family plan). Fires each rewritten notification once
-- and prints it with its length. Run from the repo root.
\set ON_ERROR_STOP 1
\i supabase/migrations/0036_notification_copy.sql
\i supabase/migrations/0036_notification_copy.sql
\echo --- applied twice
\set ON_ERROR_STOP 0

delete from notifications where user_id = '00000000-0000-4000-8000-0000000000b4';

-- A family member joins (printed now: removing them cascades their notifications).
insert into profiles (id, user_id, family_id, name, relationship, is_primary)
values ('a9000000-0000-4000-8000-0000000000b4', '00000000-0000-4000-8000-0000000000b4', 'f0000000-0000-4000-8000-0000000000b4', 'Nani', 'grandmother', false);
select kind, title, body, length(title), length(body) from notifications where profile_id = 'a9000000-0000-4000-8000-0000000000b4';
delete from profiles where id = 'a9000000-0000-4000-8000-0000000000b4';

-- Down to Free and back up to Family.
update subscriptions set tier = 'free' where family_id = 'f0000000-0000-4000-8000-0000000000b4';
update subscriptions set tier = 'family' where family_id = 'f0000000-0000-4000-8000-0000000000b4';

-- A record that needs a check, then is filed with a flagged value.
insert into documents (id, profile_id, user_id, storage_path, mime_type, doc_type, status, extraction)
values ('d9000000-0000-4000-8000-0000000000b4', 'a1000000-0000-4000-8000-0000000000b4', '00000000-0000-4000-8000-0000000000b4', 'x/y.pdf', 'application/pdf', 'lab_report', 'needs_review', '{"title": "CBC"}');
update documents set status = 'filed' where id = 'd9000000-0000-4000-8000-0000000000b4';
insert into entities (profile_id, user_id, document_id, kind, name, value, unit, flag)
values ('a1000000-0000-4000-8000-0000000000b4', '00000000-0000-4000-8000-0000000000b4', 'd9000000-0000-4000-8000-0000000000b4', 'lab_value', 'Haemoglobin', 10.2, 'g/dL', 'low');

\echo --- what the inbox now says (kind | title | body | title length | body length)
select kind, title, body, length(title), length(body)
from notifications where user_id = '00000000-0000-4000-8000-0000000000b4'
order by created_at;

delete from entities where document_id = 'd9000000-0000-4000-8000-0000000000b4';
delete from documents where id = 'd9000000-0000-4000-8000-0000000000b4';
delete from notifications where user_id = '00000000-0000-4000-8000-0000000000b4';
