-- 0030 step 6 of 6. Run the steps in order, each in a new query. Safe to run again.
begin;

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

commit;
