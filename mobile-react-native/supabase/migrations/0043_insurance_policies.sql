-- Insurance policies, one place for the whole family (profile-insurance).
--
-- WHY A TABLE AND NOT A RECORD. Insurance used to be a document type
-- (0028), which needs a file and belongs to one member. A family floater
-- covers several people, plenty of people know their policy number and
-- sum insured without the PDF to hand, and a partner feed (a TPA or an
-- aggregator, later) will hand us fields, not a file. So a policy is a row
-- of its own: typed in, read from an uploaded document, or one day fed by a
-- partner (`source`), with the members it covers listed by id.
--
-- WHAT IS STORED. What the person told us about their own policy: insurer,
-- policy number, type, cover and what is used of it, dates, premium, the TPA,
-- room rent and co-pay terms, waiting periods, what it says it covers and
-- what it excludes. No claim documents and no diagnosis. Keyed to the
-- account by RLS like documents; it goes when the account goes (cascade).
-- The chat reads it only to explain the person's own cover back to them.

create table if not exists insurance_policies (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null default auth.uid () references auth.users (id) on delete cascade,
  insurer text not null check (char_length(insurer) between 1 and 120),
  plan text check (plan is null or char_length(plan) <= 120),
  policy_no text not null check (char_length(policy_no) between 1 and 60),
  policy_type text not null default 'individual' check (policy_type in ('family_floater', 'individual', 'group', 'top_up')),
  sum_insured numeric not null check (sum_insured >= 0 and sum_insured < 10000000000),
  claimed numeric not null default 0 check (claimed >= 0 and claimed < 10000000000),
  start_date date,
  end_date date,
  premium_amount numeric check (premium_amount is null or (premium_amount >= 0 and premium_amount < 100000000)),
  premium_frequency text check (premium_frequency is null or premium_frequency in ('yearly', 'monthly', 'quarterly')),
  tpa_name text check (tpa_name is null or char_length(tpa_name) <= 120),
  tpa_phone text check (tpa_phone is null or char_length(tpa_phone) <= 30),
  cashless boolean,
  co_pay text check (co_pay is null or char_length(co_pay) <= 120),
  room_rent text check (room_rent is null or char_length(room_rent) <= 120),
  -- [{ "label": "Pre-existing conditions", "until": "2027-04-01" }]
  waiting jsonb not null default '[]' check (jsonb_typeof(waiting) = 'array' and pg_column_size(waiting) <= 8000),
  -- Benefit keys the policy says it includes: "maternity", "day_care", ...
  benefits jsonb not null default '[]' check (jsonb_typeof(benefits) = 'array' and pg_column_size(benefits) <= 4000),
  -- Plain lines from the policy's exclusions list.
  exclusions jsonb not null default '[]' check (jsonb_typeof(exclusions) = 'array' and pg_column_size(exclusions) <= 8000),
  notes text check (notes is null or char_length(notes) <= 1000),
  covered_profile_ids uuid[] not null default '{}',
  document_id uuid references documents (id) on delete set null,
  source text not null default 'manual' check (source in ('manual', 'document', 'partner')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date),
  check (cardinality(covered_profile_ids) <= 12)
);

create index if not exists insurance_policies_user_idx on insurance_policies (user_id);
create index if not exists insurance_policies_covered_idx on insurance_policies using gin (covered_profile_ids);

alter table insurance_policies enable row level security;

drop policy if exists "users read own policies" on insurance_policies;
create policy "users read own policies" on insurance_policies for select using (auth.uid () = user_id);

-- Written only by the owner, only naming the owner's own family members, and
-- only pointing at the owner's own document.
drop policy if exists "users add own policies" on insurance_policies;
create policy "users add own policies" on insurance_policies for insert
with check (
  auth.uid () = user_id
  and not exists (
    select 1 from unnest(insurance_policies.covered_profile_ids) as c (pid)
    where not exists (select 1 from profiles p where p.id = c.pid and p.user_id = auth.uid ())
  )
  and (document_id is null or exists (select 1 from documents d where d.id = insurance_policies.document_id and d.user_id = auth.uid ()))
);

drop policy if exists "users edit own policies" on insurance_policies;
create policy "users edit own policies" on insurance_policies for update
using (auth.uid () = user_id)
with check (
  auth.uid () = user_id
  and not exists (
    select 1 from unnest(insurance_policies.covered_profile_ids) as c (pid)
    where not exists (select 1 from profiles p where p.id = c.pid and p.user_id = auth.uid ())
  )
  and (document_id is null or exists (select 1 from documents d where d.id = insurance_policies.document_id and d.user_id = auth.uid ()))
);

drop policy if exists "users delete own policies" on insurance_policies;
create policy "users delete own policies" on insurance_policies for delete using (auth.uid () = user_id);

create or replace function insurance_policies_touch () returns trigger
language plpgsql
set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists insurance_policies_touch_trigger on insurance_policies;
create trigger insurance_policies_touch_trigger before update on insurance_policies for each row execute function insurance_policies_touch ();

-- A removed family member drops off every policy that listed them, so no
-- policy points at someone who is gone.
create or replace function insurance_policies_forget_member () returns trigger
language plpgsql
security definer
set search_path = public as $$
begin
  update insurance_policies set covered_profile_ids = array_remove(covered_profile_ids, old.id)
  where user_id = old.user_id and old.id = any (covered_profile_ids);
  return old;
end;
$$;

drop trigger if exists insurance_policies_forget_member_trigger on profiles;
create trigger insurance_policies_forget_member_trigger after delete on profiles for each row execute function insurance_policies_forget_member ();

revoke execute on function insurance_policies_touch () from public, anon, authenticated;
revoke execute on function insurance_policies_forget_member () from public, anon, authenticated;

grant select, insert, update, delete on insurance_policies to authenticated;
