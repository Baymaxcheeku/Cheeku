-- 0030 step 3 of 6. Run the steps in order, each in a new query. Safe to run again.
begin;

create table if not exists memory_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  key text not null check (key ~ '^[a-z0-9_]{1,40}$'),
  label text not null check (char_length(label) between 1 and 80),
  value numeric,
  value_text text check (value_text is null or char_length(value_text) <= 80),
  unit text check (unit is null or char_length(unit) <= 20),
  observed_on date not null,
  source text not null default 'chat' check (source in ('chat', 'device')),
  message_id uuid references messages (id) on delete set null,
  superseded_by uuid references memory_facts (id) on delete set null,
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  check (value is not null or value_text is not null)
);

create index if not exists memory_facts_profile_key_idx on memory_facts (profile_id, key, observed_on);

alter table memory_facts enable row level security;

drop policy if exists "users manage own facts" on memory_facts;
create policy "users manage own facts" on memory_facts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists memory_facts_plan_scope_trigger on memory_facts;
create trigger memory_facts_plan_scope_trigger before insert on memory_facts for each row
execute function enforce_document_plan_scope ();

create table if not exists open_loops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  key text not null check (char_length(key) between 1 and 160),
  type text not null default 'reminder' check (type in ('test_ordered', 'result_pending', 'followup_due', 'vaccine_due', 'reminder')),
  title text not null check (char_length(title) between 1 and 120),
  detail text check (detail is null or char_length(detail) <= 240),
  opened_on date not null default current_date,
  due_by date,
  status text not null default 'open' check (status in ('open', 'closed', 'dismissed')),
  source_document_id uuid references documents (id) on delete set null,
  source_message_id uuid references messages (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, key)
);

alter table open_loops enable row level security;

drop policy if exists "users manage own loops" on open_loops;
create policy "users manage own loops" on open_loops for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists open_loops_plan_scope_trigger on open_loops;
create trigger open_loops_plan_scope_trigger before insert on open_loops for each row
execute function enforce_document_plan_scope ();

commit;
