-- Is 0040 (member locations) in place? Read only. Paste into the Supabase SQL
-- editor and Run. Every row should say yes.
with checks (looks_for, applied) as (values
  ('member_locations exists with row level security on',
    exists (select 1 from pg_class where relname = 'member_locations' and relrowsecurity)),
  ('the app reads its own places and cannot write them directly',
    exists (select 1 from pg_policies where tablename = 'member_locations' and cmd = 'SELECT')
    and not exists (select 1 from pg_policies where tablename = 'member_locations' and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL'))),
  ('set and forget exist and the app can call them',
    has_function_privilege('authenticated', 'public.set_member_location(uuid, double precision, double precision, integer, text, jsonb)', 'execute')
    and has_function_privilege('authenticated', 'public.forget_member_location(uuid)', 'execute')),
  ('geo cache and quota are closed to the app',
    exists (select 1 from pg_class where relname = 'geo_cache' and relrowsecurity)
    and not exists (select 1 from pg_policies where tablename in ('geo_cache', 'geo_quota'))
    and not has_function_privilege('authenticated', 'public.geo_take_quota(uuid, integer)', 'execute')),
  ('MG Road to Indiranagar measures about 3.7 km',
    round(geo_km(12.9756, 77.6066, 12.9784, 77.6408)::numeric, 1) = 3.7),
  ('the privacy policy of 2026-10-25 is published',
    exists (select 1 from legal_documents where kind = 'privacy' and version = '2026-10-25'))
)
select looks_for, case when applied then 'yes' else 'NO' end as applied from checks;
