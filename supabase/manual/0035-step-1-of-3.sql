-- 0035 step 1 of 3. Run the steps in order, each in a new query. Safe to run again.
begin;

insert into app_config (key, value, note)
values (
  'chat_limits',
  '{"free_daily": 20, "free_model_extra": 5, "per_minute": 6, "per_hour": 60, "paid_model_daily": 300}'::jsonb,
  'free_daily: chats a day on Free (mirrors FREE_CHAT_LIMIT). free_model_extra: model calls a free family may make beyond that, for answers that failed to save. per_minute, per_hour: burst limits for everyone. paid_model_daily: fair-use ceiling on paid plans.'
)
on conflict (key) do nothing;

create or replace function chat_limits () returns jsonb
set
  search_path = public as $$
  select '{"free_daily": 20, "free_model_extra": 5, "per_minute": 6, "per_hour": 60, "paid_model_daily": 300}'::jsonb
         || coalesce((select value from app_config where key = 'chat_limits'), '{}'::jsonb);
$$ language sql stable security definer;

revoke execute on function chat_limits () from public, anon, authenticated;

create table if not exists model_calls (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now(),
  tier text not null
);

create index if not exists model_calls_user_at_idx on model_calls (user_id, at desc);

alter table model_calls enable row level security;

drop policy if exists "users read own model calls" on model_calls;
create policy "users read own model calls" on model_calls for select using (auth.uid() = user_id);

commit;
