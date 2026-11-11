-- 0044: THE AI API MOVES INTO THIS PROJECT (int-ai-api).
--
-- The AI API (FastAPI: Gemini reader, Groq chat, embeddings, memory builder,
-- output guard) used to run on its own Supabase project with its own copy of
-- everything: patients, medical_documents, chat_sessions, notifications,
-- daily_logs and a second family plan. It now runs against THIS project, and
-- this app stays the owner of accounts, members, plans, documents, chats and
-- notifications. So its migrations were not copied across; they were mapped:
--
--   AI API (old project)            here
--   ----------------------------    ------------------------------------------
--   patients, user_profiles,        profiles, families, subscriptions
--     family plan trigger             (covered_profile_ids decides the plan)
--   medical_documents               documents (filed by the app, Rule 12)
--   chat_sessions, chat_messages    conversations, messages (the app writes)
--   notifications                   notifications (0024, notify_document_change)
--   daily_logs, patient_targets     daily_logs (0034); targets not carried
--   lab_corrections, aliases        not carried: corrections happen on Check
--                                     and save, before anything is filed
--
-- and only what this project lacked is added, every table prefixed `ai_` so
-- it is obvious who writes it:
--
--   1. vector                  pgvector, in the extensions schema
--   2. ai_document_chunks      a filed document's text, embedded, for retrieval
--   3. ai_jobs                 the index queue: one live job per document
--   4. documents trigger       filing (or re-filing) a document enqueues it
--   5. ai_lab_results          every lab value normalised: analyte, canonical
--                                unit, the lab's own range, flag
--   6. ai_prescription_lines   every medicine read to its salts (the ledger)
--   7. ai_memory_facts         conditions, medicines, allergies, procedures
--                                read from records, with full history
--   8. ai_health_reports       one member's report: summary, what is out of
--                                range, medicines explained, longevity and
--                                lifestyle, what to discuss with the doctor
--   9. ai_answer_cache         guarded answers, off by default
--  10. ai_may_process()        plan coverage + consent, asked before any read
--
-- AT SCALE. Read policies compare `(select auth.uid ())`, which Postgres
-- evaluates once per query instead of once per row, and every user_id a
-- policy filters on is indexed.
--
-- WHO WRITES. Only the AI API, with the service key, which never ships in
-- the app (see .env.example). The app and the person can READ their own rows
-- (RLS on user_id, as everywhere); nothing here is writable from a phone.
-- Chunks, jobs and the cache are not readable at all: they are plumbing.
--
-- WHAT IT HOLDS. Values and names already in the person's own records, read
-- again in a normalised form; the report is prose built from those. Nothing
-- from another member. Everything cascades from profiles and documents, so
-- deleting a record, a member or the account removes what was learned from it.
--
-- WHAT IS NEVER STORED. No prompts, no model replies outside the opt-in cache,
-- no request logs. The API logs ids and counts only.
--
-- Safe to run again: every statement is if-not-exists or create-or-replace.

-- ---------------------------------------------------------------- 1. vector --

create extension if not exists vector with schema extensions;

-- ----------------------------------------------------------------- 2. chunks --

create table if not exists ai_document_chunks (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  document_id uuid not null references documents (id) on delete cascade,
  content text not null check (char_length(content) <= 8000),
  -- all-MiniLM-L6-v2. Changing the model is a new column, not a new length.
  embedding extensions.vector (384) not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_document_chunks_document_idx on ai_document_chunks (document_id);
create index if not exists ai_document_chunks_profile_idx on ai_document_chunks (profile_id);
create index if not exists ai_document_chunks_embedding_idx on ai_document_chunks using hnsw (embedding extensions.vector_cosine_ops);

alter table ai_document_chunks enable row level security;
-- No policies: only the service role reads or writes chunks.

-- One member's closest chunks to a question. Takes a profile id, so it would
-- answer about anyone: service role only.
create or replace function ai_match_chunks (query_embedding extensions.vector (384), match_count int, p_profile_id uuid)
returns table (id uuid, document_id uuid, content text, similarity float)
language sql
stable
set search_path = public, extensions as $$
  select c.id, c.document_id, c.content, 1 - (c.embedding <=> query_embedding) as similarity
  from ai_document_chunks c
  where c.profile_id = p_profile_id
  order by c.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 20);
$$;

revoke execute on function ai_match_chunks (extensions.vector, int, uuid) from public, anon, authenticated;
grant execute on function ai_match_chunks (extensions.vector, int, uuid) to service_role;

-- ------------------------------------------------------------------- 3. jobs --

