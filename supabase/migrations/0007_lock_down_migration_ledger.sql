-- Close the one table that shipped without RLS.
--
-- `schema_migrations` is created by scripts/migrate.ts, not by a migration, so
-- it never went through the "no table ships without policies" rule the rest of
-- this schema follows. It holds only filenames — no user data — but it sits in
-- the `public` schema, which PostgREST exposes to anyone with the publishable
-- key. Leaking the list of migrations is not a breach, but it is free
-- reconnaissance and there is no reason to hand it over.
--
-- RLS is enabled with NO policies, which is a deny-all: nothing reaching the
-- database through PostgREST can read or write it. The migration runner is
-- unaffected because it connects directly as the table owner over
-- DATABASE_URL, and RLS does not apply to the owner by default.
alter table if exists schema_migrations enable row level security;

comment on table schema_migrations is 'Applied migration filenames. RLS on with no policies: deny-all through the API, writable only by the migration runner over a direct connection.';
