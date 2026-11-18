-- 0046: the partner's payment link, kept on each order.
--
-- LabStack collects the money through a link that is valid for 16 minutes;
-- an order not paid by then is cancelled on their side. The link only comes
-- back once, in the place-order answer, so we keep it here: someone who
-- leaves the app and comes back can still tap "Pay now" on the order.
--
-- Written only by the labstack Edge Function (service role). The app reads
-- these columns through the existing row-level security, like the rest of
-- the order. Running this twice is safe.

alter table public.lab_bookings
  add column if not exists payment_required boolean not null default false,
  add column if not exists payment_link text,
  add column if not exists payment_due_at timestamptz;

alter table public.pharma_orders
  add column if not exists payment_required boolean not null default false,
  add column if not exists payment_link text,
  add column if not exists payment_due_at timestamptz;

alter table public.consult_appointments
  add column if not exists payment_required boolean not null default false,
  add column if not exists payment_link text,
  add column if not exists payment_due_at timestamptz;
