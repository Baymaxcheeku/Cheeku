-- Migration 0044 (the AI API in this project), exercised against a local
-- Postgres with 0001-0043 applied AND pgvector installed (as on Supabase).
-- Applies 0044 twice, then files documents and reads and writes the AI tables
-- as different people and as the API's service role.
-- Run from the repo root:  psql -d cheeku -f supabase/manual/local-check/0044-ai-integration-scenarios.sql
--
--   A1  family plan, Athar + Papa: filing queues one job per document, the
--       queue never doubles, facts keep history and never let an older date
--       win, A1 reads its own AI rows and cannot write any.
--   A2  another account: sees nothing of A1's, and the gate says no for A1's members.
--   A3  free plan with an extra member the plan does not cover: the gate says no for that member.
--   A4  never agreed to the required uses: the gate says no.

\set ON_ERROR_STOP 1
\i supabase/migrations/0044_ai_integration.sql
\i supabase/migrations/0044_ai_integration.sql
\echo --- 0044 applied twice
\set ON_ERROR_STOP 0

delete from auth.users where email like '%@ai.test';

insert into auth.users (id, email) values
 ('00000000-0000-4000-8000-0000000000a1', 'a1@ai.test'),
 ('00000000-0000-4000-8000-0000000000a2', 'a2@ai.test'),
 ('00000000-0000-4000-8000-0000000000a3', 'a3@ai.test'),
 ('00000000-0000-4000-8000-0000000000a4', 'a4@ai.test');

insert into consent_log (user_id, consent_type, version, granted, granted_at, method)
select u.id, r.purpose, '2026-10-08', true, now(), 'signup_checkbox'
from auth.users u cross join unnest(required_purposes()) as r (purpose)
where u.email in ('a1@ai.test', 'a2@ai.test', 'a3@ai.test');

insert into families (id, owner_id)
select ('f0000000-0000-4000-8000-0000000000a' || n)::uuid, ('00000000-0000-4000-8000-0000000000a' || n)::uuid from generate_series(1, 4) n
on conflict do nothing;
insert into subscriptions (family_id, tier) values
 ('f0000000-0000-4000-8000-0000000000a1', 'family'),
 ('f0000000-0000-4000-8000-0000000000a2', 'family'),
 ('f0000000-0000-4000-8000-0000000000a3', 'family'),
 ('f0000000-0000-4000-8000-0000000000a4', 'family')
on conflict (family_id) do update set tier = excluded.tier;

insert into profiles (id, user_id, family_id, name, is_primary, created_at) values
 ('b1000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', 'f0000000-0000-4000-8000-0000000000a1', 'Athar', true, '2026-01-01'),
 ('b2000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', 'f0000000-0000-4000-8000-0000000000a1', 'Papa', false, '2026-01-02'),
 ('b1000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-0000000000a2', 'f0000000-0000-4000-8000-0000000000a2', 'Kiran', true, '2026-01-01'),
 ('b1000000-0000-4000-8000-0000000000a3', '00000000-0000-4000-8000-0000000000a3', 'f0000000-0000-4000-8000-0000000000a3', 'Sam', true, '2026-01-01'),
 ('b1000000-0000-4000-8000-0000000000a4', '00000000-0000-4000-8000-0000000000a4', 'f0000000-0000-4000-8000-0000000000a4', 'Noor', true, '2026-01-01')
on conflict do nothing;
-- The second member of A3, added while A3 was on the family plan; the plan has since lapsed.
insert into profiles (id, user_id, family_id, name, is_primary, created_at)
select 'b2000000-0000-4000-8000-0000000000a3', '00000000-0000-4000-8000-0000000000a3', 'f0000000-0000-4000-8000-0000000000a3', 'Nani', false, '2026-01-02'
where not exists (select 1 from profiles where id = 'b2000000-0000-4000-8000-0000000000a3');
update subscriptions set tier = 'free' where family_id = 'f0000000-0000-4000-8000-0000000000a3';
\echo --- A3 keeps Nani after the downgrade (expect 2 members)
select count(*) as members from profiles where user_id = '00000000-0000-4000-8000-0000000000a3';

