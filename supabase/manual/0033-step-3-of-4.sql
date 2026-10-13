-- 0033 step 3 of 4. Run the steps in order, each in a new query. Safe to run again.
begin;

create or replace function home_state () returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_fam families;
  v_rules jsonb;
  v_signals jsonb;
  v_decision jsonb;
  v_rank_old int;
  v_rank_new int;
  v_due jsonb := '[]'::jsonb;
  v_done jsonb := '[]'::jsonb;
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
begin
  if v_user is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;

  select * into v_fam from families where owner_id = v_user order by created_at limit 1;
  if not found then
    return jsonb_build_object('stage', 'starter', 'stage_at', null, 'unlocked_via', null, 'signals', '{}'::jsonb, 'unlock_items', 1, 'due', '[]'::jsonb, 'done_days', '[]'::jsonb);
  end if;

  select value into v_rules from app_config where key = 'home_stage';
  v_rules := coalesce(v_rules, '{"unlock_items": 1}'::jsonb);

  if v_fam.home_stage <> 'today' then
    v_signals := home_signals(v_user, coalesce((v_rules -> 'chat_unlock' ->> 'enabled')::boolean, false));
    v_decision := home_decide(v_signals, v_rules);
    v_rank_old := array_position(array['starter', 'building', 'today'], v_fam.home_stage);
    v_rank_new := array_position(array['starter', 'building', 'today'], v_decision ->> 'stage');
    if v_rank_new > v_rank_old then
      update families
      set home_stage = v_decision ->> 'stage',
          home_stage_at = now(),
          today_unlocked_via = case when v_decision ->> 'stage' = 'today' then v_decision ->> 'via' else today_unlocked_via end
      where id = v_fam.id
      returning * into v_fam;
    end if;
  end if;

  if v_fam.home_stage = 'today' then
    select coalesce(jsonb_agg(x order by x ->> 'due_by'), '[]'::jsonb) into v_due
    from (
      select * from (
        select jsonb_build_object(
          'id', l.id, 'source', 'loop', 'type', l.type, 'profile_id', l.profile_id,
          'title', l.title, 'detail', l.detail, 'due_by', l.due_by
        ) as x
        from open_loops l
        where l.user_id = v_user and l.status = 'open' and l.due_by is not null and l.due_by <= v_today + 14
        union all
        select jsonb_build_object(
          'id', b.id, 'source', 'lab', 'type', 'lab_visit', 'profile_id', b.profile_id,
          'title', coalesce((select string_agg(t.name, ', ') from lab_tests t where t.id = any (b.tests)), 'Lab tests'),
          'detail', b.slot_window, 'due_by', b.slot_date
        ) as x
        from lab_bookings b
        where b.user_id = v_user and b.status in ('booked', 'assigned') and b.slot_date >= v_today and b.slot_date <= v_today + 14
      ) u
      order by x ->> 'due_by'
      limit 12
    ) d;

    select coalesce(jsonb_agg(day order by day desc), '[]'::jsonb) into v_done
    from (
      select distinct a.day from today_actions a
      where a.user_id = v_user and a.status = 'done' and a.day > v_today - 35
    ) t;
  end if;

  return jsonb_build_object(
    'stage', v_fam.home_stage,
    'stage_at', v_fam.home_stage_at,
    'unlocked_via', v_fam.today_unlocked_via,
    'signals', coalesce(v_signals, '{}'::jsonb),
    'unlock_items', greatest(1, coalesce((v_rules ->> 'unlock_items')::int, 1)),
    'today', v_today,
    'due', v_due,
    'done_days', v_done
  );
end;
$$;

revoke execute on function home_state () from public, anon;
grant execute on function home_state () to authenticated;

commit;
