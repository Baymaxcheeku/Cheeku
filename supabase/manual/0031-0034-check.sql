-- Which parts of 0031 to 0034 does this database have? Read only: it changes nothing.
-- Paste into the Supabase SQL editor, Run, and look at the "applied" column.
-- Each row is one editor step file; run any step that says "no", in order.
-- (schema_migrations only knows about migrations run with npm run db:migrate,
-- not steps pasted into the SQL editor, so this checks the objects themselves.)

with checks (step, looks_for, applied) as (values
  ('0031 step 1 of 6', 'legal_documents table',
    to_regclass('public.legal_documents') is not null),
  ('0031 step 2 of 6', 'consent_log.bundle_id column, required_purposes()',
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'consent_log' and column_name = 'bundle_id')
    and exists (select 1 from pg_proc where proname = 'required_purposes')),
  ('0031 step 3 of 6', 'my_consent_state()',
    exists (select 1 from pg_proc where proname = 'my_consent_state')),
  ('0031 step 4 of 6', 'record_consent()',
    exists (select 1 from pg_proc where proname = 'record_consent')),
  ('0031 step 5 of 6', 'sign-up consent trigger, enforce_consent flag',
    exists (select 1 from pg_trigger where tgname = 'on_auth_user_created_record_consent')
    and exists (select 1 from app_flags where key = 'enforce_consent')),
  ('0031 step 6 of 6', 'account_activity and privacy_requests tables',
    to_regclass('public.account_activity') is not null
    and to_regclass('public.privacy_requests') is not null),
  ('0032 step 1 of 1', 'consent method ''carried_over'' allowed',
    exists (select 1 from pg_constraint where conname = 'consent_log_method_check'
            and pg_get_constraintdef(oid) like '%carried_over%')),
  ('0033 step 1 of 4', 'families.home_stage column, today_actions table',
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'families' and column_name = 'home_stage')
    and to_regclass('public.today_actions') is not null),
  ('0033 step 2 of 4', 'home_decide() and home_signals()',
    exists (select 1 from pg_proc where proname = 'home_decide')
    and exists (select 1 from pg_proc where proname = 'home_signals')),
  ('0033 step 3 of 4', 'home_state()',
    exists (select 1 from pg_proc where proname = 'home_state')),
  ('0033 step 4 of 4', 'backfill of existing families (safe to run again)',
    null::boolean),
  ('0034 step 1 of 2', 'daily_logs table and its triggers',
    to_regclass('public.daily_logs') is not null
    and exists (select 1 from pg_trigger where tgname = 'daily_logs_cap_trigger')),
  ('0034 step 2 of 2', 'profiles.daily_prefs column',
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'daily_prefs'))
)
select step, looks_for,
       case when applied is null then 'run it if 3 of 4 just ran' when applied then 'yes' else 'NO' end as applied
from checks
order by step;
