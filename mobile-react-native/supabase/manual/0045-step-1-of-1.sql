-- 0045 step 1 of 1. Partner network (labs, medicines, doctors): new columns on
-- lab bookings, tables for medicine orders, doctor visits, instant consults,
-- problems reported and the webhook log, and the function that moves a real
-- lab booking on the partner's word. Paste into the Supabase SQL editor and
-- Run. Safe to run again. Then run 0045-check.sql: every row should say yes.
-- Needs 0027 (labs) and 0036 (notification copy) already in place.

begin;

-- ------------------------------------------------------------------ labs --

-- LabStack is one partner row; the lab LabStack picks is kept per booking.
insert into lab_partners (id, name, monogram, tagline, about, accreditation, collection_fee, free_collection_above, report_hours, price_factor, color, is_sample)
values ('labstack', 'Partner labs', 'LS', 'Home collection across India', 'Accredited labs in the partner network. The lab that serves your pincode is shown on the booking.', '{}', 0, null, 24, 1.0, '#ede9fe', false)
on conflict (id) do nothing;

alter table lab_tests add column if not exists ls_id text;
alter table lab_tests add column if not exists synced_at timestamptz;
create unique index if not exists lab_tests_ls_id_idx on lab_tests (ls_id) where ls_id is not null;

alter table lab_bookings alter column slot_window drop not null;
alter table lab_bookings add column if not exists ls_order_id bigint;
alter table lab_bookings add column if not exists ls_status text;
alter table lab_bookings add column if not exists order_type text not null default 'HOME_SAMPLE' check (order_type in ('HOME_SAMPLE', 'CENTER_VISIT'));
alter table lab_bookings add column if not exists appointment_at timestamptz;
alter table lab_bookings add column if not exists ls_lab_id bigint;
alter table lab_bookings add column if not exists lab_name text;
alter table lab_bookings add column if not exists lab_logo text check (lab_logo is null or lab_logo like 'https://%');
alter table lab_bookings add column if not exists lab_address text;
alter table lab_bookings add column if not exists phlebo jsonb;
alter table lab_bookings add column if not exists address_parts jsonb;
alter table lab_bookings add column if not exists notes text check (char_length(notes) <= 300);
alter table lab_bookings add column if not exists cancel_reason text;
alter table lab_bookings add column if not exists report_values_at timestamptz;
create unique index if not exists lab_bookings_ls_order_idx on lab_bookings (ls_order_id) where ls_order_id is not null;

-- The preview clock (0027) must never move a real order. Same function, one
-- more filter: partner orders move only on the partner's word.
create or replace function sync_lab_bookings () returns int
security definer
set
  search_path = public as $$
declare
  b lab_bookings;
  v_start timestamptz;
  v_hours int;
  v_target text;
  v_moved int := 0;
begin
  for b in select * from lab_bookings where user_id = auth.uid() and status not in ('ready', 'cancelled') and ls_order_id is null and partner_id <> 'labstack' loop
    v_start := lab_slot_start(b);
    select report_hours into v_hours from lab_partners where id = b.partner_id;
    v_target := case
      when now() >= v_start + make_interval(hours => v_hours) then 'ready'
      when now() >= v_start + interval '90 minutes' then 'processing'
      when now() >= v_start + interval '30 minutes' then 'collected'
      when now() >= v_start - interval '14 hours' then 'assigned'
      else 'booked'
    end;
    while b.status <> v_target and b.status not in ('ready', 'cancelled') loop
      perform apply_lab_status(b.id, case b.status
        when 'booked' then 'assigned'
        when 'assigned' then 'collected'
        when 'collected' then 'processing'
        else 'ready' end);
      select * into b from lab_bookings where id = b.id;
      v_moved := v_moved + 1;
    end loop;
  end loop;
  return v_moved;
end;
$$ language plpgsql;

-- A partner status landed (webhook or a pull). Keeps the partner's own status
-- in ls_status and moves our coarse stage the way the app lists it, with the
-- same inbox notes as the preview. Results are NOT made up here: the Edge
-- Function files the real PDF and values first and passes the document id.
create or replace function apply_partner_lab_status (p_id uuid, p_ls_status text, p_doc uuid default null) returns void
security definer
set
  search_path = public as $$
declare
  b lab_bookings;
  v_stage text;
  v_when text;
