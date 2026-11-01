-- 0033 step 1 of 4. Run the steps in order, each in a new query. Safe to run again.
begin;

create table if not exists app_config (
  key text primary key,
  value jsonb not null,
  note text,
  updated_at timestamptz not null default now()
);

alter table app_config enable row level security;

insert into app_config (key, value, note)
values (
  'home_stage',
  '{"unlock_items": 1, "chat_unlock": {"enabled": false, "chats": 5, "days": 2, "facts": 3}}'::jsonb,
  'unlock_items: how many kinds of real data (report, prescription, medicines, due item, lab visit) unlock Today. chat_unlock: a second way in by chat volume, off by default by product decision 2026-10-13.'
)
on conflict (key) do nothing;

alter table families add column if not exists home_stage text not null default 'starter';
alter table families drop constraint if exists families_home_stage_check;
alter table families add constraint families_home_stage_check check (home_stage in ('starter', 'building', 'today'));
alter table families add column if not exists home_stage_at timestamptz;
alter table families add column if not exists today_unlocked_via text;

create table if not exists today_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  day date not null,
  step_key text not null check (step_key ~ '^[a-z0-9_:.-]{1,80}$'),
  status text not null check (status in ('done', 'later')),
  created_at timestamptz not null default now(),
  unique (profile_id, day, step_key)
);

create index if not exists today_actions_user_day_idx on today_actions (user_id, day desc);

alter table today_actions enable row level security;

drop policy if exists "users manage own today actions" on today_actions;
create policy "users manage own today actions" on today_actions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and exists (select 1 from profiles p where p.id = profile_id and p.user_id = auth.uid()));

create index if not exists open_loops_user_due_idx on open_loops (user_id, due_by) where status = 'open' and due_by is not null;
create index if not exists lab_bookings_user_status_idx on lab_bookings (user_id, status);

commit;
