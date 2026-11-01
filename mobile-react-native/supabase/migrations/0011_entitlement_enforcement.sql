-- Move the two entitlement decisions off the client and into the database.
--
-- On web these ran in server actions, where the client could not reach them.
-- The React Native port has no server, so both ended up executing on the phone
-- — and a bundle on a phone is a file, not a secret. PLAN.md Phase 4 item 2
-- tracked this as the one guarantee the port lost.
--
-- PLAN.md proposed an Edge Function. This does it in the database instead, for
-- three reasons. Both decisions are already writes to tables the database owns,
-- so a trigger enforces them on EVERY insert rather than on the ones a client
-- chooses to route through a function — a check the caller can decline to
-- invoke is not a check. It is atomic: the chat counter is read and written
-- under one row lock, closing a check-then-write race the web version actually
-- had. And it needs no second deployment target; the migration runner already
-- ships schema.
--
-- Every function here is SECURITY DEFINER, so RLS does not apply inside it and
-- each one scopes itself explicitly. `search_path` is pinned on all of them: a
-- SECURITY DEFINER function with a caller-controlled search_path is a
-- privilege-escalation primitive, because the caller picks which `profiles`
-- table it resolves to.
--
-- None of this is access control. RLS already bounds every row to the caller's
-- own account, and storage policies bind every object key to their own prefix.
-- What these close is paywall evasion WITHIN one's own family — real, bounded,
-- and not a privacy breach.

-- ----------------------------------------------------------------- seats --
-- Mirrors `seatsFor()` in lib/billing/plans.ts. Only the Family plan holds more
-- than one person; free, the Daily pass and Solo are all one seat.
create function entitlement_seats (p_tier text) returns int
set
  search_path = public as $$
  select case when p_tier = 'family' then 4 else 1 end;
$$ language sql immutable;

comment on function entitlement_seats (text) is 'Family members a tier covers. Mirrors seatsFor() in lib/billing/plans.ts. Takes an ALREADY-RESOLVED tier: pass effective_tier(), never subscriptions.tier, or a lapsed Daily pass keeps its seats.';

-- ------------------------------------------------------------ the tier --
-- The family's effective tier, with the same lapse rule as the read path.
-- Duplicated from that path deliberately: an elapsed Daily pass that still
-- reported its stored tier would keep handing out whatever it entitled,
-- forever, because nothing rewrites the row on read.
-- No family row or no subscription row means billing has never been set up,
-- which is free rather than an error: someone mid-provisioning should not be
-- locked out of their own primary profile.
create function effective_tier (p_user_id uuid) returns text
set
  search_path = public as $$
  select coalesce(
    (
      select case
        when s.tier = 'micro' and (s.expires_at is null or s.expires_at <= now()) then 'free'
        else s.tier
      end
      from subscriptions s
      join families f on f.id = s.family_id
      where f.owner_id = p_user_id
      limit 1
    ),
    'free'
  );
$$ language sql stable security definer;

-- --------------------------------------------------- plan-scoped profiles --
-- Which profiles the family's current plan actually covers.
--
-- The ordering is load-bearing and must match `familyProfiles()` in
-- lib/profiles/context.ts exactly: primary first, then oldest first. If the two
-- disagree, the client shows one member unlocked while the database enforces a
-- different one, and the reader is told to upgrade for someone already visible.
create function covered_profile_ids (p_user_id uuid) returns setof uuid
set
  search_path = public as $$
  select p.id
  from profiles p
  where p.user_id = p_user_id
  order by p.is_primary desc, p.created_at asc
  limit (select entitlement_seats(effective_tier(p_user_id)));
$$ language sql stable security definer;

comment on function covered_profile_ids (uuid) is 'Profiles the caller''s plan covers, in the same order as familyProfiles(). Keep that ordering in step or the UI and the enforcement disagree.';

-- ------------------------------------------------- documents: plan scope --
-- The client keeps its own copy of this check in lib/records/upload.ts. That
-- copy is for the error message — it can name the plan and offer the upgrade,
-- where a trigger can only refuse. It is UX. This is the enforcement.
create function enforce_document_plan_scope () returns trigger
set
  search_path = public as $$
begin
  if not exists (
    select 1 from covered_profile_ids(new.user_id) as covered(id)
    where covered.id = new.profile_id
  ) then
    raise exception 'profile % is not covered by the current plan', new.profile_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger documents_plan_scope_trigger before insert on documents for each row
execute function enforce_document_plan_scope ();

comment on function enforce_document_plan_scope () is 'Refuses a document filed against a profile the plan does not cover.';

-- ---------------------------------------------------- messages: the quota --
-- Spending a chat is a side effect of the message existing, so it belongs on
-- the insert rather than in a function the app calls first. A client that skips
-- an RPC still writes the row; a client that skips this writes nothing.
--
-- `for update` is why this is atomic. The web version read the count, compared
-- it, then wrote it back, so two sends racing each other both passed the
-- comparison and the second overwrote the first's increment. Under a five-chat
-- allowance that is not a rounding error.
--
-- TWO ROWS ARE NEVER CHARGED. Only `role = 'user'` counts, so the assistant
-- reply inserted in the same call is free, and an escalation is free as well:
-- an emergency turn is recorded for audit, not sold. It must never be refused
-- for want of quota, which is the one refusal here that could matter to
-- someone's safety.
create function enforce_chat_quota () returns trigger
set
  search_path = public as $$
declare
  v_family uuid;
  v_row subscriptions%rowtype;
  v_period date := date_trunc('month', current_date)::date;
  v_used int;
begin
  -- 'escalated' is the column's spelling, not the client type's 'escalate'.
  -- Getting this wrong charges an emergency turn against the allowance and can
  -- refuse one outright, which is the single most costly failure in this file.
  if new.role <> 'user' or new.safety_status = 'escalated' then
    return new;
  end if;

  if effective_tier(new.user_id) in ('micro', 'solo', 'family') then
    return new; -- no ceiling, so nothing to count
  end if;

  select f.id into v_family from families f where f.owner_id = new.user_id limit 1;
  if v_family is null then
    return new; -- no family yet; provisioning is not a reason to refuse
  end if;

  select * into v_row from subscriptions where family_id = v_family for update;

  if not found then
    insert into subscriptions (family_id, tier, chats_used_this_month, period_start)
    values (v_family, 'free', 1, v_period);
    return new;
  end if;

  -- A counter belonging to a month that has ended starts again from zero. This
  -- is where the reset happens: the read path deliberately does not write.
  v_used := case when v_row.period_start < v_period then 0 else v_row.chats_used_this_month end;

  if v_used >= 5 then
    raise exception 'free chat allowance exhausted'
      using errcode = 'check_violation';
  end if;

  update subscriptions
  set chats_used_this_month = v_used + 1,
      period_start = v_period
  where family_id = v_family;

  return new;
end;
$$ language plpgsql security definer;

create trigger messages_chat_quota_trigger before insert on messages for each row
execute function enforce_chat_quota ();

comment on function enforce_chat_quota () is 'Atomically spends one chat per user message. Escalations and assistant replies are free. FREE_CHAT_LIMIT is duplicated here as 5; change both together.';

-- Nothing here is called by the app. `covered_profile_ids` in particular takes
-- a user id rather than reading auth.uid(), because a trigger has to ask about
-- the row being inserted — so an exposed version would let any caller enumerate
-- another account's profile ids.
revoke execute on function entitlement_seats (text) from public;
revoke execute on function effective_tier (uuid) from public;
revoke execute on function covered_profile_ids (uuid) from public;
