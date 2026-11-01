-- 0030 step 1 of 6. Run the steps in order, each in a new query. Safe to run again.
begin;

alter table profiles add column if not exists birth jsonb;
alter table profiles add column if not exists country_of_care text;

create table if not exists profile_relations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  related_profile_id uuid not null references profiles (id) on delete cascade,
  type text not null check (type in ('mother', 'father', 'parent', 'child', 'spouse', 'sibling', 'other')),
  created_at timestamptz not null default now(),
  unique (profile_id, related_profile_id),
  check (profile_id <> related_profile_id)
);

alter table profile_relations enable row level security;

drop policy if exists "users manage own relations" on profile_relations;
create policy "users manage own relations" on profile_relations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function enforce_relation_owner () returns trigger
set
  search_path = public as $$
begin
  if (select count(*) from profiles where id in (new.profile_id, new.related_profile_id) and user_id = new.user_id) <> 2 then
    raise exception 'both members must belong to this account' using errcode = 'check_violation';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists profile_relations_owner_trigger on profile_relations;
create trigger profile_relations_owner_trigger before insert or update on profile_relations for each row
execute function enforce_relation_owner ();

commit;
