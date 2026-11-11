-- Is 0044 (the AI API in this project) in place? Read only. Paste into the
-- Supabase SQL editor and Run. Every row should say yes.
with checks (looks_for, applied) as (values
  ('pgvector is on',
    exists (select 1 from pg_extension where extname = 'vector')),
  ('the eight AI tables exist, with row-level security on',
    (select count(*) from pg_class where relname in ('ai_document_chunks', 'ai_jobs', 'ai_lab_results', 'ai_prescription_lines', 'ai_memory_facts', 'ai_memory_fact_history', 'ai_health_reports', 'ai_answer_cache') and relrowsecurity) = 8),
  ('chunks, jobs and the cache have no policies (server only)',
    not exists (select 1 from pg_policies where tablename in ('ai_document_chunks', 'ai_jobs', 'ai_answer_cache'))),
  ('people can read only their own lab results, medicines, facts, history and report',
    (select count(*) from pg_policies where tablename in ('ai_lab_results', 'ai_prescription_lines', 'ai_memory_facts', 'ai_memory_fact_history', 'ai_health_reports') and cmd = 'SELECT') = 5),
  ('nothing AI is writable from the app',
    not exists (select 1 from pg_policies where tablename like 'ai\_%' and cmd <> 'SELECT')),
  ('filing a document queues it for the AI API',
    exists (select 1 from pg_trigger where tgname = 'documents_ai_enqueue_trigger' and not tgisinternal)),
  ('every fact change is recorded',
    exists (select 1 from pg_trigger where tgname = 'ai_memory_facts_history_trigger' and not tgisinternal)),
  ('the app cannot call the server-only functions',
    not has_function_privilege('authenticated', 'ai_may_process(uuid, uuid)', 'execute')
    and not has_function_privilege('authenticated', 'ai_claim_job(int)', 'execute')
    and not has_function_privilege('authenticated', 'ai_upsert_memory_fact(uuid, text, text, text, uuid, date)', 'execute')),
  ('the API (service role) can call them',
    has_function_privilege('service_role', 'ai_may_process(uuid, uuid)', 'execute')
    and has_function_privilege('service_role', 'ai_match_chunks(extensions.vector, int, uuid)', 'execute')),
  ('the app can read the health report',
    has_table_privilege('authenticated', 'public.ai_health_reports', 'select'))
)
select looks_for, case when applied then 'yes' else 'NO' end as applied from checks;
