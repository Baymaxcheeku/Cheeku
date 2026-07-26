-- Baymax data model, part 1: the account and the isolation boundary.
--
-- RLS is enabled and policied in the same file as the table it protects, per
-- the build spec. No table ever ships without policies: no policy means no
-- access, and "using (true)" is banned everywhere.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- families --

create table families (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'micro', 'solo', 'family')),
  created_at timestamptz not null default now()
);

create index families_owner_id_idx on families (owner_id);

alter table families enable row level security;

create policy "users read own family" on families for select using (auth.uid() = owner_id);

create policy "users insert own family" on families for insert with check (auth.uid() = owner_id);

create policy "users update own family" on families
for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "users delete own family" on families for delete using (auth.uid() = owner_id);

-- ---------------------------------------------------------------- profiles --
-- Up to 6 per family. This is THE isolation boundary: every downstream table
-- carries profile_id and is filtered by user_id at the policy layer.

create table profiles (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  dob date,
  sex text check (sex in ('female', 'male', 'other', 'prefer_not_to_say')),
  relationship text,
  avatar_ring text,
  is_primary boolean not null default false,
  conditions text[] not null default '{}',
  medications jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index profiles_user_id_idx on profiles (user_id);
create index profiles_family_id_idx on profiles (family_id);

-- One primary profile per family.
create unique index profiles_one_primary_per_family_idx on profiles (family_id)
where
  is_primary;

-- Enforce the 6-profile cap in the database, not just the UI.
create function enforce_profile_limit () returns trigger
set
  search_path = public as $$
begin
  if (select count(*) from profiles where family_id = new.family_id) >= 6 then
    raise exception 'a family may have at most 6 profiles';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger profiles_limit_trigger before insert on profiles for each row
execute function enforce_profile_limit ();

alter table profiles enable row level security;

create policy "users read own profiles" on profiles for select using (auth.uid() = user_id);

create policy "users insert own profiles" on profiles for insert
with
  check (auth.uid() = user_id);

create policy "users update own profiles" on profiles
for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users delete own profiles" on profiles for delete using (auth.uid() = user_id);
