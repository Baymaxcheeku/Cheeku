-- Is 0045 (partner network) in place? Read only. Paste into the Supabase SQL
-- editor and Run. Every row should say yes.
with checks (looks_for, applied) as (values
  ('the partner lab row exists',
    exists (select 1 from lab_partners where id = 'labstack')),
  ('lab bookings carry the partner order, status, collector and lab logo',
    (select count(*) = 5 from information_schema.columns where table_name = 'lab_bookings' and column_name in ('ls_order_id', 'ls_status', 'order_type', 'phlebo', 'lab_logo'))),
  ('lab tests can be linked to the partner catalogue',
    exists (select 1 from information_schema.columns where table_name = 'lab_tests' and column_name = 'ls_id')),
  ('medicine orders, doctor visits and instant consults exist, with row-level security on',
    (select count(*) = 3 from pg_class where relname in ('pharma_orders', 'consult_appointments', 'instant_consults') and relrowsecurity)),
  ('people can read only their own orders',
    (select count(*) = 4 from pg_policies where tablename in ('pharma_orders', 'consult_appointments', 'instant_consults', 'partner_escalations'))),
  ('the app cannot write orders directly',
    not has_table_privilege('authenticated', 'public.pharma_orders', 'insert') or not exists (select 1 from pg_policies where tablename = 'pharma_orders' and cmd in ('INSERT', 'ALL'))),
  ('the webhook log exists and is locked',
    exists (select 1 from pg_class where relname = 'partner_events' and relrowsecurity)
    and not exists (select 1 from pg_policies where tablename = 'partner_events')),
  ('real lab bookings move only on the partner''s word',
    exists (select 1 from pg_proc where proname = 'apply_partner_lab_status')
    and pg_get_functiondef('sync_lab_bookings'::regproc) like '%ls_order_id is null%')
)
select looks_for, case when applied then 'yes' else 'NO' end as applied from checks;
