-- 0031 step 3 of 6. Run the steps in order, each in a new query. Safe to run again.
begin;

create or replace function my_consent_state () returns jsonb
stable
set
  search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_latest jsonb;
  v_current jsonb := current_material_versions();
  v_accepted jsonb;
  v_missing text[];
  v_stale text[];
  v_seen int;
  v_reason text;
begin
  if v_user is null then
    return null;
  end if;

  select coalesce(
    jsonb_object_agg(consent_type, jsonb_build_object(
      'granted', granted, 'at', granted_at, 'method', method, 'versions', document_versions
    )),
    '{}'::jsonb
  )
  into v_latest
  from (
    select distinct on (consent_type) consent_type, granted, granted_at, method, document_versions
    from consent_log
    where user_id = v_user
    order by consent_type, granted_at desc, seq desc
  ) l;

  select coalesce(array_agg(r), '{}') into v_missing
  from unnest(required_purposes()) r
  where not coalesce((v_latest -> r ->> 'granted')::boolean, false);

  select count(*) into v_seen from unnest(required_purposes()) r where v_latest ? r;

  v_accepted := coalesce(v_latest -> 'health_records' -> 'versions', '{}'::jsonb);

  select coalesce(array_agg(k), '{}') into v_stale
  from jsonb_each_text(v_current) c (k, v)
  where coalesce(v_accepted ->> k, '') < v;

  v_reason := case
    when v_seen = 0 then 'never'
    when cardinality(v_missing) > 0 then 'withdrawn'
    when cardinality(v_stale) > 0 then 'updated'
    else null
  end;

  return jsonb_build_object(
    'purposes', v_latest,
    'current_versions', v_current,
    'accepted_versions', v_accepted,
    'missing', to_jsonb(v_missing),
    'stale', to_jsonb(v_stale),
    'needs_consent', v_reason is not null,
    'reason', v_reason
  );
end;
$$ language plpgsql;

revoke execute on function my_consent_state () from public, anon;
grant execute on function my_consent_state () to authenticated;

commit;
