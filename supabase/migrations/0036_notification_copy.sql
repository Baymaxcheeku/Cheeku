-- Notification copy, rewritten to the content system (docs/content-system.md).
--
-- Every function below is the latest version from 0024, 0025, 0027 and 0028
-- with ONLY its wording changed: same logic, same dedupe keys, same routes.
-- Titles are what happened (at most 40 characters before a name), bodies are
-- the next step in two lock-screen lines (at most 90). One emoji, only on
-- wins. Nothing about a result is ever playful.
--
-- One real fix rides along: "You're back on the Free plan" said "You get 5
-- chats a day", which has been wrong since 0035. It now reads the number from
-- chat_limits(), so it cannot drift again. Needs 0035.
--
-- Safe to run again: every statement is create or replace.

-- --------------------------------------- notify_flagged_entity --
create or replace function notify_flagged_entity () returns trigger
security definer
set
  search_path = public as $$
declare
  v_doc documents;
begin
  if new.document_id is null or coalesce(new.flag, 'normal') not in ('high', 'low') then
    return null;
  end if;

  select * into v_doc from documents where id = new.document_id;
  if not found then
    return null;
  end if;

  perform notify_user(
    new.user_id, new.profile_id, new.document_id, 'report_flagged',
    'A few values in ' || document_display_title(v_doc) || ' are outside range',
    'Worth a word with your doctor. I can help you prep your questions.',
    '/records/' || new.document_id,
    'flag:' || new.document_id,
    jsonb_build_object('tone', 'attention')
  );
  return null;
end;
$$ language plpgsql;

-- ---------------------------------------- notify_profile_added --
create or replace function notify_profile_added () returns trigger
security definer
set
  search_path = public as $$
begin
  if new.is_primary then
    perform notify_user(
      new.user_id, new.id, null, 'welcome',
      'Hi, I''m Cheeku 👋',
      'Send me any report, prescription or bill. I''ll read it, file it and remember it.',
      '/scan',
      'welcome'
    );
  else
    perform notify_user(
      new.user_id, new.id, null, 'family_added',
      new.name || ' joined the family 🎉',
      'Add their first report and I''ll start remembering for them too.',
      '/scan',
      'family:' || new.id
    );
  end if;
  return null;
end;
$$ language plpgsql;

-- ---------------------------------------- notify_ticket_closed --
create or replace function notify_ticket_closed () returns trigger
security definer
set
  search_path = public as $$
begin
  if new.status = 'closed' and old.status is distinct from 'closed' then
    perform notify_user(
      new.user_id, null, null, 'support_update',
      'We''ve closed your request',
      '"' || left(new.subject, 60) || '". Still stuck? Write to us from Help.',
      '/settings/help',
      'ticket:' || new.id
    );
  end if;
  return null;
end;
$$ language plpgsql;

-- ------------------------------------- announce_service_launch --
create or replace function announce_service_launch (p_service text, p_label text, p_route text) returns integer
security definer
set
  search_path = public as $$
declare
  v_count integer;
begin
  insert into notifications (user_id, kind, title, body, route, dedupe_key, data)
  select
    w.user_id,
    'service_live',
    left(p_label || ' is live 🎉', 120),
    'You asked to hear first. Book in two taps.',
    p_route,
    'live:' || p_service,
    jsonb_build_object('service', p_service)
  from service_waitlist w
  where w.service_id = p_service
  on conflict (user_id, dedupe_key) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$ language plpgsql;

-- -------------------------------------- notify_profile_removed --
create or replace function notify_profile_removed () returns trigger
security definer
set
  search_path = public as $$
