-- Is 0038 (family care) in place? Read only. Paste into the Supabase SQL editor
-- and Run. Every row should say yes.
with checks (step, looks_for, applied) as (values
  ('0038 step 1 of 3', 'the six new kinds are allowed',
    pg_get_constraintdef((select oid from pg_constraint where conname = 'notifications_kind_check')) like '%parent_alert%'),
  ('0038 step 1 of 3', 'new shelves: medicines, nudges, care',
    pg_get_expr((select adbin from pg_attrdef d join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
                 where d.adrelid = 'public.notifications'::regclass and a.attname = 'category'), 'public.notifications'::regclass) like '%care%'),
  ('0038 step 1 of 3', 'profiles.care_plan exists',
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'care_plan')),
  ('0038 step 1 of 3', 'run_care_sweep exists and the app cannot call it',
    exists (select 1 from pg_proc where proname = 'run_care_sweep')
    and not has_function_privilege('authenticated', 'public.run_care_sweep(timestamptz)', 'execute')),
  ('0038 step 2 of 3', 'pg_cron is on (see the job itself: select * from cron.job)',
    exists (select 1 from pg_extension where extname = 'pg_cron')
    and exists (select 1 from pg_namespace where nspname = 'cron')),
  ('0038 step 3 of 3', 'new inbox rows go to push-dispatch',
    exists (select 1 from pg_trigger where tgrelid = 'public.notifications'::regclass and not tgisinternal
            and (tgname = 'push_dispatch_webhook' or pg_get_triggerdef(oid) like '%push-dispatch%')))
)
select step, looks_for, case when applied then 'yes' else 'NO' end as applied from checks order by step, looks_for;