\echo --- A1 files a lab report and a prescription, and starts a third upload (expect 2 queued jobs)
insert into documents (id, profile_id, user_id, storage_path, mime_type, doc_type, status, extraction) values
 ('d1000000-0000-4000-8000-0000000000a1', 'b1000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1/b1000000-0000-4000-8000-0000000000a1/x.pdf', 'application/pdf', 'lab_report', 'filed', '{"values":[]}'),
 ('d2000000-0000-4000-8000-0000000000a1', 'b2000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1/b2000000-0000-4000-8000-0000000000a1/y.jpg', 'image/jpeg', 'prescription', 'needs_review', '{}'),
 ('d3000000-0000-4000-8000-0000000000a1', 'b1000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1/b1000000-0000-4000-8000-0000000000a1/z.jpg', 'image/jpeg', 'other', 'processing', null);
select count(*) as queued from ai_jobs j join documents d on d.id = j.document_id where d.user_id = '00000000-0000-4000-8000-0000000000a1' and j.status = 'queued';

\echo --- correcting the prescription while its job is queued does not double it (expect 1 live)
update documents set extraction = '{"details":{"medicines":[{"name":"Dolo 650"}]}}', status = 'filed' where id = 'd2000000-0000-4000-8000-0000000000a1';
select count(*) as live from ai_jobs where document_id = 'd2000000-0000-4000-8000-0000000000a1' and status in ('queued', 'running');

\echo --- the worker claims both (expect 2 distinct, then none)
select count(distinct document_id) as claimed from (select (ai_claim_job(300)).document_id union all select (ai_claim_job(300)).document_id) c;
select count(*) as nothing_left from ai_claim_job(300);
update ai_jobs set status = 'succeeded', locked_at = null where status = 'running';

\echo --- an edit after indexing queues it again (expect 1); a touch that changes nothing does not (expect still 1)
update documents set event_date = '2026-10-01' where id = 'd1000000-0000-4000-8000-0000000000a1';
update documents set confidence = 0.9 where id = 'd1000000-0000-4000-8000-0000000000a1';
select count(*) as requeued from ai_jobs where document_id = 'd1000000-0000-4000-8000-0000000000a1' and status = 'queued';

\echo --- facts as the service role: saved, saved (newer), kept_newer (older), saved (undated)
select ai_upsert_memory_fact('b1000000-0000-4000-8000-0000000000a1', 'condition', 'type_2_diabetes', 'HbA1c 7.8 percent', 'd1000000-0000-4000-8000-0000000000a1', '2026-06-01');
select ai_upsert_memory_fact('b1000000-0000-4000-8000-0000000000a1', 'condition', 'type_2_diabetes', 'HbA1c 7.1 percent', 'd1000000-0000-4000-8000-0000000000a1', '2026-10-01');
select ai_upsert_memory_fact('b1000000-0000-4000-8000-0000000000a1', 'condition', 'type_2_diabetes', 'HbA1c 8.4 percent', null, '2025-01-01');
select ai_upsert_memory_fact('b1000000-0000-4000-8000-0000000000a1', 'allergy', 'penicillin_allergy', 'rash', null, null);
\echo --- the newest value stands, with three history rows (created, updated, older_observation)
select fact_value from ai_memory_facts where profile_id = 'b1000000-0000-4000-8000-0000000000a1' and fact_key = 'type_2_diabetes';
select string_agg(change_type, ', ' order by recorded_at, change_type) as history from ai_memory_fact_history where fact_key = 'type_2_diabetes';
\echo --- a fact for a member that does not exist (expect unknown member)
select ai_upsert_memory_fact('b9000000-0000-4000-8000-0000000000a1', 'other', 'x', 'y', null, null);

