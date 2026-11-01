-- 0031: CONSENT, PRIVACY REQUESTS AND ACCOUNT ACTIVITY.
--
-- The DPDP Act asks three things of a consent: that it is specific to a
-- purpose, informed by a notice the person could read, and provable later.
-- Until now the mobile app showed a tick box and wrote nothing. This migration
-- makes the tick box mean something:
--
--   1. legal_documents       every published version of the Terms, Privacy
--                            Policy, Health Data Consent and storage notice,
--                            with the SHA-256 of the exact text the app shows
--   2. consent_log           (from 0004, still append-only) gains the method,
--                            the document versions agreed, a fingerprint of
--                            the text, and the app and platform it came from
--   3. my_consent_state()    one call: what this person has agreed to, and
--                            whether they must be asked (again)
--   4. record_consent()      the only write path the app uses: validates the
--                            purposes, refuses an out-of-date text, writes one
--                            row per purpose in one transaction
--   5. sign-up trigger       records the consent given in the sign-up form
--                            atomically with the account, even when email
--                            confirmation means there is no session yet
--   6. write guard           no new health record, chat message, reading or
--                            booking is saved without the required consent
--   7. privacy_requests      access, correction, erasure, grievance and
--                            nomination requests, with a response due date
--   8. account_activity      sign-ins, security changes and consent changes,
--                            so the person can see what happened on their
--                            account
--
-- Purposes are defined in mobile-react-native/src/lib/legal/purposes.ts. The
-- texts and their hashes live in src/lib/legal/documents.ts, and a test fails
-- if a text changes without a new row below.
--
-- Safe to run again: every statement is if-not-exists, create-or-replace or
-- guarded.

-- ------------------------------------------------------ 1. legal_documents --

create table if not exists legal_documents (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('terms', 'privacy', 'health_consent', 'storage')),
  version text not null check (version ~ '^\d{4}-\d{2}-\d{2}$'),
  effective_on date not null,
  -- A material version must be agreed again by everyone who agreed an older one.
  material boolean not null default true,
  summary text not null check (char_length(summary) <= 600),
  text_sha256 text not null check (text_sha256 ~ '^[0-9a-f]{64}$'),
  published_at timestamptz not null default now(),
  unique (kind, version)
);

alter table legal_documents enable row level security;

-- Readable by anyone signed in; written only by migrations. No insert, update
-- or delete policy, so a published version can never be edited in place.
drop policy if exists "signed-in users read legal documents" on legal_documents;
create policy "signed-in users read legal documents" on legal_documents for select using (auth.uid() is not null);

insert into legal_documents (kind, version, effective_on, material, summary, text_sha256) values
  ('terms', '2026-10-08', '2026-10-08', true,
   'These terms are the agreement between you and us for using Cheeku AI. Cheeku helps you understand and organise health information; it does not diagnose, prescribe or replace a doctor.',
   '8270910757f13fa373ecd94f1e99b039727f1763867f906d025b795ef5e0b2c2'),
  ('privacy', '2026-10-08', '2026-10-08', true,
   'We collect what Cheeku needs to keep your family''s health records and answer your questions, and nothing for advertising. We never sell your data, and you can see, correct, export or delete it at any time.',
   'fb3f50715e1b565df45ddfa3c6741d7fb165e9f9c15948cb2eada519ca5db5b4'),
  ('health_consent', '2026-10-08', '2026-10-08', true,
   'This is the consent notice under India''s DPDP Act. It lists exactly what Cheeku does with your family''s health data when you tick the box, and the optional uses that stay off unless you turn them on.',
   'f2d3608573bcc82426941ce699189d2c728cf6e1cac951c28fdec7b955e54756'),
  ('storage', '2026-10-08', '2026-10-08', false,
   'Cheeku uses no advertising cookies, no tracking pixels and no third-party analytics. It keeps a small amount of data on your phone so the app works, opens fast and can show your records without a signal.',
   '51dee9ee8cb660445b6fd5ee7b8f5d391b9963cfa6b9bfaa4e35720b51f3f4bf')
on conflict (kind, version) do nothing;

