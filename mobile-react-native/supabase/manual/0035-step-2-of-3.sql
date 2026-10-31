-- 0035 step 2 of 3. Run the steps in order, each in a new query. Safe to run again.
begin;

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

commit;
