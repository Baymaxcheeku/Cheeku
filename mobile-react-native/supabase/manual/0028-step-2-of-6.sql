-- 0028 step 2 of 6. Run the steps in order, each in a new query. Safe to run again.
begin;

create or replace function invoice_number (p_prefix text, p_id uuid) returns text
set
  search_path = public as $$
  select p_prefix || '-' || to_char(now() at time zone 'Asia/Kolkata', 'YYMMDD') || '-' || upper(substr(replace(p_id::text, '-', ''), 1, 5));
$$ language sql stable;
create or replace function set_invoice_detail (p_doc uuid, p_key text, p_value jsonb) returns void
security definer
set
  search_path = public as $$
  update documents
  set extraction = jsonb_set(coalesce(extraction, '{}'), array['details', p_key], p_value, true)
  where id = p_doc;
$$ language sql;
revoke execute on function set_invoice_detail (uuid, text, jsonb) from public, anon, authenticated;
alter table lab_bookings
add column if not exists invoice_document_id uuid references documents (id) on delete set null;
create or replace function lab_payment_status (p_status text) returns text
set
  search_path = public as $$
  select case
    when p_status = 'cancelled' then 'cancelled'
    when p_status in ('collected', 'processing', 'ready') then 'paid'
    else 'due'
  end;
$$ language sql immutable;

commit;
