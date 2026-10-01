-- 0028 step 5 of 6. Run the steps in order, each in a new query. Safe to run again.
begin;

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
        'status', case when p_mode = 'online' then 'paid' else 'due' end,
        'paymentMode', case when p_mode = 'online' then 'Paid in app' else 'Pay at the clinic' end,
        'sample', true
      )
    )
  );
  return v_doc;
end;
$$ language plpgsql;

commit;
