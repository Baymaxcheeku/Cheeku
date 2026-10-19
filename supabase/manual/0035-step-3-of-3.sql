-- 0035 step 3 of 3. Run the steps in order, each in a new query. Safe to run again.
begin;

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

commit;
