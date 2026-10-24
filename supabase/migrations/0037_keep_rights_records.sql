-- 0037: the records of a person's rights outlive their sign-in.
--
-- Account deletion now removes the sign-in itself (auth.users), through the
-- delete-account Edge Function. Every table that hangs off auth.users cascades
-- with it, which is what erasure wants for health data, inbox rows, tokens and
-- activity. It is NOT what we want for two tables:
--
--   consent_log       the proof that consent was given and withdrawn, with the
--                     exact document versions. A regulator asks for this.
--   privacy_requests  the proof that a request (erasure included) was received
--                     and answered, and when.
--
-- Neither holds health data. Both were already kept on purpose by the app's
-- delete path (see lib/account/actions.ts); with the sign-in going too, the
-- cascade would quietly take them. So their link to auth.users becomes a plain
-- uuid with no foreign key: the rows stay, keyed by an id that no longer
-- belongs to anyone who can sign in.
--
-- Row-level security is unchanged. auth.uid() can never match a deleted
-- account, so nobody can read these rows through the API afterwards; only the
-- service role (the grievance officer's tooling) can.
--
-- Safe to run again.

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
