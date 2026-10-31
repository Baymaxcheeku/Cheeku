-- 0030: THE MEMORY LAYER.
--
-- Cheeku is a longitudinal memory for a household: every record, every
-- reading said in a chat, every test ordered, read against a clock that means
-- something for that person. The logic lives in the app
-- (mobile-react-native/src/lib/memory, spec in docs/health-memory-layer-spec.md);
-- this migration gives it somewhere to keep what it learns.
--
--   1. profiles.birth          what a newborn inherited from the pregnancy
--   2. profile_relations       mother, father, child: the subject graph
--   3. pregnancies             a baby inside the mother's timeline, until birth
--   4. memory_facts            readings said in the chat (BP 99/64, weight 3.3 kg)
--   5. open_loops              chat reminders, and "done" on a derived loop
--   6. messages.tier/memory    the urgency tier and structured answer per reply
--   7. conversations.last_message_at, and chat_thread() for one continuous thread
--   8. memory_bundle()         one member's whole memory in one call
--   9. promote_pregnancy()     the birth: a new member who carries the context
--
-- Safe to run again: every statement is if-not-exists or create-or-replace.
-- Every new table is RLS-scoped to the account and plan-scoped by the same
-- trigger documents use, so a member the plan does not cover cannot gain
-- memories through the back door.

-- ------------------------------------------------------------ 1. profiles --

alter table profiles add column if not exists birth jsonb;
alter table profiles add column if not exists country_of_care text;

comment on column profiles.birth is 'Set at promote_pregnancy: {pregnancy_id, mother_id, ga_at_birth_days, delivery_mode, birth_weight_kg, maternal_blood_group, in_utero_medicines[]}.';

-- -------------------------------------------------------- 2. relations --

create table if not exists profile_relations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  related_profile_id uuid not null references profiles (id) on delete cascade,
  type text not null check (type in ('mother', 'father', 'parent', 'child', 'spouse', 'sibling', 'other')),
  created_at timestamptz not null default now(),
  unique (profile_id, related_profile_id),
  check (profile_id <> related_profile_id)
);

alter table profile_relations enable row level security;

drop policy if exists "users manage own relations" on profile_relations;
create policy "users manage own relations" on profile_relations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Both ends must be the same account's members. RLS checks user_id, not that
-- the two profile ids are really this account's.
create or replace function enforce_relation_owner () returns trigger
set
  search_path = public as $$
begin
  if (select count(*) from profiles where id in (new.profile_id, new.related_profile_id) and user_id = new.user_id) <> 2 then
    raise exception 'both members must belong to this account' using errcode = 'check_violation';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists profile_relations_owner_trigger on profile_relations;
create trigger profile_relations_owner_trigger before insert or update on profile_relations for each row
execute function enforce_relation_owner ();

-- ------------------------------------------------------- 3. pregnancies --

create table if not exists pregnancies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  lmp date,
  edd date,
  -- [{date, ga_days, source: scan|lmp|clinician, label, document_id}]
  datings jsonb not null default '[]'::jsonb check (jsonb_typeof(datings) = 'array'),
  baby_name text check (baby_name is null or char_length(baby_name) <= 80),
  status text not null default 'ongoing' check (status in ('ongoing', 'delivered', 'ended')),
  delivered_on date,
  delivery_mode text check (delivery_mode is null or char_length(delivery_mode) <= 40),
  ga_at_birth_days int check (ga_at_birth_days is null or ga_at_birth_days between 140 and 310),
  birth_weight_kg numeric(4, 2) check (birth_weight_kg is null or birth_weight_kg between 0.3 and 7),
  child_profile_id uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (lmp is not null or edd is not null or jsonb_array_length(datings) > 0)
);

create unique index if not exists pregnancies_one_ongoing on pregnancies (profile_id) where status = 'ongoing';

alter table pregnancies enable row level security;

drop policy if exists "users manage own pregnancies" on pregnancies;
create policy "users manage own pregnancies" on pregnancies for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists pregnancies_plan_scope_trigger on pregnancies;
create trigger pregnancies_plan_scope_trigger before insert on pregnancies for each row
execute function enforce_document_plan_scope ();

