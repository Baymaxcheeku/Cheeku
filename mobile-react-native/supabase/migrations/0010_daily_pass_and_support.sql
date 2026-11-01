-- Two additions: an expiry for the Daily pass, and somewhere for support
-- tickets to actually land.

-- ---------------------------------------------------------- the daily pass --
-- The `micro` tier has existed in the check constraint since 0004 but was never
-- wired to anything. It is now the ₹29/day pass, and a pass that lasts a day
-- needs to know when the day ends — every other tier renews rather than
-- expiring, so this is null for them.
--
-- Entitlement treats an elapsed `expires_at` as "back to free" on read. The row
-- is deliberately NOT rewritten on read: a page load that silently mutates
-- billing state is a page load nobody can reason about during an incident.
alter table subscriptions
  add column expires_at timestamptz;

-- ------------------------------------------------------------ support tickets --
-- The Help & Support screen's "Report an issue" wrote to nothing before this.
-- A support form that discards what someone typed is worse than no form: they
-- believe help is coming.
--
-- Deliberately holds NO health data — a category, a free-text description the
-- user chose to write, and which app version they were on. Support staff
-- diagnosing a crash have no business reading lab results, and the export/
-- delete paths in lib/account/actions.ts cover this table like any other.
create table support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null check (
    category in ('bug', 'not_working', 'billing', 'account', 'feature', 'other')
  ),
  subject text not null check (char_length(subject) between 1 and 140),
  body text not null check (char_length(body) between 1 and 4000),
  app_version text,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

create index support_tickets_user_idx on support_tickets (user_id, created_at desc);

alter table support_tickets enable row level security;

create policy "users read own tickets" on support_tickets for select using (auth.uid() = user_id);

create policy "users open own tickets" on support_tickets for insert
with
  check (auth.uid() = user_id);

-- No update policy: a ticket is a record of what was reported at the time.
-- Deletion is allowed so account deletion can cascade cleanly.
create policy "users delete own tickets" on support_tickets for delete using (auth.uid() = user_id);