create table if not exists ai_jobs (
  id uuid primary key default gen_random_uuid (),
  document_id uuid not null references documents (id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'dead')),
  attempts int not null default 0,
  max_attempts int not null default 3,
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  -- An exception class name or a fixed code. Never content.
  error_code text check (error_code is null or char_length(error_code) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- At most one live job per document: filing twice is one job.
create unique index if not exists ai_jobs_one_live_per_document on ai_jobs (document_id) where status in ('queued', 'running');
create index if not exists ai_jobs_claim_idx on ai_jobs (status, run_after);

alter table ai_jobs enable row level security;
-- No policies: the queue is the server's.

-- Claims one runnable job, or one whose worker died holding it.
create or replace function ai_claim_job (p_lock_timeout_seconds int default 300) returns setof ai_jobs
language sql
set search_path = public as $$
  update ai_jobs j
  set status = 'running', attempts = j.attempts + 1, locked_at = now(), updated_at = now()
  where j.id = (
    select id from ai_jobs
    where (status = 'queued' and run_after <= now())
       or (status = 'running' and locked_at < now() - make_interval(secs => p_lock_timeout_seconds))
    order by run_after
    limit 1
    for update skip locked
  )
  returning j.*;
$$;

revoke execute on function ai_claim_job (int) from public, anon, authenticated;
grant execute on function ai_claim_job (int) to service_role;

-- ------------------------------------------------------- 4. filing enqueues --
--
-- The app files a document only after Check and save (Rule 12). That moment,
-- and any later edit of what was read, is when the AI API should learn from
-- it: the trigger enqueues, the API's worker indexes. Indexing reads the
-- CONFIRMED extraction, never a fresh guess at the image, so a correction the
-- person typed is what memory keeps. A record waiting for a check
-- (needs_review) is indexed too and marked unverified everywhere it is used.

create or replace function ai_enqueue_document () returns trigger
language plpgsql
security definer
set search_path = public as $$
begin
  if new.status not in ('filed', 'needs_review') then
    return new;
  end if;
  if tg_op = 'UPDATE'
     and new.status is not distinct from old.status
     and new.extraction is not distinct from old.extraction
     and new.raw_text is not distinct from old.raw_text
     and new.doc_type is not distinct from old.doc_type
     and new.profile_id is not distinct from old.profile_id
     and new.event_date is not distinct from old.event_date then
    return new;
  end if;
  insert into ai_jobs (document_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

revoke execute on function ai_enqueue_document () from public, anon, authenticated;

drop trigger if exists documents_ai_enqueue_trigger on documents;
create trigger documents_ai_enqueue_trigger after insert or update on documents for each row execute function ai_enqueue_document ();

-- ------------------------------------------------------------ 5. lab results --

create table if not exists ai_lab_results (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  document_id uuid not null references documents (id) on delete cascade,
  analyte_key text,
  raw_name text not null,
  value_num numeric,
  value_text text,
  unit text,
  canonical_value numeric,
  canonical_unit text,
  -- The range PRINTED ON THE REPORT, never a population range.
  ref_low numeric,
  ref_high numeric,
  ref_text text,
  flag text not null default 'unknown' check (flag in ('low', 'normal', 'high', 'critical_low', 'critical_high', 'unknown')),
  confidence numeric not null default 0 check (confidence between 0 and 1),
  lab_name text,
  collected_on date,
  review_status text not null default 'ok' check (review_status in ('ok', 'needs_review', 'corrected')),
  review_reasons text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_lab_results_profile_analyte_idx on ai_lab_results (profile_id, analyte_key, collected_on desc);
create index if not exists ai_lab_results_document_idx on ai_lab_results (document_id);
create index if not exists ai_lab_results_user_idx on ai_lab_results (user_id);

alter table ai_lab_results enable row level security;
drop policy if exists "users read own ai lab results" on ai_lab_results;
create policy "users read own ai lab results" on ai_lab_results for select using ((select auth.uid ()) = user_id);

-- ---------------------------------------------------- 6. prescription lines --

create table if not exists ai_prescription_lines (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  document_id uuid not null references documents (id) on delete cascade,
  raw_text text,
  drug_name text not null,
  brand text,
  -- [{name, strength, unit}] from the brand-to-salt resolver.
  salts jsonb not null default '[]'::jsonb check (jsonb_typeof(salts) = 'array'),
  strength text,
  dose text,
  frequency_raw text,
  doses_per_day numeric,
  duration_text text,
  duration_days int,
  doctor_name text,
  prescribed_on date,
  handwritten boolean not null default false,
  confidence numeric not null default 0 check (confidence between 0 and 1),
  resolution_status text not null default 'unresolved' check (resolution_status in ('resolved', 'ambiguous', 'unresolved')),
  resolution_source text,
  drug_master_id text,
  review_status text not null default 'ok' check (review_status in ('ok', 'needs_review', 'corrected')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists ai_prescription_lines_profile_idx on ai_prescription_lines (profile_id, active);
create index if not exists ai_prescription_lines_document_idx on ai_prescription_lines (document_id);
create index if not exists ai_prescription_lines_user_idx on ai_prescription_lines (user_id);

alter table ai_prescription_lines enable row level security;
drop policy if exists "users read own ai prescription lines" on ai_prescription_lines;
create policy "users read own ai prescription lines" on ai_prescription_lines for select using ((select auth.uid ()) = user_id);

-- --------------------------------------------------------- 7. memory facts --
--
-- Not the same thing as memory_facts (0030), which holds readings said in the
-- chat ("BP 130/85 today") and is written by the app. These are categorical
-- facts read from documents (a condition, an allergy, a procedure) and only
-- the server writes them. An older-dated fact never replaces a newer one; it
-- is kept in history as 'older_observation'. Facts are never auto-resolved:
-- that is a clinical judgement.

create table if not exists ai_memory_facts (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  category text not null check (category in ('condition', 'medication', 'allergy', 'procedure', 'vital', 'other')),
  fact_key text not null check (char_length(fact_key) between 1 and 80),
  fact_value text not null check (char_length(fact_value) between 1 and 400),
  status text not null default 'active' check (status in ('active', 'resolved')),
  observed_on date,
  source_document_id uuid references documents (id) on delete set null,
  first_noted_at timestamptz not null default now(),
  last_confirmed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, category, fact_key)
);

create index if not exists ai_memory_facts_user_idx on ai_memory_facts (user_id);

alter table ai_memory_facts enable row level security;
drop policy if exists "users read own ai memory facts" on ai_memory_facts;
create policy "users read own ai memory facts" on ai_memory_facts for select using ((select auth.uid ()) = user_id);

create table if not exists ai_memory_fact_history (
  id uuid primary key default gen_random_uuid (),
  fact_id uuid references ai_memory_facts (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  category text not null,
  fact_key text not null,
  change_type text not null check (change_type in ('created', 'updated', 'status_changed', 'older_observation')),
  old_value text,
  new_value text,
  old_status text,
  new_status text,
  observed_on date,
  source_document_id uuid references documents (id) on delete set null,
  recorded_at timestamptz not null default now()
);

create index if not exists ai_memory_fact_history_lookup_idx on ai_memory_fact_history (profile_id, category, fact_key, recorded_at desc);
create index if not exists ai_memory_fact_history_user_idx on ai_memory_fact_history (user_id);

alter table ai_memory_fact_history enable row level security;
drop policy if exists "users read own ai memory history" on ai_memory_fact_history;
create policy "users read own ai memory history" on ai_memory_fact_history for select using ((select auth.uid ()) = user_id);

-- Every change is recorded by trigger, so no code path can skip it.
create or replace function ai_record_fact_change () returns trigger
language plpgsql
security definer
set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into ai_memory_fact_history (fact_id, user_id, profile_id, category, fact_key, change_type, new_value, new_status, observed_on, source_document_id)
    values (new.id, new.user_id, new.profile_id, new.category, new.fact_key, 'created', new.fact_value, new.status, new.observed_on, new.source_document_id);
  elsif new.fact_value is distinct from old.fact_value or new.status is distinct from old.status then
    insert into ai_memory_fact_history (fact_id, user_id, profile_id, category, fact_key, change_type, old_value, new_value, old_status, new_status, observed_on, source_document_id)
    values (new.id, new.user_id, new.profile_id, new.category, new.fact_key,
            case when new.fact_value is distinct from old.fact_value then 'updated' else 'status_changed' end,
            old.fact_value, new.fact_value, old.status, new.status, new.observed_on, new.source_document_id);
  end if;
  return null;
end;
$$;

revoke execute on function ai_record_fact_change () from public, anon, authenticated;

drop trigger if exists ai_memory_facts_history_trigger on ai_memory_facts;
create trigger ai_memory_facts_history_trigger after insert or update on ai_memory_facts for each row execute function ai_record_fact_change ();

-- Date-aware upsert. Returns 'saved' or 'kept_newer'. The member's account is
-- read from profiles, never passed in, so a fact cannot be filed under the
-- wrong account.
create or replace function ai_upsert_memory_fact (
  p_profile_id uuid,
  p_category text,
  p_fact_key text,
  p_fact_value text,
  p_source_document_id uuid,
  p_observed_on date default null
) returns text
language plpgsql
set search_path = public as $$
declare
  v_user uuid;
  existing ai_memory_facts%rowtype;
begin
  select user_id into v_user from profiles where id = p_profile_id;
  if v_user is null then
    raise exception 'unknown member' using errcode = 'foreign_key_violation';
  end if;

  select * into existing from ai_memory_facts
  where profile_id = p_profile_id and category = p_category and fact_key = p_fact_key
  for update;

  if found and p_observed_on is not null and existing.observed_on is not null and p_observed_on < existing.observed_on then
    insert into ai_memory_fact_history (fact_id, user_id, profile_id, category, fact_key, change_type, old_value, new_value, old_status, new_status, observed_on, source_document_id)
    values (existing.id, v_user, p_profile_id, p_category, p_fact_key, 'older_observation', existing.fact_value, p_fact_value, existing.status, existing.status, p_observed_on, p_source_document_id);
    return 'kept_newer';
  end if;

  insert into ai_memory_facts (user_id, profile_id, category, fact_key, fact_value, source_document_id, observed_on)
  values (v_user, p_profile_id, p_category, p_fact_key, p_fact_value, p_source_document_id, p_observed_on)
  on conflict (profile_id, category, fact_key) do update set
    fact_value = excluded.fact_value,
    status = 'active',
    source_document_id = excluded.source_document_id,
    observed_on = excluded.observed_on,
    last_confirmed_at = now(),
    updated_at = now();
  return 'saved';
end;
$$;

revoke execute on function ai_upsert_memory_fact (uuid, text, text, text, uuid, date) from public, anon, authenticated;
grant execute on function ai_upsert_memory_fact (uuid, text, text, text, uuid, date) to service_role;

-- --------------------------------------------------------- 8. health report --
--
-- One per member, rebuilt by the API after each record is indexed. `report`
-- is the structured card (see the API's services/health_report.py):
--   {summary, attention[], medicines[{name, salts[], purpose, howToTake,
--    watch[]}], longevity[], lifestyle[], discuss[], questions[], loops[],
--    unverified, basis}
-- It explains medicines already prescribed and suggests habits; it never
-- names a new medicine or a dose (Rule 6). `version` lets a rules or prompt
-- change mark every report for rebuilding.

create table if not exists ai_health_reports (
  profile_id uuid primary key references profiles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  version int not null default 1,
  summary text not null default '' check (char_length(summary) <= 2000),
  report jsonb not null default '{}'::jsonb check (jsonb_typeof(report) = 'object' and pg_column_size(report) <= 64000),
  sources jsonb not null default '{}'::jsonb check (jsonb_typeof(sources) = 'object'),
  model_id text,
  generated_at timestamptz not null default now()
);

create index if not exists ai_health_reports_user_idx on ai_health_reports (user_id);

alter table ai_health_reports enable row level security;
drop policy if exists "users read own health reports" on ai_health_reports;
create policy "users read own health reports" on ai_health_reports for select using ((select auth.uid ()) = user_id);

-- ----------------------------------------------------------- 9. answer cache --
--
-- Off unless ANSWER_CACHE_ENABLED=true on the API. Holds guarded answers,
-- which are health data, so: keyed to the member, cascaded, expiring, and
-- unreadable from the app.

create table if not exists ai_answer_cache (
  cache_key text primary key,
  profile_id uuid not null references profiles (id) on delete cascade,
  reply text not null,
  urgency_floor text not null default 'routine' check (urgency_floor in ('routine', 'soon', 'urgent', 'emergency')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists ai_answer_cache_profile_idx on ai_answer_cache (profile_id);
create index if not exists ai_answer_cache_expiry_idx on ai_answer_cache (expires_at);

alter table ai_answer_cache enable row level security;
-- No policies.

-- ---------------------------------------------------------- 10. the gate --
--
-- Asked by the API before it reads or answers anything for a member: the
-- member belongs to this account, the plan covers them (the same rule the
-- write triggers use) and, when 0031 is in, core consent (which includes
-- ai_assistance) is granted. Takes ids, so service role only.

create or replace function ai_may_process (p_user uuid, p_profile uuid) returns boolean
language plpgsql
stable
security definer
set search_path = public as $$
begin
  if not exists (select 1 from profiles where id = p_profile and user_id = p_user) then
    return false;
  end if;
  if p_profile not in (select covered_profile_ids (p_user)) then
    return false;
  end if;
  if to_regprocedure('has_core_consent(uuid)') is not null then
    return has_core_consent (p_user);
  end if;
  return true;
end;
$$;

revoke execute on function ai_may_process (uuid, uuid) from public, anon, authenticated;
grant execute on function ai_may_process (uuid, uuid) to service_role;

-- ---------------------------------------------------------------- grants --

grant select on ai_lab_results, ai_prescription_lines, ai_memory_facts, ai_memory_fact_history, ai_health_reports to authenticated;
grant all on ai_document_chunks, ai_jobs, ai_lab_results, ai_prescription_lines, ai_memory_facts, ai_memory_fact_history, ai_health_reports, ai_answer_cache to service_role;

-- --------------------------------------------------------------- backfill --
--
-- Documents filed before this migration are queued once, so the first
-- report covers everything already on file. The worker drains it at its own
-- pace; nothing is read until the API is running against this project.

insert into ai_jobs (document_id)
select d.id from documents d
where d.status in ('filed', 'needs_review')
on conflict do nothing;
