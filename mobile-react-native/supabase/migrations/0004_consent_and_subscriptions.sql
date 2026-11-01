-- Baymax data model, part 4: DPDP consent and plan state.

-- ------------------------------------------------------------- consent_log --
-- Append-only by policy. A consent record that can be edited or deleted is
-- worthless as evidence under the DPDP Act, so there is no update or delete
-- policy here — not even for the user who owns the row. Erasure requests are
-- handled by the account-deletion path, which drops the auth user and cascades.

create table consent_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  consent_type text not null,
  version text not null,
  granted boolean not null,
  granted_at timestamptz not null default now()
);

create index consent_log_user_idx on consent_log (user_id, granted_at desc);

alter table consent_log enable row level security;

create policy "users read own consent log" on consent_log for select using (auth.uid() = user_id);

create policy "users append own consent log" on consent_log for insert
with
  check (auth.uid() = user_id);

-- ----------------------------------------------------------- subscriptions --
-- Owned by the family, not the profile: one plan covers everyone on it.
-- Quota counters are written server-side only; the client can read them to
-- render the paywall but must never be the source of truth for entitlement.

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null unique references families (id) on delete cascade,
  tier text not null default 'free' check (tier in ('free', 'micro', 'solo', 'family')),
  chats_used_this_month int not null default 0 check (chats_used_this_month >= 0),
  micro_credits int not null default 0 check (micro_credits >= 0),
  period_start date not null default current_date,
  created_at timestamptz not null default now()
);

create index subscriptions_family_idx on subscriptions (family_id);

alter table subscriptions enable row level security;

create policy "users read own subscription" on subscriptions for select using (
  exists (
    select
      1
    from
      families f
    where
      f.id = subscriptions.family_id
      and f.owner_id = auth.uid ()
  )
);

create policy "users insert own subscription" on subscriptions for insert
with
  check (
    exists (
      select
        1
      from
        families f
      where
        f.id = subscriptions.family_id
        and f.owner_id = auth.uid ()
    )
  );

-- No update or delete policy: tier and quota changes go through the server
-- using the service-role key after a verified payment webhook. A client that
-- could write its own tier is a client that could grant itself a free plan.
