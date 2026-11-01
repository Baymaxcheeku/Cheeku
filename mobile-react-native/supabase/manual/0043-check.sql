-- Is 0043 (insurance policies) in place? Read only. Paste into the
-- Supabase SQL editor and Run. Every row should say yes.
with checks (looks_for, applied) as (values
  ('the policies table exists, with row-level security on',
    exists (select 1 from pg_class where relname = 'insurance_policies' and relrowsecurity)),
  ('people read, add, edit and delete only their own policies',
    (select count(*) from pg_policies where tablename = 'insurance_policies') = 4),
  ('a policy can only list the owner''s own family members',
    exists (select 1 from pg_policies where tablename = 'insurance_policies' and cmd = 'INSERT' and with_check like '%covered_profile_ids%')),
  ('removing a family member takes them off every policy',
    exists (select 1 from pg_trigger where tgname = 'insurance_policies_forget_member_trigger' and not tgisinternal)),
  ('the app can use the table',
    has_table_privilege('authenticated', 'public.insurance_policies', 'select, insert, update, delete'))
)
select looks_for, case when applied then 'yes' else 'NO' end as applied from checks;
