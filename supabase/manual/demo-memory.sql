-- Demo memory for Athar, Nisha and Imaad. Run after the 0030 steps. Safe to run again.
begin;

create or replace function demo_load_memory () returns text
set
  search_path = public as $$
declare
  v_user uuid;
  a uuid;
  n uuid;
  i uuid;
  k int := 0;
begin
  if to_regclass('public.memory_facts') is null or to_regclass('public.open_loops') is null then
    return 'NOT ADDED: run 0030-step-1-of-6 to 0030-step-6-of-6 first';
  end if;

  select p.user_id into v_user from profiles p
  where lower(split_part(trim(p.name), ' ', 1)) = 'athar'
    and exists (select 1 from profiles q where q.user_id = p.user_id and lower(split_part(trim(q.name), ' ', 1)) = 'nisha')
    and exists (select 1 from profiles r where r.user_id = p.user_id and lower(split_part(trim(r.name), ' ', 1)) = 'imaad')
  limit 1;
  if v_user is null then
    return 'NOT ADDED: no account has Athar, Nisha and Imaad';
  end if;
  select id into a from profiles where user_id = v_user and lower(split_part(trim(name), ' ', 1)) = 'athar' order by is_primary desc limit 1;
  select id into n from profiles where user_id = v_user and lower(split_part(trim(name), ' ', 1)) = 'nisha' limit 1;
  select id into i from profiles where user_id = v_user and lower(split_part(trim(name), ' ', 1)) = 'imaad' limit 1;

  insert into memory_facts (id, user_id, profile_id, key, label, value, value_text, unit, observed_on, source)
  select f.id, v_user, f.pid, f.key, f.label, f.val, f.txt, f.unit, current_date - f.ago, f.src
  from (values
    ('d0000000-0000-4000-8000-000000000001'::uuid, a, 'bp_systolic', 'Blood pressure (top)', 132::numeric, '132/84', 'mmHg', 28, 'device'),
    ('d0000000-0000-4000-8000-000000000002'::uuid, a, 'bp_diastolic', 'Blood pressure (bottom)', 84, '132/84', 'mmHg', 28, 'device'),
    ('d0000000-0000-4000-8000-000000000003'::uuid, a, 'bp_systolic', 'Blood pressure (top)', 131, '131/80', 'mmHg', 21, 'device'),
    ('d0000000-0000-4000-8000-000000000004'::uuid, a, 'bp_diastolic', 'Blood pressure (bottom)', 80, '131/80', 'mmHg', 21, 'device'),
    ('d0000000-0000-4000-8000-000000000005'::uuid, a, 'bp_systolic', 'Blood pressure (top)', 133, '133/82', 'mmHg', 14, 'device'),
    ('d0000000-0000-4000-8000-000000000006'::uuid, a, 'bp_diastolic', 'Blood pressure (bottom)', 82, '133/82', 'mmHg', 14, 'device'),
    ('d0000000-0000-4000-8000-000000000007'::uuid, a, 'bp_systolic', 'Blood pressure (top)', 108, '108/68', 'mmHg', 2, 'device'),
    ('d0000000-0000-4000-8000-000000000008'::uuid, a, 'bp_diastolic', 'Blood pressure (bottom)', 68, '108/68', 'mmHg', 2, 'device'),
    ('d0000000-0000-4000-8000-000000000009'::uuid, a, 'weight', 'Weight', 79.5, null, 'kg', 30, 'chat'),
    ('d0000000-0000-4000-8000-000000000010'::uuid, a, 'weight', 'Weight', 78.2, null, 'kg', 3, 'chat'),
    ('d0000000-0000-4000-8000-000000000011'::uuid, n, 'weight', 'Weight', 61.0, null, 'kg', 20, 'chat'),
    ('d0000000-0000-4000-8000-000000000012'::uuid, i, 'temperature', 'Temperature', 38.4, null, '°C', 13, 'chat'),
    ('d0000000-0000-4000-8000-000000000013'::uuid, i, 'temperature', 'Temperature', 37.2, null, '°C', 11, 'chat'),
    ('d0000000-0000-4000-8000-000000000014'::uuid, i, 'weight', 'Weight', 21.4, null, 'kg', 12, 'chat')
  ) as f (id, pid, key, label, val, txt, unit, ago, src)
  where f.pid is not null and f.pid in (select covered_profile_ids(v_user))
  on conflict (id) do nothing;
  get diagnostics k = row_count;

  insert into open_loops (user_id, profile_id, key, type, title, detail, opened_on, due_by, status)
  select v_user, a, 'reminder:demo-bp', 'reminder', 'Check BP every morning for a week', 'After the low reading', current_date - 2, current_date + 5, 'open'
  where a in (select covered_profile_ids(v_user))
  on conflict (profile_id, key) do nothing;

  return k || ' readings added';
end;
$$ language plpgsql;

select demo_load_memory ();

drop function if exists demo_load_memory ();

commit;
