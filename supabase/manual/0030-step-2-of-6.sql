-- 0030 step 2 of 6. Run the steps in order, each in a new query. Safe to run again.
begin;

create table if not exists pregnancies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  lmp date,
  edd date,
  datings jsonb not null default '[]'::jsonb check (jsonb_typeof(datings) = 'array'),
  baby_name text check (baby_name is null or char_length(baby_name) <= 80),
  status text not null default 'ongoing' check (status in ('ongoing', 'delivered', 'ended')),
  delivered_on date,
  delivery_mode text check (delivery_mode is null or char_length(delivery_mode) <= 40),
  ga_at_birth_days int check (ga_at_birth_days is null or ga_at_birth_days between 140 and 310),
  birth_weight_kg numeric(4, 2) check (birth_weight_kg is null or birth_weight_kg between 0.3 and 7),
  child_profile_id uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (lmp is not null or edd is not null or jsonb_array_length(datings) > 0)
);

create unique index if not exists pregnancies_one_ongoing on pregnancies (profile_id) where status = 'ongoing';

alter table pregnancies enable row level security;

drop policy if exists "users manage own pregnancies" on pregnancies;
create policy "users manage own pregnancies" on pregnancies for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists pregnancies_plan_scope_trigger on pregnancies;
create trigger pregnancies_plan_scope_trigger before insert on pregnancies for each row
execute function enforce_document_plan_scope ();

commit;
