-- MIGRATION 0028, PART 1 OF 3: doc types, titles and the quiet inbox rule.
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


commit;
