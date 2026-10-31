-- 0033 step 2 of 4. Run the steps in order, each in a new query. Safe to run again.
begin;

create or replace function home_signals (p_user uuid, p_with_chat boolean default false) returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'report', exists (
      select 1 from documents d
      where d.user_id = p_user and d.doc_type in ('lab_report', 'discharge')
    ),
    'prescription', exists (
      select 1 from documents d
      where d.user_id = p_user and d.doc_type in ('prescription', 'medication')
    ),
    'medicines', exists (
      select 1 from profiles p
      where p.user_id = p_user and jsonb_typeof(p.medications) = 'array' and jsonb_array_length(p.medications) > 0
    ),
    'due', exists (
      select 1 from open_loops l
      where l.user_id = p_user and l.status = 'open' and l.due_by is not null
    ),
    'lab', exists (
      select 1 from lab_bookings b
      where b.user_id = p_user and b.status in ('booked', 'assigned', 'collected', 'processing', 'ready')
    ),
    'family', (select count(*) from profiles p where p.user_id = p_user) > 1,
    'asked', exists (
      select 1 from messages m where m.user_id = p_user and m.role = 'user'
    ),
    'chats', case when p_with_chat then (
      select count(*) from (select 1 from messages m where m.user_id = p_user and m.role = 'user' limit 200) c
    ) else null end,
    'chat_days', case when p_with_chat then (
      select count(distinct (m.created_at at time zone 'Asia/Kolkata')::date)
      from (select created_at from messages where user_id = p_user and role = 'user' order by created_at desc limit 200) m
    ) else null end,
    'facts', case when p_with_chat then (
      select count(*) from (select 1 from memory_facts f where f.user_id = p_user and f.superseded_by is null limit 200) c
    ) else null end
  );
$$;

revoke execute on function home_signals (uuid, boolean) from public, anon, authenticated;

create or replace function home_decide (p_signals jsonb, p_rules jsonb) returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  v_kinds text[] := array['report', 'prescription', 'medicines', 'due', 'lab'];
  v_k text;
  v_items int := 0;
  v_via text;
  v_need int := greatest(1, coalesce((p_rules ->> 'unlock_items')::int, 1));
  v_chat jsonb := coalesce(p_rules -> 'chat_unlock', '{}'::jsonb);
begin
  foreach v_k in array v_kinds loop
    if coalesce((p_signals ->> v_k)::boolean, false) then
      v_items := v_items + 1;
      v_via := coalesce(v_via, v_k);
    end if;
  end loop;

  if v_items >= v_need then
    return jsonb_build_object('stage', 'today', 'via', v_via, 'items', v_items);
  end if;

  if coalesce((v_chat ->> 'enabled')::boolean, false)
     and coalesce((p_signals ->> 'chats')::int, 0) >= coalesce((v_chat ->> 'chats')::int, 5)
     and coalesce((p_signals ->> 'chat_days')::int, 0) >= coalesce((v_chat ->> 'days')::int, 2)
     and coalesce((p_signals ->> 'facts')::int, 0) >= coalesce((v_chat ->> 'facts')::int, 3) then
    return jsonb_build_object('stage', 'today', 'via', 'chat', 'items', v_items);
  end if;

  if v_items > 0
     or coalesce((p_signals ->> 'asked')::boolean, false)
     or coalesce((p_signals ->> 'family')::boolean, false) then
    return jsonb_build_object('stage', 'building', 'via', null, 'items', v_items);
  end if;

  return jsonb_build_object('stage', 'starter', 'via', null, 'items', 0);
end;
$$;

commit;
