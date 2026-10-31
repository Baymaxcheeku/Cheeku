-- 0028 step 1 of 6. Run the steps in order, each in a new query. Safe to run again.
begin;

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
create or replace function notify_document_change () returns trigger
security definer
set
  search_path = public as $$
declare
  v_title text := document_display_title(new);
  v_whose text := coalesce(whose_file(new.profile_id), 'your');
begin
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

commit;
