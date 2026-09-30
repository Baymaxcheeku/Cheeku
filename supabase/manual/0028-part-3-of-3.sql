-- MIGRATION 0028, PART 3 OF 3: consultation invoices and moving records.
--
-- For the Supabase SQL Editor. Run the parts in order: 1, then 2, then 3.
-- Needs 0027 applied first. Each part is short enough to copy in one go.
--
-- 1. On GitHub, open this file and press "Copy raw file" (the two-squares
--    icon above the code). Don't select the text by hand.
-- 2. In the SQL Editor, click in an empty query, paste, and press Run.
--
-- Safe to run again if anything went wrong: nothing here breaks on a
-- second run. The source of truth is supabase/migrations/0028_record_types.sql.

begin;

-- ------------------------------------------------ consultation invoices --

create or replace function file_consultation_invoice (
  p_profile uuid,
  p_doctor text,
  p_specialty text,
  p_clinic text,
  p_mode text,
  p_day date,
  p_slot text,
  p_fee int,
  p_appointment text
) returns uuid
security definer
set
  search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_doc uuid := gen_random_uuid();
begin
  if v_user is null then
    raise exception 'sign in first' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from profiles where id = p_profile and user_id = v_user) then
    raise exception 'that family member could not be found' using errcode = 'insufficient_privilege';
  end if;
  if p_profile not in (select covered_profile_ids(v_user)) then
    raise exception 'profile % is not covered by the current plan', p_profile using errcode = 'check_violation';
  end if;
  if p_mode not in ('online', 'clinic') or p_fee not between 0 and 20000
     or char_length(coalesce(p_doctor, '')) not between 2 and 120 then
    raise exception 'invalid invoice' using errcode = 'check_violation';
  end if;

  insert into documents (id, profile_id, user_id, storage_path, mime_type, doc_type, status, event_date, facility, doctor, confidence, raw_text, extraction)
  values (
    v_doc, p_profile, v_user,
    v_user || '/' || p_profile || '/invoice-' || v_doc || '.pdf',
    'application/pdf', 'consultation_invoice', 'filed', p_day,
    nullif(left(p_clinic, 120), ''), left(p_doctor, 120), 1,
    'Invoice for a ' || p_mode || ' consultation with ' || left(p_doctor, 120),
    jsonb_build_object(
      'title', case when p_mode = 'online' then 'Video consultation' else 'Clinic visit' end || ' · ' || left(p_doctor, 80),
      'source', 'cheeku',
      'appointment_id', left(p_appointment, 64),
      'details', jsonb_build_object(
        'invoiceNo', invoice_number('CK', v_doc),
        'issuedAt', now(),
        'doctor', jsonb_build_object('name', left(p_doctor, 120), 'specialty', nullif(left(p_specialty, 80), ''), 'clinic', nullif(left(p_clinic, 120), '')),
        'mode', p_mode,
        'appointment', jsonb_build_object('day', p_day, 'slot', left(p_slot, 40)),
        'lines', jsonb_build_array(
          jsonb_build_object('label', 'Consultation fee', 'amount', p_fee),
          jsonb_build_object('label', 'Booking fee', 'amount', 0)
        ),
        'total', p_fee,
        -- Video is paid when booked; a clinic visit is paid at the clinic.
        'status', case when p_mode = 'online' then 'paid' else 'due' end,
        'paymentMode', case when p_mode = 'online' then 'Paid in app' else 'Pay at the clinic' end,
        'sample', true
      )
    )
  );
  return v_doc;
end;
$$ language plpgsql;

revoke execute on function file_consultation_invoice (uuid, text, text, text, text, date, text, int, text) from public, anon;
grant execute on function file_consultation_invoice (uuid, text, text, text, text, date, text, int, text) to authenticated;

-- A cancelled appointment: refunded if it was paid, otherwise just cancelled.
-- A moved one: same invoice, new day and time.
create or replace function update_consultation_invoice (p_doc uuid, p_action text, p_day date default null, p_slot text default null) returns boolean
security definer
set
  search_path = public as $$
declare
  d documents;
begin
  select * into d from documents
  where id = p_doc and user_id = auth.uid() and doc_type = 'consultation_invoice'
  for update;
  if not found then
    return false;
  end if;

  if p_action = 'cancel' then
    perform set_invoice_detail(p_doc, 'status', to_jsonb(
      case when d.extraction -> 'details' ->> 'status' = 'paid' then 'refunded' else 'cancelled' end
    ));
  elsif p_action = 'reschedule' and p_day is not null then
    perform set_invoice_detail(p_doc, 'appointment', jsonb_build_object('day', p_day, 'slot', left(coalesce(p_slot, ''), 40)));
    update documents set event_date = p_day where id = p_doc;
  else
    return false;
  end if;
  return true;
end;
$$ language plpgsql;

revoke execute on function update_consultation_invoice (uuid, text, date, text) from public, anon;
grant execute on function update_consultation_invoice (uuid, text, date, text) to authenticated;

-- ------------------------------------------------------ move a record --

-- Filed under the wrong person. Moves the record, the values read from it and
-- its timeline entries together, so the old member keeps nothing of it and
-- the new one gets all of it. Only to someone the plan covers: a record
-- cannot be parked on a locked member and read from there.
create or replace function move_document (p_doc uuid, p_profile uuid) returns boolean
security definer
set
  search_path = public as $$
declare
  v_user uuid := auth.uid();
  d documents;
begin
  select * into d from documents where id = p_doc and user_id = v_user for update;
  if not found then
    return false;
  end if;
  if d.profile_id = p_profile then
    return true;
  end if;
  if not exists (select 1 from profiles where id = p_profile and user_id = v_user)
     or p_profile not in (select covered_profile_ids(v_user)) then
    raise exception 'profile % is not covered by the current plan', p_profile using errcode = 'check_violation';
  end if;

  update documents set profile_id = p_profile where id = p_doc;
  update entities set profile_id = p_profile where document_id = p_doc;
  update timeline_events set profile_id = p_profile where source_document_id = p_doc;
  -- Inbox rows about it follow too, so tapping one opens it under its owner.
  update notifications set profile_id = p_profile where document_id = p_doc and user_id = v_user;
  return true;
end;
$$ language plpgsql;

revoke execute on function move_document (uuid, uuid) from public, anon;
grant execute on function move_document (uuid, uuid) to authenticated;

alter table schema_migrations enable row level security;

insert into schema_migrations (filename) values ('0028_record_types.sql') on conflict do nothing;

commit;