\echo --- the gate (expect t, t, f, f, f, f)
select ai_may_process('00000000-0000-4000-8000-0000000000a1', 'b1000000-0000-4000-8000-0000000000a1') as a1_self,
       ai_may_process('00000000-0000-4000-8000-0000000000a1', 'b2000000-0000-4000-8000-0000000000a1') as a1_papa,
       ai_may_process('00000000-0000-4000-8000-0000000000a2', 'b1000000-0000-4000-8000-0000000000a1') as a2_for_a1,
       ai_may_process('00000000-0000-4000-8000-0000000000a3', 'b2000000-0000-4000-8000-0000000000a3') as a3_uncovered,
       ai_may_process('00000000-0000-4000-8000-0000000000a4', 'b1000000-0000-4000-8000-0000000000a4') as a4_no_consent,
       ai_may_process('00000000-0000-4000-8000-0000000000a1', 'b9000000-0000-4000-8000-0000000000a1') as a1_unknown;

insert into ai_health_reports (profile_id, user_id, summary, report) values
 ('b1000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a1', 'Athar: diabetes on record.', '{"summary":"Athar: diabetes on record."}')
on conflict (profile_id) do nothing;
insert into ai_lab_results (user_id, profile_id, document_id, analyte_key, raw_name, value_num, flag) values
 ('00000000-0000-4000-8000-0000000000a1', 'b1000000-0000-4000-8000-0000000000a1', 'd1000000-0000-4000-8000-0000000000a1', 'hba1c', 'HbA1c', 7.1, 'high');

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a1', false) \g /dev/null
\echo --- A1 reads its own facts, history, report and lab results (expect 2, 3, 1, 1)
select (select count(*) from ai_memory_facts) as facts, (select count(*) from ai_memory_fact_history where fact_key = 'type_2_diabetes') as history,
       (select count(*) from ai_health_reports) as reports, (select count(*) from ai_lab_results) as labs;
\echo --- A1 cannot see the queue or the chunks (expect 0, 0)
select (select count(*) from ai_jobs) as jobs, (select count(*) from ai_document_chunks) as chunks;
\echo --- A1 cannot write a fact, a report or a lab value (expect an RLS error, then two silent no-ops)
insert into ai_memory_facts (user_id, profile_id, category, fact_key, fact_value) values ('00000000-0000-4000-8000-0000000000a1', 'b1000000-0000-4000-8000-0000000000a1', 'other', 'x', 'y');
update ai_health_reports set summary = 'all fine' where profile_id = 'b1000000-0000-4000-8000-0000000000a1';
delete from ai_lab_results;
\echo --- the report is unchanged and the lab value still there (expect Athar: diabetes on record., 1)
select summary, (select count(*) from ai_lab_results) as labs from ai_health_reports;
\echo --- A1 cannot call the server-only functions (expect four permission errors)
select ai_may_process('00000000-0000-4000-8000-0000000000a1', 'b1000000-0000-4000-8000-0000000000a1');
select ai_upsert_memory_fact('b1000000-0000-4000-8000-0000000000a1', 'other', 'x', 'y', null, null);
select ai_claim_job(300);
select ai_enqueue_document();

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a2', false) \g /dev/null
\echo --- A2 sees none of the A1 rows (expect 0, 0, 0, 0)
select (select count(*) from ai_memory_facts) as facts, (select count(*) from ai_memory_fact_history) as history,
       (select count(*) from ai_health_reports) as reports, (select count(*) from ai_lab_results) as labs;
reset role;

\echo --- deleting the lab report removes what was learned from it (expect 0 labs, 0 jobs; the fact stays, its source cleared)
delete from documents where id = 'd1000000-0000-4000-8000-0000000000a1';
select (select count(*) from ai_lab_results where document_id = 'd1000000-0000-4000-8000-0000000000a1') as labs,
       (select count(*) from ai_jobs where document_id = 'd1000000-0000-4000-8000-0000000000a1') as jobs,
       (select source_document_id is null from ai_memory_facts where fact_key = 'type_2_diabetes') as source_cleared;

\echo --- account deletion cascades (expect 0 AI rows left for A1)
delete from auth.users where email = 'a1@ai.test';
select (select count(*) from ai_memory_facts where user_id = '00000000-0000-4000-8000-0000000000a1')
     + (select count(*) from ai_memory_fact_history where user_id = '00000000-0000-4000-8000-0000000000a1')
     + (select count(*) from ai_health_reports where user_id = '00000000-0000-4000-8000-0000000000a1') as left_over;
delete from auth.users where email like '%@ai.test';
