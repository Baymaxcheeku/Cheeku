-- Meter the model call itself, and give free families 20 chats a day.
--
-- Until now the daily allowance was spent when a message row was saved. The
-- model is called BEFORE that save, so the allowance never stood between an
-- account and the model: anyone signed in could call cheeku-chat in a loop and
-- get answers that were simply never saved. cheeku-chat now asks
-- claim_model_call() first and forwards nothing it refuses.
--
-- ┌─ TWO COUNTERS, ON PURPOSE ───────────────────────────────────────────────┐
-- │                                                                          │
-- │ subscriptions.chats_used_this_month stays the allowance people see: one │
-- │ per saved question, never for an emergency, spent by the trigger.        │
-- │ model_calls is the meter: one row per call that reached the model, kept  │
-- │ for 35 days, with no message content. The claim reads the allowance and │
-- │ refuses a free family that has spent it, so the two cannot drift apart   │
-- │ in the family's disfavour. Free families also get a model ceiling a      │
-- │ little above the allowance, for answers whose save then failed.         │
-- │                                                                          │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- Emergencies never reach the model (the app answers them before any call),
-- so nothing here can stand between someone and a 112 card.
--
-- The limits live in app_config('chat_limits'), so changing them later is an
-- update to one row. FREE_CHAT_LIMIT in src/lib/billing/plans.ts mirrors
-- free_daily for display and the pre-check: change both together.

-- ------------------------------------------------------------ 1. limits --

insert into app_config (key, value, note)
values (
  'chat_limits',
  '{"free_daily": 20, "free_model_extra": 5, "per_minute": 6, "per_hour": 60, "paid_model_daily": 300}'::jsonb,
  'free_daily: chats a day on Free (mirrors FREE_CHAT_LIMIT). free_model_extra: model calls a free family may make beyond that, for answers that failed to save. per_minute, per_hour: burst limits for everyone. paid_model_daily: fair-use ceiling on paid plans.'
)
on conflict (key) do nothing;

-- Defaults are the fallback when the row is missing or a key is removed, so a
-- bad edit to the row can loosen nothing below these.
create or replace function chat_limits () returns jsonb
set
  search_path = public as $$
  select '{"free_daily": 20, "free_model_extra": 5, "per_minute": 6, "per_hour": 60, "paid_model_daily": 300}'::jsonb
         || coalesce((select value from app_config where key = 'chat_limits'), '{}'::jsonb);
$$ language sql stable security definer;

revoke execute on function chat_limits () from public, anon, authenticated;

-- ------------------------------------------------------------- 2. meter --

create table if not exists model_calls (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now(),
  tier text not null
);

create index if not exists model_calls_user_at_idx on model_calls (user_id, at desc);

alter table model_calls enable row level security;

-- People can see their own meter (for an export); nobody writes it except
-- claim_model_call().
drop policy if exists "users read own model calls" on model_calls;
create policy "users read own model calls" on model_calls for select using (auth.uid() = user_id);

-- --------------------------------------------------------- 3. the claim --
--
-- Returns {"ok": true, "tier": ..., "remaining_today": n|null} or
-- {"ok": false, "reason": "quota"|"per_minute"|"per_hour"|"daily", "retry_after": seconds}.
-- A refusal is a normal answer, not an exception, so the function can map it
-- to a status without parsing error text.
create or replace function claim_model_call () returns jsonb
set
  search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_limits jsonb := chat_limits();
  v_tier text;
  v_free boolean;
  v_used int := 0;
  v_minute int;
  v_hour int;
  v_today int;
  v_ceiling int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  -- One claim at a time per account, so two calls fired together can't both
  -- read "5 of 6" and both go through.
  perform pg_advisory_xact_lock(hashtext('model_calls:' || v_uid::text));

  v_tier := effective_tier(v_uid);
  v_free := v_tier not in ('micro', 'solo', 'family');

  if v_free then
    select case when s.period_start < current_date then 0 else coalesce(s.chats_used_this_month, 0) end
      into v_used
    from subscriptions s
    join families f on f.id = s.family_id
    where f.owner_id = v_uid
    limit 1;
    v_used := coalesce(v_used, 0);
    if v_used >= (v_limits ->> 'free_daily')::int then
      return jsonb_build_object('ok', false, 'reason', 'quota', 'retry_after', extract(epoch from (date_trunc('day', now()) + interval '1 day' - now()))::int);
    end if;
  end if;

  select count(*) filter (where at > now() - interval '1 minute'),
         count(*) filter (where at > now() - interval '1 hour'),
         count(*) filter (where at >= date_trunc('day', now()))
    into v_minute, v_hour, v_today
  from model_calls
  where user_id = v_uid and at > least(now() - interval '1 hour', date_trunc('day', now()));

  if v_minute >= (v_limits ->> 'per_minute')::int then
    return jsonb_build_object('ok', false, 'reason', 'per_minute', 'retry_after', 60);
  end if;
  if v_hour >= (v_limits ->> 'per_hour')::int then
    return jsonb_build_object('ok', false, 'reason', 'per_hour', 'retry_after', 600);
  end if;

  v_ceiling := case when v_free
    then (v_limits ->> 'free_daily')::int + (v_limits ->> 'free_model_extra')::int
    else (v_limits ->> 'paid_model_daily')::int end;
  if v_today >= v_ceiling then
    return jsonb_build_object('ok', false, 'reason', 'daily', 'retry_after', extract(epoch from (date_trunc('day', now()) + interval '1 day' - now()))::int);
  end if;

  insert into model_calls (user_id, tier) values (v_uid, v_tier);

  -- Keep the meter small: this account's rows older than 35 days go now,
  -- through the same index the counts above used.
  delete from model_calls where user_id = v_uid and at < now() - interval '35 days';

  return jsonb_build_object(
    'ok', true,
    'tier', v_tier,
    'remaining_today', case when v_free then (v_limits ->> 'free_daily')::int - v_used else null end
  );
end;
$$ language plpgsql volatile security definer;

revoke execute on function claim_model_call () from public, anon;
grant execute on function claim_model_call () to authenticated;

comment on function claim_model_call () is 'Called by cheeku-chat before every model call, with the caller''s own JWT. Refuses a spent free allowance, bursts and the daily ceiling; otherwise records one model_calls row. Limits come from chat_limits().';

-- ----------------------------------------- 4. the allowance reads config --
--
-- Same function as 0022 with one change: the limit comes from chat_limits()
-- instead of a literal 5. The two rules that matter most are untouched: an
-- assistant reply is never charged, and an escalated message is never charged.
create
or replace function enforce_chat_quota () returns trigger
set
  search_path = public as $$
declare
  v_family uuid;
  v_row subscriptions%rowtype;
  v_period date := current_date;
  v_used int;
  v_limit int := (chat_limits() ->> 'free_daily')::int;
begin
  -- 'escalated' is the column's spelling, not the client type's 'escalate'.
  if new.role <> 'user' or new.safety_status = 'escalated' then
    return new;
  end if;

  if effective_tier(new.user_id) in ('micro', 'solo', 'family') then
    return new;
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

  v_used := case when v_row.period_start < v_period then 0 else v_row.chats_used_this_month end;

  if v_used >= v_limit then
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

comment on function enforce_chat_quota () is 'Atomically spends one chat per user message. Escalations and assistant replies are free. The allowance is DAILY; its size is chat_limits() ->> free_daily (20), mirrored by FREE_CHAT_LIMIT in the app.';
