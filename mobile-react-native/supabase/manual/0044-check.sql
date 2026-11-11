-- Is 0044 (wearables) in place? Read only. Paste into the Supabase SQL
-- editor and Run. Every row should say yes.
with checks (looks_for, applied) as (values
  ('the daily wearables table exists, with row-level security on',
    exists (select 1 from pg_class where relname = 'wearable_days' and relrowsecurity)),
  ('people see and write only their own family''s days',
    exists (select 1 from pg_policies where tablename = 'wearable_days' and with_check like '%profiles%')),
  ('the app can use the daily table',
    has_table_privilege('authenticated', 'public.wearable_days', 'select, insert, update, delete')),
  ('the Google sign-in tables exist and are locked',
    exists (select 1 from pg_class where relname = 'wearable_links' and relrowsecurity)
    and exists (select 1 from pg_class where relname = 'wearable_link_states' and relrowsecurity)),
  ('the app cannot read Google tokens',
    not has_table_privilege('authenticated', 'public.wearable_links', 'select'))
)
select looks_for, case when applied then 'yes' else 'NO' end as applied from checks;
