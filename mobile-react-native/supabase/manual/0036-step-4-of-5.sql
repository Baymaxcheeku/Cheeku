-- 0036 step 4 of 5. Run the steps in order, each in a new query. Safe to run again.
begin;

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

commit;
