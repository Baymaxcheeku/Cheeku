-- 0028 step 4 of 6. Run the steps in order, each in a new query. Safe to run again.
begin;

create trigger lab_bookings_invoice_trigger
after insert or update of status on lab_bookings for each row
execute function lab_booking_invoice_trigger ();
select file_lab_invoice (b.id)
from lab_bookings b
where b.invoice_document_id is null
  and b.profile_id in (select covered_profile_ids (b.user_id));

commit;
