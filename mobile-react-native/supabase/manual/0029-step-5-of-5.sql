-- 0029 step 5 of 5. Run the steps in order, each in a new query. Safe to run again.
begin;

create or replace function health_file_bundle (p_profile uuid) returns jsonb
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
               conditions, allergies, medications
        from profiles where id = p_profile
      ) p
    ),
    'documents', coalesce((
      select jsonb_agg(to_jsonb(d) order by d.event_date desc nulls last, d.created_at desc)
      from (
        select id, doc_type, status, event_date, facility, doctor, created_at,
               extraction ->> 'title' as title,
               extraction -> 'details' as details,
               extraction ->> 'source' as source
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
    ), '[]'::jsonb)
  );
end;
$$ language plpgsql stable;

revoke execute on function health_file_bundle (uuid) from public, anon;
grant execute on function health_file_bundle (uuid) to authenticated;

insert into schema_migrations (filename) values ('0029_learn_and_health_file.sql') on conflict do nothing;

commit;