begin
  select * into b from lab_bookings where id = p_id for update;
  if not found then return; end if;

  update lab_bookings set ls_status = p_ls_status where id = p_id;
  if b.status in ('ready', 'cancelled') then return; end if;

  v_stage := case
    when p_ls_status in ('PHLEBO_ASSIGNED', 'PHLEBO_STARTED', 'PATIENT_VISITED') then 'assigned'
    when p_ls_status in ('SAMPLE_COLLECTED', 'SAMPLE_IN_TRANSIT') then 'collected'
    when p_ls_status in ('SAMPLE_DELIVERED', 'SAMPLE_PROCESSED', 'PARTIAL_DELIVERED') then 'processing'
    when p_ls_status = 'REPORT_DELIVERED' and p_doc is not null then 'ready'
    when p_ls_status in ('CANCELED', 'PHLEBO_NO_SHOW', 'PATIENT_MISSED', 'SAMPLE_REJECTED') then 'cancelled'
    else null
  end;
  if v_stage is null or v_stage = b.status then return; end if;

  update lab_bookings set status = v_stage, status_at = now(), result_document_id = coalesce(p_doc, result_document_id) where id = p_id;
  -- "Ready" is announced by the document trigger (0024) when the report is filed.
  if v_stage = 'ready' then return; end if;

  v_when := to_char(coalesce(b.appointment_at, b.slot_date::timestamptz) at time zone 'Asia/Kolkata', 'Dy FMDD Mon, FMHH12:MI am');
  perform notify_user(
    b.user_id, b.profile_id, null,
    case when v_stage = 'cancelled' then 'lab_cancelled' else 'lab_update' end,
    case v_stage
      when 'assigned' then 'Your collector is assigned'
      when 'collected' then 'Sample collected'
      when 'processing' then 'The lab is on it'
      else 'Lab booking cancelled'
    end,
    case v_stage
      when 'assigned' then 'Arriving ' || v_when || '. Mind the fasting rules.'
      when 'collected' then coalesce(b.lab_name, 'The lab') || ' has it. I''ll file the report when it''s out.'
      when 'processing' then 'Nothing to do but wait. I''ll file the report.'
      else case p_ls_status
        when 'PHLEBO_NO_SHOW' then 'The collector didn''t make it. Book a new time from the booking.'
        when 'PATIENT_MISSED' then 'The collector couldn''t reach you. Book a new time from the booking.'
        when 'SAMPLE_REJECTED' then 'The lab couldn''t use the sample. Book again from the booking.'
        else 'Nothing will be collected.'
      end
    end,
    '/labs/booking/' || b.id,
    'lab:' || b.id || ':' || p_ls_status
  );
end;
$$ language plpgsql;

revoke execute on function apply_partner_lab_status (uuid, text, uuid) from public, anon, authenticated;
grant execute on function apply_partner_lab_status (uuid, text, uuid) to service_role;

-- Problems reported on a lab order or a doctor visit (LabStack escalations).
create table if not exists partner_escalations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('lab', 'pharmacy', 'consult')),
  ref uuid not null,
  ls_escalation_id bigint,
  issue text not null check (char_length(issue) <= 60),
  details text not null check (char_length(details) <= 500),
  status text not null default 'open',
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------- pharmacy --

create table if not exists pharma_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  ls_order_id bigint unique,
  ls_super_order_id bigint,
  ls_pharmacy_id bigint not null,
  pharmacy_name text not null,
  order_type text not null check (order_type in ('HOME_DELIVERY', 'PICKUP')),
  shipment_speed text check (shipment_speed in ('STANDARD', 'EXPRESS', 'SAME_DAY', 'PAN_INDIA')),
  status text not null default 'PLACED',
  -- [{drugMasterId, name, pack, quantity, mrp, unitPrice, linePrice}]
  items jsonb not null default '[]',
  total numeric(10, 2) not null default 0,
  tracking_id text,
  pickup jsonb,
  related jsonb not null default '[]',
  prescription_document_ids uuid[] not null default '{}',
  cancel_reason text,
  placed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pharma_orders_user_idx on pharma_orders (user_id, placed_at desc);

-- --------------------------------------------------------- consultations --

create table if not exists consult_appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  ls_appointment_id bigint unique,
  ls_provider_id bigint,
  doctor_name text not null,
  speciality text,
  appointment_type text not null check (appointment_type in ('ONLINE', 'CENTER_VISIT', 'HOME_VISIT')),
  meeting_type text not null default 'VIDEO' check (meeting_type in ('VIDEO', 'AUDIO_ONLY')),
  appointment_at timestamptz not null,
  status text not null default 'CREATED',
  prescription_document_id uuid references documents (id) on delete set null,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists consult_appointments_user_idx on consult_appointments (user_id, appointment_at desc);

-- "Talk to a doctor now" requests, so only the person who asked can poll one.
create table if not exists instant_consults (
  ls_request_id bigint primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  status text not null default 'BROADCASTING',
  expires_at timestamptz,
  ls_appointment_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------- webhooks --

-- Every webhook, once. Delivery is at least once, so the receiver inserts
-- here first and stops if the row already exists.
create table if not exists partner_events (
  id bigint generated always as identity primary key,
  source text not null check (source in ('labs', 'pharma', 'provider', 'instant')),
  ref text not null,
  event text not null,
  status text not null default '',
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text,
  unique (source, ref, event, status)
);

-- ------------------------------------------------------------------- RLS --

alter table partner_escalations enable row level security;
alter table pharma_orders enable row level security;
alter table consult_appointments enable row level security;
alter table partner_events enable row level security;
alter table instant_consults enable row level security;

drop policy if exists "users read own instant consults" on instant_consults;
create policy "users read own instant consults" on instant_consults for select using (auth.uid() = user_id);

drop policy if exists "users read own escalations" on partner_escalations;
create policy "users read own escalations" on partner_escalations for select using (auth.uid() = user_id);
drop policy if exists "users read own pharma orders" on pharma_orders;
create policy "users read own pharma orders" on pharma_orders for select using (auth.uid() = user_id);
drop policy if exists "users read own consults" on consult_appointments;
create policy "users read own consults" on consult_appointments for select using (auth.uid() = user_id);
-- partner_events: no policy, so only the service role reads or writes it.

commit;
