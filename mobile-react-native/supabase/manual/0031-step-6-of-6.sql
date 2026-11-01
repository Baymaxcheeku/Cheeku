-- 0031 step 6 of 6. Run the steps in order, each in a new query. Safe to run again.
begin;

create table if not exists privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('access', 'correction', 'erasure', 'grievance', 'nomination', 'withdrawal')),
  details text check (details is null or char_length(details) <= 2000),
  status text not null default 'received' check (status in ('received', 'in_progress', 'resolved', 'rejected')),
  response text check (response is null or char_length(response) <= 2000),
  due_by date not null default (current_date + 90),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists privacy_requests_user_idx on privacy_requests (user_id, created_at desc);

alter table privacy_requests enable row level security;

drop policy if exists "users read own privacy requests" on privacy_requests;
create policy "users read own privacy requests" on privacy_requests for select using (auth.uid() = user_id);

drop policy if exists "users open own privacy requests" on privacy_requests;
create policy "users open own privacy requests" on privacy_requests for insert
with
  check (
    auth.uid() = user_id
    and status = 'received'
    and response is null
    and resolved_at is null
  );

create table if not exists account_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (
    kind in (
      'sign_in', 'sign_out', 'signed_out_other_devices', 'password_reset_requested',
      'app_lock_on', 'app_lock_off', 'consent_granted', 'consent_withdrawn',
      'data_exported', 'cache_cleared', 'privacy_request'
    )
  ),
  source text check (source is null or source in ('ios', 'android', 'web')),
  device text check (device is null or char_length(device) <= 80),
  app_version text check (app_version is null or char_length(app_version) <= 32),
  detail text check (detail is null or char_length(detail) <= 200),
  created_at timestamptz not null default now()
);

create index if not exists account_activity_user_idx on account_activity (user_id, created_at desc);

alter table account_activity enable row level security;

drop policy if exists "users read own activity" on account_activity;
create policy "users read own activity" on account_activity for select using (auth.uid() = user_id);

drop policy if exists "users append own activity" on account_activity;
create policy "users append own activity" on account_activity for insert
with
  check (auth.uid() = user_id);

drop policy if exists "users erase own activity" on account_activity;
create policy "users erase own activity" on account_activity for delete using (auth.uid() = user_id);

commit;
