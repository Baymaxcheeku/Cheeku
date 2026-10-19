-- 0034 step 1 of 2. Run the steps in order, each in a new query. Safe to run again.
begin;

create table if not exists daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  day date not null check (day > date '2024-01-01'),
  task_key text not null check (task_key ~ '^[a-z0-9_:.-]{1,80}$'),
  pillar text not null check (pillar in ('move', 'eat', 'sleep', 'mind', 'check')),
  kind text not null check (kind in ('steps', 'meal', 'reading', 'rating', 'timer', 'habit', 'note')),
  slot text check (slot is null or slot in ('breakfast', 'lunch', 'snacks', 'dinner', 'drinks')),
  value numeric check (value is null or (value >= 0 and value < 1000000)),
  value_text text check (value_text is null or char_length(value_text) <= 200),
  unit text check (unit is null or char_length(unit) <= 20),
  tags text[] not null default '{}' check (cardinality(tags) <= 20),
  photo_path text check (
    photo_path is null
    or (photo_path like user_id::text || '/' || profile_id::text || '/daily/%' and char_length(photo_path) <= 300)
  ),
  analysis jsonb,
  created_at timestamptz not null default now()
);

create index if not exists daily_logs_profile_day_idx on daily_logs (profile_id, day desc);
create index if not exists daily_logs_user_day_idx on daily_logs (user_id, day desc);

alter table daily_logs enable row level security;

drop policy if exists "users manage own daily logs" on daily_logs;
create policy "users manage own daily logs" on daily_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and exists (select 1 from profiles p where p.id = profile_id and p.user_id = auth.uid()));

create or replace function daily_logs_strip_analysis () returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.analysis := case when tg_op = 'UPDATE' then old.analysis else null end;
  end if;
  return new;
end;
$$;

drop trigger if exists daily_logs_strip_analysis_trigger on daily_logs;
create trigger daily_logs_strip_analysis_trigger before insert or update on daily_logs for each row
execute function daily_logs_strip_analysis ();

create or replace function daily_logs_cap () returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from daily_logs where profile_id = new.profile_id and day = new.day) >= 80 then
    raise exception 'too many logs for one day' using errcode = 'P0001', hint = 'daily_cap';
  end if;
  return new;
end;
$$;

revoke execute on function daily_logs_cap () from public, anon, authenticated;

drop trigger if exists daily_logs_cap_trigger on daily_logs;
create trigger daily_logs_cap_trigger before insert on daily_logs for each row
execute function daily_logs_cap ();

drop trigger if exists daily_logs_plan_scope_trigger on daily_logs;
create trigger daily_logs_plan_scope_trigger before insert on daily_logs for each row
execute function enforce_document_plan_scope ();

do $$
begin
  if to_regprocedure('enforce_core_consent()') is not null then
    execute 'drop trigger if exists daily_logs_consent_guard on daily_logs';
    execute 'create trigger daily_logs_consent_guard before insert on daily_logs for each row execute function enforce_core_consent()';
  end if;
end $$;

commit;
