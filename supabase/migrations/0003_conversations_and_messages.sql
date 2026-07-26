-- Baymax data model, part 3: chat with grounding.

-- ----------------------------------------------------------- conversations --

create table conversations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  created_at timestamptz not null default now()
);

create index conversations_profile_created_idx on conversations (profile_id, created_at desc);

alter table conversations enable row level security;

create policy "users read own conversations" on conversations for select using (auth.uid() = user_id);

create policy "users insert own conversations" on conversations for insert
with
  check (auth.uid() = user_id);

create policy "users update own conversations" on conversations
for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users delete own conversations" on conversations for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------- messages --
-- `citations` is [{document_id, label}]. `safety_status` records what the
-- client-side gate decided, so an escalation is auditable after the fact.

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  citations jsonb not null default '[]'::jsonb,
  safety_status text not null default 'clear' check (safety_status in ('clear', 'tier2', 'escalated')),
  created_at timestamptz not null default now()
);

create index messages_conversation_created_idx on messages (conversation_id, created_at);

alter table messages enable row level security;

create policy "users read own messages" on messages for select using (auth.uid() = user_id);

create policy "users insert own messages" on messages for insert
with
  check (auth.uid() = user_id);

-- Messages are an append-only transcript. Deliberately no update policy: an
-- edited transcript cannot be trusted as a safety audit trail.
create policy "users delete own messages" on messages for delete using (auth.uid() = user_id);