-- ------------------------------------------------------------- 4. facts --

create table if not exists memory_facts (
  -- Client-generated, so the answer that used a fact can name it before the
  -- insert returns.
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  key text not null check (key ~ '^[a-z0-9_]{1,40}$'),
  label text not null check (char_length(label) between 1 and 80),
  value numeric,
  value_text text check (value_text is null or char_length(value_text) <= 80),
  unit text check (unit is null or char_length(unit) <= 20),
  observed_on date not null,
  source text not null default 'chat' check (source in ('chat', 'device')),
  message_id uuid references messages (id) on delete set null,
  superseded_by uuid references memory_facts (id) on delete set null,
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  check (value is not null or value_text is not null)
);

create index if not exists memory_facts_profile_key_idx on memory_facts (profile_id, key, observed_on);

alter table memory_facts enable row level security;

drop policy if exists "users manage own facts" on memory_facts;
create policy "users manage own facts" on memory_facts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists memory_facts_plan_scope_trigger on memory_facts;
create trigger memory_facts_plan_scope_trigger before insert on memory_facts for each row
execute function enforce_document_plan_scope ();

-- --------------------------------------------------------- 5. open loops --

create table if not exists open_loops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  key text not null check (char_length(key) between 1 and 160),
  type text not null default 'reminder' check (type in ('test_ordered', 'result_pending', 'followup_due', 'vaccine_due', 'reminder')),
  title text not null check (char_length(title) between 1 and 120),
  detail text check (detail is null or char_length(detail) <= 240),
  opened_on date not null default current_date,
  due_by date,
  status text not null default 'open' check (status in ('open', 'closed', 'dismissed')),
  source_document_id uuid references documents (id) on delete set null,
  source_message_id uuid references messages (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, key)
);

alter table open_loops enable row level security;

drop policy if exists "users manage own loops" on open_loops;
create policy "users manage own loops" on open_loops for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists open_loops_plan_scope_trigger on open_loops;
create trigger open_loops_plan_scope_trigger before insert on open_loops for each row
execute function enforce_document_plan_scope ();

-- ---------------------------------------------------------- 6. messages --

alter table messages add column if not exists tier text;
alter table messages drop constraint if exists messages_tier_check;
alter table messages add constraint messages_tier_check check (tier is null or tier in ('reassure', 'monitor', 'contact_today', 'go_now'));
-- The structured half of an answer: what it read, the script, loops, revisions.
-- The prose stays in `content`, readable without the app.
alter table messages add column if not exists memory jsonb;
alter table messages add column if not exists model_id text;

-- -------------------------------------------------- 7. the thread --

alter table conversations add column if not exists last_message_at timestamptz;

update conversations c
set last_message_at = coalesce((select max(m.created_at) from messages m where m.conversation_id = c.id), c.created_at)
where c.last_message_at is null;

create index if not exists conversations_profile_last_idx on conversations (profile_id, last_message_at desc);

create or replace function touch_conversation () returns trigger
set
  search_path = public as $$
begin
  update conversations set last_message_at = new.created_at where id = new.conversation_id and (last_message_at is null or last_message_at < new.created_at);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists messages_touch_conversation_trigger on messages;
create trigger messages_touch_conversation_trigger after insert on messages for each row
execute function touch_conversation ();

-- One member's chat as a single continuous thread, newest first, in pages.
create or replace function chat_thread (p_profile uuid, p_before timestamptz default null, p_limit int default 40) returns setof jsonb
security definer
set
  search_path = public as $$
  select to_jsonb(x) from (
    select m.id, m.conversation_id, m.role, m.content, m.citations, m.safety_status, m.tier, m.memory,
           m.attachment, m.product_assessment, m.created_at
    from messages m
    join conversations c on c.id = m.conversation_id
    where c.profile_id = p_profile
      and c.user_id = auth.uid()
      and m.user_id = auth.uid()
      and p_profile in (select covered_profile_ids(auth.uid()))
      and (p_before is null or m.created_at < p_before)
    order by m.created_at desc, m.role asc
    limit least(greatest(coalesce(p_limit, 40), 1), 200)
  ) x;
