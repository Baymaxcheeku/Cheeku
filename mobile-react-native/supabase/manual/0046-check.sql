-- Is 0046 (partner payment link) in place? Read only. Paste into the Supabase
-- SQL editor and Run. Every row should say yes.
with checks (looks_for, applied) as (values
  ('lab bookings can hold a payment link',
    (select count(*) = 3 from information_schema.columns where table_name = 'lab_bookings' and column_name in ('payment_required', 'payment_link', 'payment_due_at'))),
  ('medicine orders can hold a payment link',
    (select count(*) = 3 from information_schema.columns where table_name = 'pharma_orders' and column_name in ('payment_required', 'payment_link', 'payment_due_at'))),
  ('doctor visits can hold a payment link',
    (select count(*) = 3 from information_schema.columns where table_name = 'consult_appointments' and column_name in ('payment_required', 'payment_link', 'payment_due_at')))
)
select looks_for, case when applied then 'yes' else 'NO' end as applied from checks;