-- The newest MATERIAL version of each document the consent box covers. A
-- non-material update (a typo, a new contact address) changes the text people
-- can read without asking everyone to agree again.
create or replace function current_material_versions () returns jsonb
stable
set
  search_path = public as $$
  select coalesce(jsonb_object_agg(kind, version), '{}'::jsonb)
  from (
    select distinct on (kind) kind, version
    from legal_documents
    where material and effective_on <= current_date and kind in ('terms', 'privacy', 'health_consent')
    order by kind, effective_on desc, published_at desc
  ) d;
$$ language sql;

-- ---------------------------------------------------------- 2. consent_log --

alter table consent_log add column if not exists method text;
alter table consent_log add column if not exists bundle_id uuid;
alter table consent_log add column if not exists document_versions jsonb;
alter table consent_log add column if not exists text_fingerprint text;
alter table consent_log add column if not exists source text;
alter table consent_log add column if not exists app_version text;
alter table consent_log add column if not exists locale text;
-- A strict order for decisions made in the same transaction, where granted_at
-- (now()) is identical. Existing rows are numbered in physical order.
alter table consent_log add column if not exists seq bigint generated by default as identity;

-- NOT VALID: enforced on every new row, while the web build's legacy
-- 'dpdp_processing' rows stay as they were written. Evidence is not rewritten.
do $$
begin
  alter table consent_log add constraint consent_log_type_check check (
    consent_type in (
      'account', 'health_records', 'ai_assistance', 'family_profiles', 'care_bookings',
      'product_improvement', 'research_insights', 'marketing', 'dpdp_processing'
    )
  ) not valid;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table consent_log add constraint consent_log_method_check check (
    method is null or method in ('signup_checkbox', 'reconsent_sheet', 'privacy_settings', 'withdrawal')
  ) not valid;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table consent_log add constraint consent_log_meta_check check (
    (source is null or source in ('ios', 'android', 'web'))
    and (app_version is null or char_length(app_version) <= 32)
    and (locale is null or char_length(locale) <= 16)
    and (text_fingerprint is null or char_length(text_fingerprint) <= 400)
    and char_length(version) <= 32
  ) not valid;
exception
  when duplicate_object then null;
end $$;

create index if not exists consent_log_type_idx on consent_log (user_id, consent_type, granted_at desc, seq desc);

-- The list the app's REQUIRED_PURPOSES mirrors. Kept in one function so the
-- state, the write path and the guard cannot disagree.
create or replace function required_purposes () returns text[]
immutable
set
  search_path = public as $$
  select array['account', 'health_records', 'ai_assistance', 'family_profiles', 'care_bookings']::text[];
$$ language sql;

create or replace function optional_purposes () returns text[]
immutable
set
  search_path = public as $$
  select array['product_improvement', 'research_insights', 'marketing']::text[];
$$ language sql;

-- True when the latest decision on every required purpose is a grant. Used by
-- the write guard, which runs as the table owner; not callable from the API,
-- because it takes a user id and would answer about anyone.
create or replace function has_core_consent (p_user uuid) returns boolean
stable
security definer
set
  search_path = public as $$
  select coalesce(bool_and(coalesce(l.granted, false)), false)
  from unnest(required_purposes()) as r (purpose)
  left join lateral (
    select c.granted
    from consent_log c
    where c.user_id = p_user and c.consent_type = r.purpose
    order by c.granted_at desc, c.seq desc
    limit 1
  ) l on true;
$$ language sql;

revoke execute on function has_core_consent (uuid) from public, anon, authenticated;

-- ---------------------------------------------------- 3. my_consent_state --

-- Everything the app needs to decide whether to ask, in one call. Runs as the
-- caller, so RLS on consent_log bounds it to their own rows.
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

  -- All required purposes are agreed together, so any one carries the versions.
  v_accepted := coalesce(v_latest -> 'health_records' -> 'versions', '{}'::jsonb);

  -- Dates compare correctly as YYYY-MM-DD strings.
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

-- ---------------------------------------------------- 4. record_consent --

