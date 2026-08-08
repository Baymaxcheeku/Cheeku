-- A tier writer for the pre-launch demo, and a switch to turn it off.
--
-- ┌─ THIS FUNCTION GRANTS PAID TIERS FOR FREE ───────────────────────────────┐
-- │                                                                          │
-- │ That is its entire purpose while there is no payment provider: the       │
-- │ paywall has to be walkable end to end for the build to be reviewable.    │
-- │ It is not a hole in a payment system, because there is no payment        │
-- │ system yet and nobody has ever been charged.                             │
-- │                                                                          │
-- │ IT BECOMES ONE THE DAY BILLING IS REAL. Before Phase 6 ships, set        │
-- │ app_flags.demo_billing to false and drop this function. The flag exists  │
-- │ so that is one statement rather than an archaeology exercise, and so     │
-- │ the kill switch can be thrown from the database without a client         │
-- │ release. Tracked in PLAN.md under Phase 6.                               │
-- │                                                                          │
-- └──────────────────────────────────────────────────────────────────────────┘

create table app_flags (
  key text primary key,
  enabled boolean not null default false,
  note text
);

-- Deny-all: no policies at all, so nothing reaching PostgREST can read or write
-- this. The only reader is the SECURITY DEFINER function below, which runs as
-- the owner and is not subject to RLS. A client that could flip its own feature
-- flags is a client that has no flags.
alter table app_flags enable row level security;

insert into app_flags (key, enabled, note)
values (
  'demo_billing',
  true,
  'Lets activate_tier_demo grant paid tiers without payment. MUST be false before real billing ships.'
);

comment on table app_flags is 'Server-side switches. RLS on with no policies: deny-all through the API, readable only by SECURITY DEFINER functions.';

-- ------------------------------------------------------- the demo activation --
-- Mirrors `activateTier()` in the web build's lib/billing/quota.ts, which runs
-- with the service-role key. That key cannot exist in a mobile bundle — it
-- would let every installed copy grant itself any tier — so the write lives
-- here and derives the family from auth.uid() rather than trusting an argument.
--
-- Refuses when the flag is off, rather than silently doing nothing. A checkout
-- that reports success while changing no entitlement is the worst of both: the
-- reader believes they paid and the app disagrees.
create function activate_tier_demo (p_tier text) returns boolean
set
  search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_family uuid;
  v_expires timestamptz;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;

  if not exists (select 1 from app_flags where key = 'demo_billing' and enabled) then
    raise exception 'demo billing is disabled' using errcode = 'insufficient_privilege';
  end if;

  if p_tier not in ('micro', 'solo', 'family') then
    raise exception 'unknown tier %', p_tier using errcode = 'check_violation';
  end if;

  select f.id into v_family from families f where f.owner_id = v_user limit 1;
  if v_family is null then
    raise exception 'no family for this account' using errcode = 'no_data_found';
  end if;

  /*
   * Only the Daily pass carries an expiry, and every other tier sets it back to
   * NULL explicitly rather than leaving whatever was there. Upgrading from a
   * lapsed pass to Family must not inherit its dead expiry, or the new
   * subscription reads as already over the moment it is bought.
   */
  v_expires := case when p_tier = 'micro' then now() + interval '24 hours' else null end;

  insert into subscriptions (family_id, tier, chats_used_this_month, period_start, expires_at)
  values (v_family, p_tier, 0, date_trunc('month', current_date)::date, v_expires)
  on conflict (family_id) do update
    set tier = excluded.tier,
        chats_used_this_month = 0,
        period_start = excluded.period_start,
        expires_at = excluded.expires_at;

  return true;
end;
$$ language plpgsql security definer;

comment on function activate_tier_demo (text) is 'PRE-LAUNCH ONLY. Grants a paid tier with no payment, gated by app_flags.demo_billing. Drop this before real billing ships.';

revoke execute on function activate_tier_demo (text) from public;
grant execute on function activate_tier_demo (text) to authenticated;
