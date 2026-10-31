-- Does this database have 0037 (rights records outlive account deletion)? Read only.
-- Paste into the Supabase SQL editor and Run. Every row should say yes before
-- the delete-account function is deployed.
with checks (step, looks_for, applied) as (values
  ('0037 step 1 of 1', 'consent_log is not deleted with the sign-in',
    not exists (
      select 1 from pg_constraint
      where contype = 'f' and conrelid = 'public.consent_log'::regclass and confrelid = 'auth.users'::regclass)),
  ('0037 step 1 of 1', 'privacy_requests is not deleted with the sign-in',
    not exists (
      select 1 from pg_constraint
      where contype = 'f' and conrelid = 'public.privacy_requests'::regclass and confrelid = 'auth.users'::regclass)),
  ('0037 step 1 of 1', 'families still go with the sign-in (unchanged)',
    exists (
      select 1 from pg_constraint
      where contype = 'f' and conrelid = 'public.families'::regclass and confrelid = 'auth.users'::regclass
        and confdeltype = 'c'))
)
select step, looks_for, case when applied then 'yes' else 'NO' end as applied from checks order by looks_for;
