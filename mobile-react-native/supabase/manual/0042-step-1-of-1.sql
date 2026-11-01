-- 0042 step 1 of 1. Prescription scorecards: the table that keeps each card,
-- its access rules, and the trigger that clears a card when its prescription is
-- edited. Paste into the Supabase SQL editor and Run. Safe to run again.
-- Then run 0042-check.sql, and deploy the rx-score function (see the PR).

begin;

-- Prescription scorecards (loop-reading-v2, ai-rx-score).
--
-- Every medicine on a prescription is read down to its salts and checked on
-- ten standards against the person's own records: salts identified, banned
-- combinations, allergies, other medicines, dose for age and weight, doubles,
-- conditions, pregnancy and breastfeeding, reports, and clear instructions.
-- The rules live in supabase/functions/rx-score/rx.ts, shared by the rx-score
-- Edge Function and the app; this migration only keeps the result.
--
-- WHY KEEP IT. The card is the same on every phone the family uses, it opens
-- instantly the second time, and the version column lets a rules change mark
-- old cards for re-scoring without touching the records.
--
-- WHAT IS STORED. The card as the person saw it: verdicts, the findings'
-- plain sentences and the questions for the doctor. It holds medicine names
-- and values already in their own records, nothing new. It is theirs: RLS
-- keys it to the signed-in account, like documents, and it goes when the
-- prescription or the account goes (cascade).

create table if not exists rx_scorecards (
  document_id uuid primary key references documents (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  user_id uuid not null default auth.uid () references auth.users (id) on delete cascade,
  version int not null,
  score int not null check (score between 0 and 10),
  verdict text not null check (verdict in ('fits', 'sort', 'stop', 'partial')),
  card jsonb not null check (jsonb_typeof(card) = 'object' and pg_column_size(card) <= 64000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rx_scorecards_profile_idx on rx_scorecards (profile_id);
create index if not exists rx_scorecards_user_idx on rx_scorecards (user_id);

alter table rx_scorecards enable row level security;

drop policy if exists "users read own scorecards" on rx_scorecards;
create policy "users read own scorecards" on rx_scorecards for select using (auth.uid () = user_id);

-- A card can only be written for a prescription the person owns, and only for
-- the member that prescription belongs to.
drop policy if exists "users write own scorecards" on rx_scorecards;
create policy "users write own scorecards" on rx_scorecards for insert
with check (
  auth.uid () = user_id
  and exists (
    select 1 from documents d
    where d.id = rx_scorecards.document_id and d.user_id = auth.uid () and d.profile_id = rx_scorecards.profile_id and d.doc_type = 'prescription'
  )
);

drop policy if exists "users refresh own scorecards" on rx_scorecards;
create policy "users refresh own scorecards" on rx_scorecards for update
using (auth.uid () = user_id)
with check (
  auth.uid () = user_id
  and exists (
    select 1 from documents d
    where d.id = rx_scorecards.document_id and d.user_id = auth.uid () and d.profile_id = rx_scorecards.profile_id and d.doc_type = 'prescription'
  )
);

drop policy if exists "users delete own scorecards" on rx_scorecards;
create policy "users delete own scorecards" on rx_scorecards for delete using (auth.uid () = user_id);

create or replace function rx_scorecards_touch () returns trigger
language plpgsql
set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists rx_scorecards_touch_trigger on rx_scorecards;
create trigger rx_scorecards_touch_trigger before update on rx_scorecards for each row execute function rx_scorecards_touch ();

-- A prescription that is edited (moved to another member, retyped, its
-- medicines corrected) loses its card, so the next open scores it afresh.
create or replace function rx_scorecards_forget () returns trigger
language plpgsql
security definer
set search_path = public as $$
begin
  if new.extraction is distinct from old.extraction or new.profile_id is distinct from old.profile_id or new.doc_type is distinct from old.doc_type then
    delete from rx_scorecards where document_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists rx_scorecards_forget_trigger on documents;
create trigger rx_scorecards_forget_trigger after update on documents for each row execute function rx_scorecards_forget ();

revoke execute on function rx_scorecards_forget () from public, anon, authenticated;
revoke execute on function rx_scorecards_touch () from public, anon, authenticated;

grant select, insert, update, delete on rx_scorecards to authenticated;

commit;
