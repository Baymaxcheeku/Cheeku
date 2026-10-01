-- 0030 step 5 of 6. Run the steps in order, each in a new query. Safe to run again.
begin;

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

commit;
