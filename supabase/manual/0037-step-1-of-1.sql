-- 0037 step 1 of 1. Keeps consent and privacy-request records when an account
-- is deleted. Paste into the Supabase SQL editor and Run. Safe to run again.
-- Then run 0037-check.sql, then deploy the delete-account function.

begin;

do $$
declare
  r record;
begin
  for r in
    select c.conname, t.relname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where c.contype = 'f'
      and n.nspname = 'public'
      and t.relname in ('consent_log', 'privacy_requests')
      and c.confrelid = 'auth.users'::regclass
  loop
    execute format('alter table public.%I drop constraint %I', r.relname, r.conname);
  end loop;
end $$;

comment on column consent_log.user_id is
  'The account the consent belonged to. No foreign key on purpose (0037): the record outlives account deletion.';
comment on column privacy_requests.user_id is
  'The account that made the request. No foreign key on purpose (0037): the record outlives account deletion.';

commit;
