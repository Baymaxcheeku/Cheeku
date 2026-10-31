-- Every kind of record gets its own shape, and the app files some of them
-- itself.
--
-- 1. Four more document types: consultation and booking invoices, insurance
--    policies, and medication lists. Each type's own details live in
--    `extraction.details` (see mobile-react-native/src/lib/records/details.ts,
--    which reads them defensively; the database does not enforce a shape).
-- 2. A lab booking files its own invoice the moment it is made, and the
--    invoice follows the booking: paid once the sample is collected,
--    cancelled if the visit is.
-- 3. A doctor booking files a consultation invoice through
--    `file_consultation_invoice`, which checks the member and the plan.
--    Cancelling refunds it; rescheduling moves it.
-- 4. A record filed under the wrong person can be moved, with its values and
--    timeline, to someone the plan covers (`move_document`).
-- 5. Records the app writes itself (invoices) don't also announce themselves
--    in the inbox: the booking already did.
--
-- Records the app writes have no scanned page. They carry
-- `extraction.source = 'cheeku'`, and the app does not look for a file.

-- ------------------------------------------------------------ doc types --

alter table documents drop constraint if exists documents_doc_type_check;

alter table documents
add constraint documents_doc_type_check check (
  doc_type in (
    'lab_report',
    'prescription',
    'discharge',
    'scan',
    'bill',
    'consultation_invoice',
    'booking_invoice',
    'vaccination',
    'insurance',
    'medication',
    'other'
  )
);

create or replace function document_display_title (p_doc documents) returns text
set
  search_path = public as $$
  select coalesce(
    nullif(trim(p_doc.extraction ->> 'title'), ''),
    case p_doc.doc_type
      when 'lab_report' then 'Lab report'
      when 'prescription' then 'Prescription'
      when 'discharge' then 'Discharge summary'
      when 'scan' then 'Scan'
      when 'bill' then 'Bill'
      when 'consultation_invoice' then 'Consultation invoice'
      when 'booking_invoice' then 'Booking invoice'
      when 'vaccination' then 'Vaccination record'
      when 'insurance' then 'Insurance policy'
      when 'medication' then 'Medication list'
      else 'Document'
    end
  );
$$ language sql stable;

-- ------------------------------------------ quiet for app-made records --

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
      'A few lines weren''t clear enough for me to be sure. Have a look and confirm, it takes a minute.',
      '/records/' || new.id,
      'review:' || new.id
    );
  elsif new.status = 'filed' then
    if tg_op = 'INSERT' or old.status = 'processing' then
      perform notify_user(
        new.user_id, new.profile_id, new.id, 'report_ready',
        v_title || ' is filed',
        'It''s in ' || v_whose || ' health file now. Ask me anything about it.',
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

-- An invoice number people can read out on a support call: a prefix, the
-- date, and five characters of the record's own id.
create or replace function invoice_number (p_prefix text, p_id uuid) returns text
set
  search_path = public as $$
  select p_prefix || '-' || to_char(now() at time zone 'Asia/Kolkata', 'YYMMDD') || '-' || upper(substr(replace(p_id::text, '-', ''), 1, 5));
$$ language sql stable;

-- Rewrites one key inside `extraction.details`.
create or replace function set_invoice_detail (p_doc uuid, p_key text, p_value jsonb) returns void
security definer
set
  search_path = public as $$
  update documents
  set extraction = jsonb_set(coalesce(extraction, '{}'), array['details', p_key], p_value, true)
  where id = p_doc;
$$ language sql;

revoke execute on function set_invoice_detail (uuid, text, jsonb) from public, anon, authenticated;

-- ------------------------------------------------- lab booking invoices --

alter table lab_bookings
add column if not exists invoice_document_id uuid references documents (id) on delete set null;

-- Where a booking's payment stands. The collector takes payment at the door,
-- so it is due until the sample is collected and paid from then on.
create or replace function lab_payment_status (p_status text) returns text
set
  search_path = public as $$
  select case
    when p_status = 'cancelled' then 'cancelled'
    when p_status in ('collected', 'processing', 'ready') then 'paid'
    else 'due'
  end;
$$ language sql immutable;

create or replace function file_lab_invoice (p_booking uuid) returns uuid
security definer
set
  search_path = public as $$
declare
  b lab_bookings;
  v_partner text;
  v_doc uuid := gen_random_uuid();
  v_tests jsonb;
begin
  select * into b from lab_bookings where id = p_booking;
  if not found or b.invoice_document_id is not null then
    return b.invoice_document_id;
  end if;

  select name into v_partner from lab_partners where id = b.partner_id;

  -- Each test at the price this partner charged for it when booked.
  select coalesce(jsonb_agg(jsonb_build_object('name', t.name, 'price', coalesce(o.price, 0)) order by t.name), '[]')
  into v_tests
  from lab_tests t
  left join lab_offers o on o.test_id = t.id and o.partner_id = b.partner_id
  where t.id = any (b.tests);

  insert into documents (id, profile_id, user_id, storage_path, mime_type, doc_type, status, event_date, facility, confidence, raw_text, extraction)
  values (
    v_doc, b.profile_id, b.user_id,
    b.user_id || '/' || b.profile_id || '/invoice-' || v_doc || '.pdf',
    'application/pdf', 'booking_invoice', 'filed',
    (b.created_at at time zone 'Asia/Kolkata')::date, v_partner, 1,
    'Invoice for lab booking ' || b.id || ' with ' || v_partner,
    jsonb_build_object(
      'title', 'Home collection · ' || v_partner,
      'source', 'cheeku',
      'booking_id', b.id,
      'details', jsonb_build_object(
        'invoiceNo', invoice_number('LB', v_doc),
        'issuedAt', b.created_at,
        'partner', v_partner,
        'bookingId', b.id,
        'tests', v_tests,
        'collectionFee', b.collection_fee,
        'subtotal', b.subtotal,
        'total', b.total,
        'status', lab_payment_status(b.status),
        'slot', jsonb_build_object('date', b.slot_date, 'window', b.slot_window),
        'sample', true
      )
    )
  );

  update lab_bookings set invoice_document_id = v_doc where id = b.id;
  return v_doc;
end;
$$ language plpgsql;

revoke execute on function file_lab_invoice (uuid) from public, anon, authenticated;

create or replace function lab_booking_invoice_trigger () returns trigger
security definer
set
  search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform file_lab_invoice(new.id);
  elsif new.status is distinct from old.status and new.invoice_document_id is not null then
    perform set_invoice_detail(new.invoice_document_id, 'status', to_jsonb(lab_payment_status(new.status)));
  end if;
  return null;
end;
$$ language plpgsql;

drop trigger if exists lab_bookings_invoice_trigger on lab_bookings;

create trigger lab_bookings_invoice_trigger
after insert or update of status on lab_bookings for each row
execute function lab_booking_invoice_trigger ();

-- Bookings made before this migration get their invoice too, for members the
-- plan still covers (the document plan check would refuse the rest).
select file_lab_invoice (b.id)
from lab_bookings b
where b.invoice_document_id is null
  and b.profile_id in (select covered_profile_ids (b.user_id));

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