$$ language sql stable;

revoke execute on function chat_thread (uuid, timestamptz, int) from public, anon;
grant execute on function chat_thread (uuid, timestamptz, int) to authenticated;

-- ------------------------------------------------------------ 8. bundle --

create or replace function memory_bundle (p_profile uuid) returns jsonb
security definer
set
  search_path = public as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'sign in first' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from profiles where id = p_profile and user_id = v_user)
     or p_profile not in (select covered_profile_ids(v_user)) then
    return null;
  end if;

  return jsonb_build_object(
    'profile', (
      select to_jsonb(p) from (
        select id, name, relationship, is_primary, dob, sex, blood_group, height_cm, weight_kg,
               conditions, allergies, medications, birth, country_of_care
        from profiles where id = p_profile
      ) p
    ),
    -- Relatives: name and blood group ONLY. Nothing else of theirs crosses over.
    'relations', coalesce((
      select jsonb_agg(jsonb_build_object('related_profile_id', r.related_profile_id, 'type', r.type, 'name', o.name, 'blood_group', o.blood_group))
      from profile_relations r join profiles o on o.id = r.related_profile_id
      where r.profile_id = p_profile and r.user_id = v_user
    ), '[]'::jsonb),
    'pregnancies', coalesce((
      select jsonb_agg(to_jsonb(g) order by g.created_at desc)
      from (
        select id, profile_id, lmp, edd, datings, baby_name, status, delivered_on, delivery_mode, ga_at_birth_days, birth_weight_kg, child_profile_id, created_at
        from pregnancies where profile_id = p_profile and user_id = v_user
      ) g
    ), '[]'::jsonb),
    'documents', coalesce((
      select jsonb_agg(to_jsonb(d) order by d.event_date desc nulls last, d.created_at desc)
      from (
        select id, doc_type, status, event_date, facility, doctor, created_at,
               extraction ->> 'title' as title,
               extraction -> 'details' as details
        from documents
        where profile_id = p_profile and user_id = v_user
      ) d
    ), '[]'::jsonb),
    'entities', coalesce((
      select jsonb_agg(to_jsonb(e))
      from (
        select id, document_id, kind, name, canonical_name, value, value_text, unit, ref_range, flag, event_date
        from entities
        where profile_id = p_profile and user_id = v_user
        order by event_date nulls last
        limit 3000
      ) e
    ), '[]'::jsonb),
    'facts', coalesce((
      select jsonb_agg(to_jsonb(f) order by f.observed_on, f.created_at)
      from (
        select id, key, label, value, value_text, unit, observed_on, source, message_id, superseded_by, created_at
        from memory_facts
        where profile_id = p_profile and user_id = v_user
        order by observed_on desc
        limit 2000
      ) f
    ), '[]'::jsonb),
    'loops', coalesce((
      select jsonb_agg(to_jsonb(l))
      from (
        select key, type, title, detail, opened_on, due_by, status, source_document_id
        from open_loops where profile_id = p_profile and user_id = v_user
      ) l
    ), '[]'::jsonb),
    'stats', (
      select jsonb_build_object(
        'records', (select count(*) from documents where profile_id = p_profile and user_id = v_user),
        'conversations', count(distinct c.id),
        'messages', count(m.id),
        'first_message_at', min(m.created_at)
      )
      from conversations c left join messages m on m.conversation_id = c.id
      where c.profile_id = p_profile and c.user_id = v_user
    )
  );
end;
$$ language plpgsql stable;

revoke execute on function memory_bundle (uuid) from public, anon;
grant execute on function memory_bundle (uuid) to authenticated;

-- --------------------------------------------------------- 9. the birth --
--
-- The baby already existed as a pregnancy in the mother's file. At birth they
-- become a member of their own, CARRYING the context: mother's blood group,
-- weeks at birth, how they were delivered, birth weight, and the medicines on
-- the mother's list. The seat limit still applies: a full plan refuses here
-- with the same message as adding anyone else.

