-- Is 0041 (privacy requests answered) in place? Read only. Paste into the
-- Supabase SQL editor and Run. Every row should say yes.
with checks (looks_for, applied) as (values
  ('the team queue exists and the app cannot read it',
    exists (select 1 from pg_views where viewname = 'privacy_queue')
    and not has_table_privilege('authenticated', 'public.privacy_queue', 'select')
    and not has_table_privilege('anon', 'public.privacy_queue', 'select')),
  ('only the team can answer a request',
    exists (select 1 from pg_proc where proname = 'answer_privacy_request')
    and not has_function_privilege('authenticated', 'public.answer_privacy_request(uuid, text, text, text)', 'execute')),
  ('people still cannot answer or close their own request',
    not exists (select 1 from pg_policies where tablename = 'privacy_requests' and cmd in ('UPDATE', 'DELETE', 'ALL'))),
  ('the person hears when their request moves',
    exists (select 1 from pg_trigger where tgname = 'privacy_requests_notify_trigger' and not tgisinternal)),
  ('the legal texts of 2026-10-27 are published, not material',
    (select count(*) from legal_documents where version = '2026-10-27' and not material and kind in ('terms', 'privacy', 'health_consent')) = 3),
  ('nobody is asked to agree again because of them',
    current_material_versions() ->> 'privacy' = '2026-10-25')
)
select looks_for, case when applied then 'yes' else 'NO' end as applied from checks;
