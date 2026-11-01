-- demo step 1 of 12: sample records for Arjun, Meera and Tara. Run in order, each in a new query. Safe to run again.
begin;

create or replace function demo_load_records (p_who text, p_payload text) returns text
set
  search_path = public as $$
declare
  v_user uuid;
  v_profile uuid;
  v_shift int := current_date - date '1950-06-15';
  v_txt text;
  r jsonb;
  m text;
  v_doc uuid;
  n int := 0;
begin
  select a.user_id into v_user
  from profiles a
  where lower(split_part(trim(a.name), ' ', 1)) = 'arjun'
    and exists (select 1 from profiles b where b.user_id = a.user_id and lower(split_part(trim(b.name), ' ', 1)) = 'meera')
    and exists (select 1 from profiles c where c.user_id = a.user_id and lower(split_part(trim(c.name), ' ', 1)) = 'tara')
  limit 1;
  if v_user is null then
    return 'NOT ADDED: no account has Arjun, Meera and Tara';
  end if;

  select id into v_profile from profiles
  where user_id = v_user and lower(split_part(trim(name), ' ', 1)) = lower(p_who)
  order by is_primary desc, created_at limit 1;
  if v_profile not in (select covered_profile_ids(v_user)) then
    return 'NOT ADDED: ' || p_who || ' is not covered by the plan';
  end if;

  v_txt := convert_from(decode(p_payload, 'base64'), 'UTF8');
  for m in select distinct (regexp_matches(v_txt, '19[456][0-9]-[0-9]{2}-[0-9]{2}', 'g'))[1] loop
    v_txt := replace(v_txt, m, to_char(m::date + v_shift, 'YYYY-MM-DD'));
  end loop;

  for r in select * from jsonb_array_elements(v_txt::jsonb) loop
    continue when exists (select 1 from documents where user_id = v_user and raw_text = 'DEMO-RECORDS ' || (r ->> 'key'));
    v_doc := gen_random_uuid();
    insert into documents (id, profile_id, user_id, storage_path, mime_type, doc_type, status, event_date, facility, doctor, confidence, raw_text, extraction)
    values (
      v_doc, v_profile, v_user, v_user || '/' || v_profile || '/demo-' || v_doc || '.pdf', 'application/pdf',
      r ->> 'doc_type', coalesce(r ->> 'status', 'filed'), (r ->> 'event_date')::date, r ->> 'facility', r ->> 'doctor', 0.96,
      'DEMO-RECORDS ' || (r ->> 'key'),
      jsonb_build_object('title', r ->> 'title', 'details', r -> 'details')
    );
    insert into entities (profile_id, user_id, document_id, kind, name, canonical_name, value, value_text, unit, ref_range, flag, event_date)
    select v_profile, v_user, v_doc, e ->> 'kind', e ->> 'name', e ->> 'canonical_name', (e ->> 'value')::numeric,
           e ->> 'value_text', e ->> 'unit', e ->> 'ref_range', e ->> 'flag', (r ->> 'event_date')::date
    from jsonb_array_elements(coalesce(r -> 'entities', '[]'::jsonb)) e;
    n := n + 1;
  end loop;

  delete from notifications
  where user_id = v_user
    and document_id in (select id from documents where user_id = v_user and raw_text like 'DEMO-RECORDS %');

  return p_who || ': ' || n || ' records added';
end;
$$ language plpgsql;

commit;
