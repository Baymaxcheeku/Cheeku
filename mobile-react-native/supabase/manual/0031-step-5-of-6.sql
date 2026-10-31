-- 0031 step 5 of 6. Run the steps in order, each in a new query. Safe to run again.
begin;

create or replace function record_signup_consent () returns trigger
security definer
set
  search_path = public as $$
declare
  v_consent jsonb := new.raw_user_meta_data -> 'consent';
  v_bundle uuid := gen_random_uuid();
  v_purpose text;
begin
  if v_consent is null or coalesce((v_consent ->> 'accepted')::boolean, false) is not true then
    return new;
  end if;
  begin
    for v_purpose in select jsonb_array_elements_text(v_consent -> 'purposes') loop
      if v_purpose = any (required_purposes()) then
        insert into consent_log (
          user_id, consent_type, version, granted, method, bundle_id,
          document_versions, text_fingerprint, source, app_version, locale
        ) values (
          new.id, v_purpose, left(coalesce(v_consent -> 'versions' ->> 'health_consent', 'unversioned'), 32), true,
          'signup_checkbox', v_bundle, v_consent -> 'versions', left(v_consent ->> 'fingerprint', 400),
          case when v_consent ->> 'source' in ('ios', 'android', 'web') then v_consent ->> 'source' end,
          left(v_consent ->> 'app_version', 32), left(v_consent ->> 'locale', 16)
        );
      end if;
    end loop;
  exception
    when others then
      null;
  end;
  return new;
end;
$$ language plpgsql;

revoke execute on function record_signup_consent () from public, anon, authenticated;

drop trigger if exists on_auth_user_created_record_consent on auth.users;
create trigger on_auth_user_created_record_consent
after insert on auth.users for each row
execute function record_signup_consent ();

insert into app_flags (key, enabled, note)
values ('enforce_consent', true, 'Refuse new health data from accounts without the required consent (0031).')
on conflict (key) do nothing;

create or replace function enforce_core_consent () returns trigger
security definer
set
  search_path = public as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if not exists (select 1 from app_flags where key = 'enforce_consent' and enabled) then
    return new;
  end if;
  if not has_core_consent(new.user_id) then
    raise exception 'consent is needed before health data can be saved'
    using errcode = 'P0001', hint = 'consent_required';
  end if;
  return new;
end;
$$ language plpgsql;

revoke execute on function enforce_core_consent () from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['documents', 'messages', 'memory_facts', 'lab_bookings'] loop
    if to_regclass(t) is not null then
      execute format('drop trigger if exists %I on %I', t || '_consent_guard', t);
      execute format(
        'create trigger %I before insert on %I for each row execute function enforce_core_consent()',
        t || '_consent_guard', t
      );
    end if;
  end loop;
end $$;

commit;
