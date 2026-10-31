-- 0031 step 4 of 6. Run the steps in order, each in a new query. Safe to run again.
begin;

create or replace function record_consent (
  p_purposes text[],
  p_granted boolean,
  p_method text,
  p_versions jsonb default null,
  p_fingerprint text default null,
  p_source text default null,
  p_app_version text default null,
  p_locale text default null
) returns jsonb
set
  search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_bundle uuid := gen_random_uuid();
  v_current jsonb := current_material_versions();
  v_touches_required boolean;
  v_purpose text;
  v_kind text;
  v_version text;
begin
  if v_user is null then
    raise exception 'sign in first' using errcode = 'insufficient_privilege';
  end if;
  if p_purposes is null or cardinality(p_purposes) = 0 then
    raise exception 'name at least one purpose' using errcode = 'check_violation';
  end if;
  if exists (select 1 from unnest(p_purposes) p where not (p = any (required_purposes() || optional_purposes()))) then
    raise exception 'unknown purpose' using errcode = 'check_violation';
  end if;
  if p_method not in ('signup_checkbox', 'reconsent_sheet', 'privacy_settings', 'withdrawal') then
    raise exception 'unknown method' using errcode = 'check_violation';
  end if;

  v_touches_required := p_purposes && required_purposes();

  if p_granted then
    if v_touches_required and not (p_purposes @> required_purposes()) then
      raise exception 'required purposes are agreed together' using errcode = 'check_violation';
    end if;

    if v_touches_required then
      for v_kind, v_version in select key, value from jsonb_each_text(v_current) loop
        if coalesce(p_versions ->> v_kind, '') < v_version then
          raise exception 'these terms have been updated' using errcode = 'P0001', hint = 'stale_terms';
        end if;
      end loop;
    end if;

    if not v_touches_required and jsonb_array_length(my_consent_state() -> 'missing') > 0 then
      raise exception 'agree to the required uses first' using errcode = 'P0001', hint = 'consent_required';
    end if;
  end if;

  foreach v_purpose in array p_purposes loop
    insert into consent_log (
      user_id, consent_type, version, granted, method, bundle_id,
      document_versions, text_fingerprint, source, app_version, locale
    ) values (
      v_user, v_purpose, coalesce(p_versions ->> 'health_consent', 'unversioned'), p_granted, p_method, v_bundle,
      p_versions, left(p_fingerprint, 400), case when p_source in ('ios', 'android', 'web') then p_source end,
      left(p_app_version, 32), left(p_locale, 16)
    );
  end loop;

  insert into account_activity (user_id, kind, source, app_version, detail)
  values (
    v_user,
    case when p_granted then 'consent_granted' else 'consent_withdrawn' end,
    case when p_source in ('ios', 'android', 'web') then p_source end,
    left(p_app_version, 32),
    left(array_to_string(p_purposes, ', '), 200)
  );

  return my_consent_state();
end;
$$ language plpgsql;

revoke execute on function record_consent (text[], boolean, text, jsonb, text, text, text, text) from public, anon;
grant execute on function record_consent (text[], boolean, text, jsonb, text, text, text, text) to authenticated;

commit;