-- The one write path. Runs as the caller, so the insert policy from 0004
-- (auth.uid() = user_id) still decides whose row it can be.
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
    -- The sign-up box lists every required purpose. Agreeing to some of them
    -- would be a consent the person never saw.
    if v_touches_required and not (p_purposes @> required_purposes()) then
      raise exception 'required purposes are agreed together' using errcode = 'check_violation';
    end if;

    -- An old app build showing an old text cannot record agreement to it once
    -- a newer material version is in force.
    if v_touches_required then
      for v_kind, v_version in select key, value from jsonb_each_text(v_current) loop
        if coalesce(p_versions ->> v_kind, '') < v_version then
          raise exception 'these terms have been updated' using errcode = 'P0001', hint = 'stale_terms';
        end if;
      end loop;
    end if;

    -- Optional uses sit on top of the service; they cannot be switched on
    -- while it is paused.
    -- my_consent_state() rather than has_core_consent(): this function runs as
    -- the caller, who is not allowed to ask about arbitrary user ids.
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

-- ------------------------------------------------- 5. consent at sign-up --

-- The sign-up form sends the consent in the new user's metadata
-- (supabase.auth.signUp options.data.consent). Writing it here, inside the
-- insert that creates the account, means the account and its consent exist
-- together or not at all, and it works when email confirmation is on and the
-- app has no session yet to call record_consent with.
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
      -- Never block an account on a malformed consent payload. Nothing is
      -- recorded, so the app asks on first launch: failing towards asking.
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

-- -------------------------------------------------------- 6. write guard --

-- A switch, because turning the guard on refuses writes from every account
-- that has not yet agreed in the new app. Leave it on; switch it off only to
-- roll back an app release, never to skip consent.
insert into app_flags (key, enabled, note)
values ('enforce_consent', true, 'Refuse new health data from accounts without the required consent (0031).')
on conflict (key) do nothing;

create or replace function enforce_core_consent () returns trigger
security definer
set
  search_path = public as $$
begin
  -- Server-side writes (service role, cron, webhooks) carry no auth.uid().
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
  -- The tables where new health data enters: records, chat, readings said in
  -- chat, and bookings that send data to a partner.
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

-- --------------------------------------------------- 7. privacy_requests --

create table if not exists privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('access', 'correction', 'erasure', 'grievance', 'nomination', 'withdrawal')),
  details text check (details is null or char_length(details) <= 2000),
  status text not null default 'received' check (status in ('received', 'in_progress', 'resolved', 'rejected')),
  response text check (response is null or char_length(response) <= 2000),
  -- The DPDP Rules give a fixed period to answer; the due date is set on
  -- receipt so it can be shown to the person and watched by whoever answers.
  due_by date not null default (current_date + 90),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists privacy_requests_user_idx on privacy_requests (user_id, created_at desc);

alter table privacy_requests enable row level security;

drop policy if exists "users read own privacy requests" on privacy_requests;
create policy "users read own privacy requests" on privacy_requests for select using (auth.uid() = user_id);

-- A person can open a request but not answer or close it themselves.
drop policy if exists "users open own privacy requests" on privacy_requests;
create policy "users open own privacy requests" on privacy_requests for insert
with
  check (
    auth.uid() = user_id
    and status = 'received'
    and response is null
    and resolved_at is null
  );

-- ---------------------------------------------------- 8. account_activity --

create table if not exists account_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (
    kind in (
      'sign_in', 'sign_out', 'signed_out_other_devices', 'password_reset_requested',
      'app_lock_on', 'app_lock_off', 'consent_granted', 'consent_withdrawn',
      'data_exported', 'cache_cleared', 'privacy_request'
    )
  ),
  source text check (source is null or source in ('ios', 'android', 'web')),
  device text check (device is null or char_length(device) <= 80),
  app_version text check (app_version is null or char_length(app_version) <= 32),
  -- Never health data. Purposes, a request kind, a setting name.
  detail text check (detail is null or char_length(detail) <= 200),
  created_at timestamptz not null default now()
);

create index if not exists account_activity_user_idx on account_activity (user_id, created_at desc);

alter table account_activity enable row level security;

drop policy if exists "users read own activity" on account_activity;
create policy "users read own activity" on account_activity for select using (auth.uid() = user_id);

drop policy if exists "users append own activity" on account_activity;
create policy "users append own activity" on account_activity for insert
with
  check (auth.uid() = user_id);

-- Delete, so erasure can remove it. Not update: a history that can be edited
-- in place is not worth reading.
drop policy if exists "users erase own activity" on account_activity;
create policy "users erase own activity" on account_activity for delete using (auth.uid() = user_id);
