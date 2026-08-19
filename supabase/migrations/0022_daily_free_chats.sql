-- The free allowance resets every DAY, not every month.
--
-- Five chats a month is not a trial of a health companion, it is a
-- demonstration that one exists: a person with a worrying result burns all five
-- in one evening and then has no reason to open the app again for four weeks.
-- Five a day is a product somebody can live with, and the plans then sell what
-- they actually sell — no ceiling, and the family.
--
-- ┌─ WHAT CHANGES, AND WHAT DELIBERATELY DOES NOT ───────────────────────────┐
-- │                                                                          │
-- │ The period becomes current_date instead of date_trunc('month', ...).     │
-- │ Everything else in the function is untouched, including the two rules    │
-- │ that matter most: an assistant reply is never charged, and a message     │
-- │ that tripped the emergency gate is never charged. Somebody describing    │
-- │ chest pain must not be refused because they have already asked five      │
-- │ questions today.                                                         │
-- │                                                                          │
-- │ The COLUMN keeps its name. `chats_used_this_month` now counts a day,     │
-- │ which is a lie in the identifier and a comment away from being clear;    │
-- │ renaming it would touch 0004, 0011, 0012 and 0015 plus both clients, and │
-- │ a rename that misses one caller silently resets a counter. The comment   │
-- │ below is the fix until there is a reason to open all of them at once.    │
-- │                                                                          │
-- │ The limit stays duplicated here as 5, matching FREE_CHAT_LIMIT in the    │
-- │ app. Same warning as 0011: change both together.                         │
-- │                                                                          │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- Existing rows need no migration. A row whose period_start is any earlier date
-- now reads as elapsed, so the first message today starts the count at zero —
-- which is the correct outcome for everybody: nobody loses an allowance they
-- had not spent, and nobody carries a spent one across the change.
create
or replace function enforce_chat_quota () returns trigger
set
  search_path = public as $$
declare
  v_family uuid;
  v_row subscriptions%rowtype;
  v_period date := current_date;
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
    return new;
  end if;

  select * into v_row from subscriptions s where s.family_id = v_family;

  if not found then
    insert into subscriptions (family_id, tier, chats_used_this_month, period_start)
    values (v_family, 'free', 1, v_period);
    return new;
  end if;

  -- A counter belonging to a day that has ended starts again from zero. This is
  -- where the reset happens: the read path deliberately does not write.
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

comment on function enforce_chat_quota () is 'Atomically spends one chat per user message. Escalations and assistant replies are free. The allowance is DAILY and FREE_CHAT_LIMIT is duplicated here as 5; change both together.';

comment on column subscriptions.chats_used_this_month is 'Chats spent in the current period. The period is a DAY as of migration 0022 — the column name predates that and is kept to avoid a rename across four migrations and two clients.';