begin
  -- Account deletion removes the family first; nobody is left to tell.
  if old.is_primary or not exists (select 1 from families where id = old.family_id) then
    return null;
  end if;

  perform notify_user(
    old.user_id, null, null, 'family_removed',
    old.name || '''s file was removed',
    'Their reports and chats are gone for good. Not you? Change your password in Security.',
    '/settings/security',
    'removed:' || old.id
  );
  return null;
end;
$$ language plpgsql;

-- ------------------------------------------ notify_plan_change --
create or replace function notify_plan_change () returns trigger
security definer
set
  search_path = public as $$
declare
  v_owner uuid;
  v_members int;
  v_paused int;
  v_note text := '';
begin
  if tg_op = 'UPDATE' and new.tier is not distinct from old.tier then
    return null;
  end if;

  select owner_id into v_owner from families where id = new.family_id;
  if v_owner is null then
    return null;
  end if;

  select count(*) into v_members from profiles where user_id = v_owner;
  v_paused := greatest(0, v_members - entitlement_seats(new.tier));
  if v_paused = 1 then
    v_note := ' 1 member is paused, not deleted.';
  elsif v_paused > 1 then
    v_note := ' ' || v_paused || ' members are paused, not deleted.';
  end if;

  if new.tier = 'free' then
    if tg_op = 'UPDATE' then
      perform notify_user(
        v_owner, null, null, 'plan_ended',
        'You''re on the Free plan',
        'Your records stay put. You get ' || (chat_limits() ->> 'free_daily') || ' chats a day.' || v_note,
        '/settings/subscription',
        null
      );
    end if;
  else
    perform notify_user(
      v_owner, null, null, 'plan_changed',
      case new.tier
        when 'family' then 'Family plan is on 🎉'
        when 'solo' then 'Solo plan is on 🎉'
        else 'Your Daily pass is on 🎉'
      end,
      case new.tier
        when 'family' then 'Up to 4 people, unlimited chats. Add your family from Home.'
        when 'solo' then 'Unlimited chats, just for you.'
        else 'Unlimited chats for 24 hours. Make them count.'
      end || v_note,
      '/settings/subscription',
      null,
      jsonb_build_object('tier', new.tier, 'paused', v_paused)
    );
  end if;
  return null;
end;
$$ language plpgsql;

-- ------------------------------------------ create_lab_booking --
create or replace function create_lab_booking (
  p_profile uuid,
  p_partner text,
  p_tests text[],
  p_date date,
  p_window text,
  p_address text,
  p_prescription uuid default null
) returns uuid
security definer
set
  search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_partner lab_partners;
  v_subtotal int;
  v_offered int;
  v_fee int;
  v_id uuid;
  v_name text;
begin
  if v_user is null then
    raise exception 'not signed in' using errcode = 'insufficient_privilege';
  end if;

  if not exists (select 1 from covered_profile_ids(v_user) c(id) where c.id = p_profile) then
    raise exception 'that family member is not covered by the current plan' using errcode = 'check_violation';
  end if;

  select * into v_partner from lab_partners where id = p_partner;
  if not found then
    raise exception 'unknown lab' using errcode = 'check_violation';
  end if;

  if p_date < current_date or p_date > current_date + 14 then
    raise exception 'pick a day in the next two weeks' using errcode = 'check_violation';
  end if;

  if p_prescription is not null and not exists (
    select 1 from documents d where d.id = p_prescription and d.user_id = v_user
  ) then
    raise exception 'unknown prescription' using errcode = 'check_violation';
  end if;

  select count(*), coalesce(sum(o.price), 0) into v_offered, v_subtotal
  from lab_offers o
  where o.partner_id = p_partner and o.test_id = any (p_tests);

  if v_offered = 0 or v_offered <> cardinality(array(select distinct unnest(p_tests))) then
    raise exception 'this lab does not offer every test chosen' using errcode = 'check_violation';
  end if;

  v_fee := case when v_partner.free_collection_above is not null and v_subtotal >= v_partner.free_collection_above then 0 else v_partner.collection_fee end;

  insert into lab_bookings (user_id, profile_id, partner_id, tests, subtotal, collection_fee, total, slot_date, slot_window, address, prescription_document_id)
  values (v_user, p_profile, p_partner, array(select distinct unnest(p_tests)), v_subtotal, v_fee, v_subtotal + v_fee, p_date, p_window, trim(p_address), p_prescription)
  returning id into v_id;

  select name into v_name from profiles where id = p_profile;

  perform notify_user(
    v_user, p_profile, null, 'lab_booked',
    'Collection booked with ' || v_partner.name,
    to_char(p_date, 'Dy DD Mon') || ', ' || p_window || ' for ' || v_name || '. I''ll file the results.',
    '/labs/booking/' || v_id,
    'lab:' || v_id || ':booked'
  );
  return v_id;
end;
$$ language plpgsql;

-- -------------------------------------------- apply_lab_status --
create or replace function apply_lab_status (p_id uuid, p_status text) returns void
security definer
set
  search_path = public as $$
declare
  b lab_bookings;
  v_partner text;
  v_doc uuid;
  v_title text;
  v_lines text[] := '{}';
begin
  select * into b from lab_bookings where id = p_id for update;
  if not found or b.status = p_status or b.status in ('ready', 'cancelled') then
    return;
  end if;

  select name into v_partner from lab_partners where id = b.partner_id;

  if p_status = 'ready' then
    v_title := lab_test_names(b.tests);
    insert into documents (profile_id, user_id, storage_path, mime_type, doc_type, status, event_date, facility, confidence, raw_text, extraction)
    values (
      b.profile_id, b.user_id,
      b.user_id || '/' || b.profile_id || '/lab-' || b.id || '.pdf',
      'application/pdf', 'lab_report', 'filed', b.slot_date, v_partner, 1,
      'Results delivered by ' || v_partner || ' for booking ' || b.id,
      jsonb_build_object('title', left(v_title, 80), 'source', 'lab_partner', 'booking_id', b.id, 'partner', v_partner)
    )
    returning id into v_doc;

    insert into entities (profile_id, user_id, document_id, kind, name, canonical_name, value, unit, ref_range, flag, event_date)
    select distinct on (r.canonical_name)
      b.profile_id, b.user_id, v_doc, 'lab_value', r.name, r.canonical_name, r.value, r.unit, r.ref_range, 'normal', b.slot_date
    from lab_tests t
    join lab_result_templates r on r.test_id = any (array_append(t.includes, t.id))
    where t.id = any (b.tests)
    order by r.canonical_name;

    update lab_bookings set status = 'ready', status_at = now(), result_document_id = v_doc where id = p_id;
    -- The document trigger (0024) has already written "… is filed".
    return;
  end if;

  update lab_bookings set status = p_status, status_at = now() where id = p_id;

  perform notify_user(
    b.user_id, b.profile_id, null,
    case when p_status = 'cancelled' then 'lab_cancelled' else 'lab_update' end,
    case p_status
      when 'assigned' then 'Your collector is assigned'
      when 'collected' then 'Sample collected'
      when 'processing' then 'The lab is on it'
      else 'Lab booking cancelled'
    end,
    case p_status
      when 'assigned' then 'Arriving ' || to_char(b.slot_date, 'Dy DD Mon') || ', ' || b.slot_window || '. Mind the fasting rules.'
      when 'collected' then v_partner || ' has it. Results usually in a day.'
      when 'processing' then 'Nothing to do but wait. I''ll file the report.'
      else 'Nothing will be collected. No charge.'
    end,
    '/labs/booking/' || b.id,
    'lab:' || b.id || ':' || p_status
  );
end;
$$ language plpgsql;

-- -------------------------------------- notify_document_change --
create or replace function notify_document_change () returns trigger
security definer
set
  search_path = public as $$
declare
  v_title text := document_display_title(new);
  v_whose text := coalesce(whose_file(new.profile_id), 'your');
begin
  -- An invoice the app filed for a booking: the booking has its own
  -- notification, and "your invoice is filed" on top of it is noise.
  if new.extraction ->> 'source' = 'cheeku' then
    return null;
  end if;

  if new.status = 'needs_review'
     and (tg_op = 'INSERT' or old.status is distinct from 'needs_review') then
    perform notify_user(
      new.user_id, new.profile_id, new.id, 'report_review',
      'Quick check on ' || v_title,
      'A few lines were hard to read. Confirm them in a minute?',
      '/records/' || new.id,
      'review:' || new.id
    );
  elsif new.status = 'filed' then
    if tg_op = 'INSERT' or old.status = 'processing' then
      perform notify_user(
        new.user_id, new.profile_id, new.id, 'report_ready',
        v_title || ' is filed',
        'It''s in ' || v_whose || ' health file. Ask me anything about it.',
        '/records/' || new.id,
        'ready:' || new.id
      );
    end if;

    if tg_op = 'UPDATE' and old.status = 'needs_review' then
      update notifications
      set read_at = coalesce(read_at, now())
      where user_id = new.user_id and dedupe_key = 'review:' || new.id;
    end if;
  end if;

  return null;
end;
$$ language plpgsql;
