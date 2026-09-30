-- MIGRATION 0028, PART 2 OF 3: lab booking invoices.
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


commit;
