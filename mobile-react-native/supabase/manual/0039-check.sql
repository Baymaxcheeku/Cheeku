-- Is 0039 (fitness sessions) in place? Read only. Paste into the Supabase SQL
-- editor and Run. Every row should say yes.
with checks (looks_for, applied) as (values
  ('fitness_bookings exists with row level security on',
    exists (select 1 from pg_class where relname = 'fitness_bookings' and relrowsecurity)),
  ('the app can read its own bookings and cannot write them directly',
    exists (select 1 from pg_policies where tablename = 'fitness_bookings' and cmd = 'SELECT')
    and not exists (select 1 from pg_policies where tablename = 'fitness_bookings' and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL'))),
  ('the markup rule is set',
    exists (select 1 from app_config where key = 'fitness_pricing')),
  ('a 200 rupee session sells at 230',
    fitness_price(200) = 230),
  ('create and cancel exist and the app can call them',
    has_function_privilege('authenticated', 'public.create_fitness_booking(uuid, text, text, text, text, text, double precision, double precision, text, text, timestamptz, integer, integer, text, text)', 'execute')
    and has_function_privilege('authenticated', 'public.cancel_fitness_booking(uuid)', 'execute')),
  ('the two fitness kinds are allowed',
    pg_get_constraintdef((select oid from pg_constraint where conname = 'notifications_kind_check')) like '%fitness_cancelled%'),
  ('fitness rows land on the appointments shelf',
    pg_get_expr((select adbin from pg_attrdef d join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
                 where d.adrelid = 'public.notifications'::regclass and a.attname = 'category'), 'public.notifications'::regclass) like '%fitness%'),
  ('family care (0038) is still there',
    pg_get_constraintdef((select oid from pg_constraint where conname = 'notifications_kind_check')) like '%parent_alert%')
)
select looks_for, case when applied then 'yes' else 'NO' end as applied from checks;