create or replace function promote_pregnancy (
  p_pregnancy uuid,
  p_name text,
  p_dob date,
  p_sex text default null,
  p_delivery_mode text default null,
  p_birth_weight_kg numeric default null,
  p_ga_at_birth_days int default null
) returns uuid
security definer
set
  search_path = public as $$
declare
  v_user uuid := auth.uid();
  g pregnancies%rowtype;
  m profiles%rowtype;
  v_child uuid;
  v_ga int;
  v_meds jsonb;
begin
  if v_user is null then
    raise exception 'sign in first' using errcode = 'insufficient_privilege';
  end if;
  select * into g from pregnancies where id = p_pregnancy and user_id = v_user for update;
  if not found then
    raise exception 'no such pregnancy' using errcode = 'no_data_found';
  end if;
  if g.status <> 'ongoing' then
    raise exception 'this pregnancy is already closed' using errcode = 'check_violation';
  end if;
  if p_name is null or char_length(trim(p_name)) = 0 then
    raise exception 'the baby needs a name, even a nickname' using errcode = 'check_violation';
  end if;
  if p_dob is null or p_dob > current_date then
    raise exception 'the birth date cannot be in the future' using errcode = 'check_violation';
  end if;
  select * into m from profiles where id = g.profile_id and user_id = v_user;

  -- Weeks at birth: what they said, else from the scan dating, else the LMP.
  v_ga := coalesce(
    p_ga_at_birth_days,
    (select (d ->> 'ga_days')::int + (p_dob - (d ->> 'date')::date)
     from jsonb_array_elements(g.datings) d
     where d ->> 'source' in ('scan', 'clinician')
     order by (d ->> 'date')::date limit 1),
    case when g.lmp is not null then p_dob - g.lmp end,
    case when g.edd is not null then 280 - (g.edd - p_dob) end
  );
  if v_ga is not null and (v_ga < 140 or v_ga > 310) then
    v_ga := null;
  end if;

  select coalesce(jsonb_agg(x ->> 'name'), '[]'::jsonb) into v_meds
  from jsonb_array_elements(coalesce(m.medications, '[]'::jsonb)) x
  where coalesce(x ->> 'name', '') <> '';

  insert into profiles (family_id, user_id, name, dob, sex, relationship, birth)
  values (
    m.family_id, v_user, trim(p_name), p_dob,
    case when p_sex in ('female', 'male', 'other') then p_sex end,
    'child',
    jsonb_build_object(
      'pregnancy_id', g.id,
      'mother_id', m.id,
      'ga_at_birth_days', v_ga,
      'delivery_mode', p_delivery_mode,
      'birth_weight_kg', p_birth_weight_kg,
      'maternal_blood_group', m.blood_group,
      'in_utero_medicines', v_meds
    )
  )
  returning id into v_child;

  insert into profile_relations (user_id, profile_id, related_profile_id, type)
  values (v_user, v_child, m.id, 'mother'), (v_user, m.id, v_child, 'child')
  on conflict (profile_id, related_profile_id) do nothing;

  if p_birth_weight_kg is not null then
    insert into memory_facts (user_id, profile_id, key, label, value, value_text, unit, observed_on, source)
    values (v_user, v_child, 'weight', 'Weight', p_birth_weight_kg, 'Birth weight', 'kg', p_dob, 'chat');
  end if;

  update pregnancies
  set status = 'delivered', delivered_on = p_dob, delivery_mode = p_delivery_mode,
      ga_at_birth_days = v_ga, birth_weight_kg = p_birth_weight_kg,
      child_profile_id = v_child, updated_at = now()
  where id = g.id;

  return v_child;
end;
$$ language plpgsql;

revoke execute on function promote_pregnancy (uuid, text, date, text, text, numeric, int) from public, anon;
grant execute on function promote_pregnancy (uuid, text, date, text, text, numeric, int) to authenticated;
