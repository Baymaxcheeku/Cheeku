-- Baymax data model, part 2: uploads and the facts extracted from them.
--
-- The original document is sacred: `storage_path` and `raw_text` are written
-- once at ingest and never rewritten by extraction. Corrections land in
-- `extraction`, so a user can always be shown what the source actually said.

-- --------------------------------------------------------------- documents --

create table documents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  mime_type text not null check (
    mime_type in ('image/jpeg', 'image/png', 'image/heic', 'application/pdf')
  ),
  doc_type text not null default 'other' check (
    doc_type in (
      'lab_report',
      'prescription',
      'discharge',
      'scan',
      'bill',
      'vaccination',
      'other'
    )
  ),
  status text not null default 'processing' check (status in ('processing', 'needs_review', 'filed')),
  event_date date,
  facility text,
  doctor text,
  extraction jsonb,
  confidence numeric check (
    confidence is null
    or confidence between 0 and 1
  ),
  raw_text text,
  created_at timestamptz not null default now()
);

create index documents_profile_event_idx on documents (profile_id, event_date desc);
create index documents_user_id_idx on documents (user_id);

alter table documents enable row level security;

create policy "users read own documents" on documents for select using (auth.uid() = user_id);

create policy "users insert own documents" on documents for insert
with
  check (auth.uid() = user_id);

create policy "users update own documents" on documents
for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users delete own documents" on documents for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------- entities --
-- Normalised health facts. `canonical_name` is what we trend on; `name` is what
-- the document actually printed, so the UI can show the user's own wording.

create table entities (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id uuid references documents (id) on delete cascade,
  kind text not null check (
    kind in ('lab_value', 'medication', 'condition', 'vital', 'vaccine')
  ),
  name text not null,
  canonical_name text,
  value numeric,
  value_text text,
  unit text,
  ref_range text,
  flag text check (flag in ('normal', 'high', 'low', 'caution')),
  event_date date,
  created_at timestamptz not null default now()
);

create index entities_profile_event_idx on entities (profile_id, event_date desc);
create index entities_document_id_idx on entities (document_id);
create index entities_canonical_name_idx on entities (profile_id, canonical_name);

alter table entities enable row level security;

create policy "users read own entities" on entities for select using (auth.uid() = user_id);

create policy "users insert own entities" on entities for insert
with
  check (auth.uid() = user_id);

create policy "users update own entities" on entities
for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users delete own entities" on entities for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------- timeline_events --

create table timeline_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  title text not null,
  summary text,
  event_date date not null,
  source_document_id uuid references documents (id) on delete set null,
  created_at timestamptz not null default now()
);

create index timeline_events_profile_event_idx on timeline_events (profile_id, event_date desc);

alter table timeline_events enable row level security;

create policy "users read own timeline events" on timeline_events for select using (auth.uid() = user_id);

create policy "users insert own timeline events" on timeline_events for insert
with
  check (auth.uid() = user_id);

create policy "users update own timeline events" on timeline_events
for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users delete own timeline events" on timeline_events for delete using (auth.uid() = user_id);
