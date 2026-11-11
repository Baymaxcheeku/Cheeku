-- Waitlist for the landing page. Paste into the Supabase SQL editor and Run.
-- Safe to run again.
--
-- The website's public key can add a row and nothing else: it cannot read,
-- change or delete the list. You read it in Table Editor > waitlist.

begin;

create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) between 5 and 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'),
  audience text not null default 'family' check (audience in ('family', 'business', 'investor')),
  -- Which button they came from, e.g. "closing:nav" or "closing:top".
  source text check (source is null or char_length(source) <= 40),
  created_at timestamptz not null default now(),
  unique (email, audience)
);

alter table waitlist enable row level security;

drop policy if exists "anyone can join" on waitlist;
create policy "anyone can join" on waitlist for insert to anon with check (true);

revoke all on waitlist from anon, authenticated;
grant insert (email, audience, source) on waitlist to anon;

commit;

-- Check: should show one row, "anyone can join".
select policyname from pg_policies where tablename = 'waitlist';
