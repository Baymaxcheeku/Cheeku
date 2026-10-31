-- Baymax data model, part 33: Home grows into Today, once there is something to show.
--
-- WHY. Today is the daily loop: one step, what is due for the family, and an
-- alert when something slips. For a family with no records it can only show
-- generic advice, which is worse than not showing it. So Home has three stages:
--
--   starter   nothing usable yet       chat-first Home, "unlock your daily plan"
--   building  some activity, no data   same, with the unlock checklist part done
--   today     real data exists         the Today Home
--
-- WHAT UNLOCKS TODAY. Real, dated data only, never chat volume on its own:
-- a lab report or discharge summary, a prescription, declared medicines, an
-- open loop with a due date (a test ordered, a follow-up, a vaccine), or a lab
-- visit booked. One of them is enough by default. Chat still counts when it
-- saves something real: a medicine or a test mentioned in chat lands in memory
-- as a medicine or an open loop, and those count.
--
-- SCALE. The stage is stored on the family and only ever moves forward, so a
-- family on Today is never evaluated again: home_state() returns early. Only
-- starter and building families run the checks, and those are EXISTS probes on
-- indexed columns for accounts that by definition hold almost nothing.
--
-- TUNING. The rules live in app_config, readable only by the functions here.
-- Changing the threshold, or switching on a chat-volume unlock, is an UPDATE,
-- not an app release.

-- ------------------------------------------------------------- 1. config --

create table if not exists app_config (
  key text primary key,
  value jsonb not null,
  note text,
  updated_at timestamptz not null default now()
);

-- Deny-all, like app_flags: no policies, so nothing through PostgREST reads or
-- writes it. Only SECURITY DEFINER functions below read it.
alter table app_config enable row level security;

insert into app_config (key, value, note)
values (
  'home_stage',
  '{"unlock_items": 1, "chat_unlock": {"enabled": false, "chats": 5, "days": 2, "facts": 3}}'::jsonb,
  'unlock_items: how many kinds of real data (report, prescription, medicines, due item, lab visit) unlock Today. chat_unlock: a second way in by chat volume, off by default by product decision 2026-10-13.'
)
on conflict (key) do nothing;

-- ------------------------------------------------------- 2. the stage --

alter table families add column if not exists home_stage text not null default 'starter';
alter table families drop constraint if exists families_home_stage_check;
alter table families add constraint families_home_stage_check check (home_stage in ('starter', 'building', 'today'));
alter table families add column if not exists home_stage_at timestamptz;
alter table families add column if not exists today_unlocked_via text;

comment on column families.home_stage is 'Which Home this family sees. Only moves forward: starter, building, today. Set by home_state().';
comment on column families.today_unlocked_via is 'What unlocked Today: report, prescription, medicines, due, lab, chat or backfill.';

-- ------------------------------------------------------ 3. step log --

-- One row per member, day and step: what the person did with Today's step.
-- Feeds the streak and keeps a step that was done or put off from coming back
-- the same day.
create table if not exists today_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  day date not null,
  step_key text not null check (step_key ~ '^[a-z0-9_:.-]{1,80}$'),
  status text not null check (status in ('done', 'later')),
  created_at timestamptz not null default now(),
  unique (profile_id, day, step_key)
);

create index if not exists today_actions_user_day_idx on today_actions (user_id, day desc);

alter table today_actions enable row level security;

drop policy if exists "users manage own today actions" on today_actions;
-- The profile must be one of the user's own, not just any id the client names.
create policy "users manage own today actions" on today_actions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and exists (select 1 from profiles p where p.id = profile_id and p.user_id = auth.uid()));

-- The probes below and the due list read these.
create index if not exists open_loops_user_due_idx on open_loops (user_id, due_by) where status = 'open' and due_by is not null;
create index if not exists lab_bookings_user_status_idx on lab_bookings (user_id, status);

-- ------------------------------------------------------ 4. the signals --

-- What a user's account holds, as booleans plus the chat counts. Internal:
-- called by home_state() and the backfill, never by the app directly.
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

-- The pure decision, kept separate so the backfill and home_state() agree.
-- Mirrors decideStage() in mobile-react-native/src/lib/home/stage.ts.
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

-- ---------------------------------------------------------- 5. the call --

-- Everything Home needs to choose a stage, in one round trip.
--
--   stage, stage_at, unlocked_via
--   signals          only while not on Today (the unlock checklist)
--   unlock_items     the threshold, so the checklist can say "1 more"
--   due              on Today: the family's dated items for the next 14 days and
--                    anything overdue, up to 12, soonest first
--   done_days        on Today: days in the last 35 with a step done, for the streak
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

  -- Only families not yet on Today are evaluated. The stage only moves forward.
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

-- ---------------------------------------------------------- 6. backfill --

-- Families that already hold real data go straight to Today, marked 'backfill'
-- so the numbers can tell an unlock from a migration. Everyone else starts at
-- starter or building and is promoted on their next Home load.
with decided as (
  select f.id, home_decide(home_signals(f.owner_id, false), coalesce((select value from app_config where key = 'home_stage'), '{"unlock_items": 1}'::jsonb)) as d
  from families f
  where f.home_stage = 'starter'
)
update families f
set home_stage = decided.d ->> 'stage',
    home_stage_at = now(),
    today_unlocked_via = case when decided.d ->> 'stage' = 'today' then 'backfill' else null end
from decided
where f.id = decided.id and decided.d ->> 'stage' <> 'starter';
