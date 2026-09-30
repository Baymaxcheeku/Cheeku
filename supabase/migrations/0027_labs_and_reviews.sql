-- Lab tests at home, and ratings and reviews for the people you book.
--
-- PREVIEW DATA. The partner labs, their prices, their turnaround times and
-- every seeded review are SAMPLES for building and testing the flow. They are
-- flagged `is_sample` and the app labels them. Nothing here is a real
-- partnership, a real price list or a real customer's words. Replace the seed
-- with a partner feed before launch.
--
-- WHAT IS REAL:
--  - the catalogue, pricing and totals are computed in the database, so a
--    client cannot book at a price it made up;
--  - a booking can only be made for a family member the plan covers;
--  - status changes write to the inbox;
--  - when results are ready, they are filed as a real document with real
--    values under the right family member, so they appear in Records, in the
--    health file and in Ask exactly as an uploaded report would.
--
-- RESULTS SYNC. With no partner integration yet, `sync_lab_bookings()` moves
-- each booking through its stages by the clock (collector assigned the
-- evening before, sample collected in the slot, processing, then ready after
-- the lab's turnaround). For walking the whole flow in a demo without waiting
-- a day, `advance_lab_booking_demo()` steps one stage at a time, gated by
-- `app_flags.demo_labs` exactly like demo billing (0012). Turn it off before
-- launch.

-- ------------------------------------------------------------- catalogue --

create table lab_partners (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name text not null,
  monogram text not null,
  tagline text not null,
  about text not null,
  accreditation text[] not null default '{}',
  collection_fee int not null check (collection_fee >= 0),
  free_collection_above int,
  report_hours int not null check (report_hours between 4 and 168),
  price_factor numeric(4, 2) not null default 1.0,
  color text not null,
  is_sample boolean not null default true
);

create table lab_tests (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name text not null,
  kind text not null check (kind in ('test', 'package')),
  categories text[] not null default '{}',
  sample text not null,
  fasting_hours int not null default 0,
  parameters int not null,
  includes text[] not null default '{}',
  about text not null,
  keywords text[] not null default '{}',
  base_price int not null check (base_price > 0),
  popular boolean not null default false
);

create table lab_offers (
  partner_id text not null references lab_partners (id) on delete cascade,
  test_id text not null references lab_tests (id) on delete cascade,
  price int not null check (price > 0),
  mrp int not null check (mrp >= price),
  primary key (partner_id, test_id)
);

-- What each test "returns" in the preview: always within the printed range.
-- Sample results must never frighten anyone, and the flagged-values path is
-- already exercised by uploaded reports.
create table lab_result_templates (
  test_id text not null references lab_tests (id) on delete cascade,
  name text not null,
  canonical_name text not null,
  value numeric not null,
  unit text not null,
  ref_range text not null,
  primary key (test_id, canonical_name)
);

alter table lab_partners enable row level security;
alter table lab_tests enable row level security;
alter table lab_offers enable row level security;
alter table lab_result_templates enable row level security;

create policy "signed-in users read partners" on lab_partners for select to authenticated using (true);
create policy "signed-in users read tests" on lab_tests for select to authenticated using (true);
create policy "signed-in users read offers" on lab_offers for select to authenticated using (true);
-- Templates are read only by the sync function, never by the app.

-- -------------------------------------------------------------- bookings --

create table lab_bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  partner_id text not null references lab_partners (id),
  tests text[] not null check (cardinality(tests) between 1 and 20),
  subtotal int not null,
  collection_fee int not null,
  total int not null,
  slot_date date not null,
  slot_window text not null check (slot_window in ('6-8 am', '8-10 am', '10-12 pm', '4-6 pm')),
  address text not null check (char_length(address) between 8 and 300),
  prescription_document_id uuid references documents (id) on delete set null,
  status text not null default 'booked' check (
    status in ('booked', 'assigned', 'collected', 'processing', 'ready', 'cancelled')
  ),
  status_at timestamptz not null default now(),
  result_document_id uuid references documents (id) on delete set null,
  created_at timestamptz not null default now()
);

create index lab_bookings_user_idx on lab_bookings (user_id, slot_date desc);

alter table lab_bookings enable row level security;

-- Read only. Every write goes through the functions below, which compute the
-- price and check the plan; a direct insert could name any price at all.
create policy "users read own lab bookings" on lab_bookings for select using (auth.uid() = user_id);

-- --------------------------------------------------------------- reviews --

create table provider_reviews (
  id uuid primary key default gen_random_uuid(),
  provider_kind text not null check (provider_kind in ('doctor', 'lab')),
  provider_id text not null check (char_length(provider_id) between 1 and 40),
  user_id uuid references auth.users (id) on delete cascade,
  author text not null check (char_length(author) between 1 and 40),
  city text check (char_length(city) <= 40),
  rating int not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 3 and 600),
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index provider_reviews_one_each on provider_reviews (user_id, provider_kind, provider_id)
where
  user_id is not null;

create index provider_reviews_provider_idx on provider_reviews (provider_kind, provider_id, created_at desc);

alter table provider_reviews enable row level security;

create policy "signed-in users read reviews" on provider_reviews for select to authenticated using (true);

create policy "users write their own review" on provider_reviews for insert
with
  check (auth.uid() = user_id and is_sample = false);

create policy "users edit their own review" on provider_reviews
for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and is_sample = false);

create policy "users delete their own review" on provider_reviews for delete using (auth.uid() = user_id);

create view provider_ratings
with
  (security_invoker = true) as
select
  provider_kind,
  provider_id,
  round(avg(rating)::numeric, 1) as rating,
  count(*)::int as reviews
from provider_reviews
group by provider_kind, provider_id;

-- ------------------------------------------ the inbox learns about labs --

alter table notifications drop constraint notifications_kind_check;

alter table notifications
add constraint notifications_kind_check check (
  kind in (
    'report_ready', 'report_review', 'report_flagged',
    'appointment_booked', 'appointment_rescheduled', 'appointment_cancelled',
    'lab_booked', 'lab_update', 'lab_cancelled',
    'family_added', 'family_removed',
    'plan_changed', 'plan_ended', 'password_changed', 'support_update',
    'service_live', 'welcome'
  )
);

alter table notifications drop column category;

alter table notifications
add column category text generated always as (
  case
    when kind like 'report\_%' then 'reports'
    when kind like 'appointment\_%' or kind like 'lab\_%' then 'appointments'
    when kind in ('family_added', 'family_removed') then 'family'
    when kind in ('plan_changed', 'plan_ended', 'password_changed', 'support_update') then 'account'
    else 'updates'
  end
) stored;

insert into app_flags (key, enabled, note)
values ('demo_labs', true, 'Lets advance_lab_booking_demo step a lab booking forward on demand. MUST be false before real lab partners go live.')
on conflict (key) do nothing;

-- ------------------------------------------------------------- functions --

create function lab_test_names (p_tests text[]) returns text
set
  search_path = public as $$
  select string_agg(t.name, ', ' order by array_position(p_tests, t.id))
  from lab_tests t where t.id = any (p_tests);
$$ language sql stable;

create function create_lab_booking (
  p_profile uuid,
  p_partner text,
  p_tests text[],
  p_date date,
  p_window text,
  p_address text,
  p_prescription uuid default null
) returns uuid
security definer
set
  search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_partner lab_partners;
  v_subtotal int;
  v_offered int;
  v_fee int;
  v_id uuid;
  v_name text;
begin
  if v_user is null then
    raise exception 'not signed in' using errcode = 'insufficient_privilege';
  end if;

  if not exists (select 1 from covered_profile_ids(v_user) c(id) where c.id = p_profile) then
    raise exception 'that family member is not covered by the current plan' using errcode = 'check_violation';
  end if;

  select * into v_partner from lab_partners where id = p_partner;
  if not found then
    raise exception 'unknown lab' using errcode = 'check_violation';
  end if;

  if p_date < current_date or p_date > current_date + 14 then
    raise exception 'pick a day in the next two weeks' using errcode = 'check_violation';
  end if;

  if p_prescription is not null and not exists (
    select 1 from documents d where d.id = p_prescription and d.user_id = v_user
  ) then
    raise exception 'unknown prescription' using errcode = 'check_violation';
  end if;

  select count(*), coalesce(sum(o.price), 0) into v_offered, v_subtotal
  from lab_offers o
  where o.partner_id = p_partner and o.test_id = any (p_tests);

  if v_offered = 0 or v_offered <> cardinality(array(select distinct unnest(p_tests))) then
    raise exception 'this lab does not offer every test chosen' using errcode = 'check_violation';
  end if;

  v_fee := case when v_partner.free_collection_above is not null and v_subtotal >= v_partner.free_collection_above then 0 else v_partner.collection_fee end;

  insert into lab_bookings (user_id, profile_id, partner_id, tests, subtotal, collection_fee, total, slot_date, slot_window, address, prescription_document_id)
  values (v_user, p_profile, p_partner, array(select distinct unnest(p_tests)), v_subtotal, v_fee, v_subtotal + v_fee, p_date, p_window, trim(p_address), p_prescription)
  returning id into v_id;

  select name into v_name from profiles where id = p_profile;

  perform notify_user(
    v_user, p_profile, null, 'lab_booked',
    'Home collection booked with ' || v_partner.name,
    to_char(p_date, 'Dy DD Mon') || ', ' || p_window || ' for ' || v_name || '. I''ll file the results the moment they''re ready.',
    '/labs/booking/' || v_id,
    'lab:' || v_id || ':booked'
  );
  return v_id;
end;
$$ language plpgsql;

revoke execute on function create_lab_booking (uuid, text, text[], date, text, text, uuid) from public, anon;
grant execute on function create_lab_booking (uuid, text, text[], date, text, text, uuid) to authenticated;

-- Moves one booking to a status, telling the inbox, and on "ready" files the
-- results as a document under the member it was booked for. Internal.
create function apply_lab_status (p_id uuid, p_status text) returns void
security definer
set
  search_path = public as $$
declare
  b lab_bookings;
  v_partner text;
  v_doc uuid;
  v_title text;
  v_lines text[] := '{}';
begin
  select * into b from lab_bookings where id = p_id for update;
  if not found or b.status = p_status or b.status in ('ready', 'cancelled') then
    return;
  end if;

  select name into v_partner from lab_partners where id = b.partner_id;

  if p_status = 'ready' then
    v_title := lab_test_names(b.tests);
    insert into documents (profile_id, user_id, storage_path, mime_type, doc_type, status, event_date, facility, confidence, raw_text, extraction)
    values (
      b.profile_id, b.user_id,
      b.user_id || '/' || b.profile_id || '/lab-' || b.id || '.pdf',
      'application/pdf', 'lab_report', 'filed', b.slot_date, v_partner, 1,
      'Results delivered by ' || v_partner || ' for booking ' || b.id,
      jsonb_build_object('title', left(v_title, 80), 'source', 'lab_partner', 'booking_id', b.id, 'partner', v_partner)
    )
    returning id into v_doc;

    insert into entities (profile_id, user_id, document_id, kind, name, canonical_name, value, unit, ref_range, flag, event_date)
    select distinct on (r.canonical_name)
      b.profile_id, b.user_id, v_doc, 'lab_value', r.name, r.canonical_name, r.value, r.unit, r.ref_range, 'normal', b.slot_date
    from lab_tests t
    join lab_result_templates r on r.test_id = any (array_append(t.includes, t.id))
    where t.id = any (b.tests)
    order by r.canonical_name;

    update lab_bookings set status = 'ready', status_at = now(), result_document_id = v_doc where id = p_id;
    -- The document trigger (0024) has already written "… is filed".
    return;
  end if;

  update lab_bookings set status = p_status, status_at = now() where id = p_id;

  perform notify_user(
    b.user_id, b.profile_id, null,
    case when p_status = 'cancelled' then 'lab_cancelled' else 'lab_update' end,
    case p_status
      when 'assigned' then 'Your sample collector is assigned'
      when 'collected' then 'Sample collected'
      when 'processing' then 'The lab is running your tests'
      else 'Lab booking cancelled'
    end,
    case p_status
      when 'assigned' then 'They''ll arrive ' || to_char(b.slot_date, 'Dy DD Mon') || ', ' || b.slot_window || '. Keep the fasting rules in mind.'
      when 'collected' then v_partner || ' has the sample. Results usually take a day.'
      when 'processing' then 'Nothing to do but wait. I''ll file the report the moment it lands.'
      else 'Nothing will be collected, and you won''t be charged.'
    end,
    '/labs/booking/' || b.id,
    'lab:' || b.id || ':' || p_status
  );
end;
$$ language plpgsql;

revoke execute on function apply_lab_status (uuid, text) from public, anon, authenticated;

create function lab_slot_start (b lab_bookings) returns timestamptz
set
  search_path = public as $$
  select (b.slot_date + make_interval(hours => split_part(b.slot_window, '-', 1)::int))::timestamptz;
$$ language sql immutable;

-- Brings every open booking of the caller up to date by the clock. Called by
-- the app whenever lab screens open; cheap when nothing has changed.
create function sync_lab_bookings () returns int
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
  for b in select * from lab_bookings where user_id = auth.uid() and status not in ('ready', 'cancelled') loop
    v_start := lab_slot_start(b);
    select report_hours into v_hours from lab_partners where id = b.partner_id;
    v_target := case
      when now() >= v_start + make_interval(hours => v_hours) then 'ready'
      when now() >= v_start + interval '90 minutes' then 'processing'
      when now() >= v_start + interval '30 minutes' then 'collected'
      when now() >= v_start - interval '14 hours' then 'assigned'
      else 'booked'
    end;
    -- Walk the stages in order so the inbox tells the story step by step.
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

revoke execute on function sync_lab_bookings () from public, anon;
grant execute on function sync_lab_bookings () to authenticated;

create function cancel_lab_booking (p_id uuid) returns boolean
security definer
set
  search_path = public as $$
begin
  if not exists (select 1 from lab_bookings where id = p_id and user_id = auth.uid() and status in ('booked', 'assigned')) then
    return false;
  end if;
  perform apply_lab_status(p_id, 'cancelled');
  return true;
end;
$$ language plpgsql;

revoke execute on function cancel_lab_booking (uuid) from public, anon;
grant execute on function cancel_lab_booking (uuid) to authenticated;

-- PREVIEW ONLY: one stage forward, now. Gated like demo billing.
create function advance_lab_booking_demo (p_id uuid) returns text
security definer
set
  search_path = public as $$
declare
  b lab_bookings;
begin
  if not coalesce((select enabled from app_flags where key = 'demo_labs'), false) then
    raise exception 'demo labs are disabled' using errcode = 'insufficient_privilege';
  end if;
  select * into b from lab_bookings where id = p_id and user_id = auth.uid();
  if not found or b.status in ('ready', 'cancelled') then
    return coalesce(b.status, 'missing');
  end if;
  perform apply_lab_status(p_id, case b.status
    when 'booked' then 'assigned'
    when 'assigned' then 'collected'
    when 'collected' then 'processing'
    else 'ready' end);
  return (select status from lab_bookings where id = p_id);
end;
$$ language plpgsql;

revoke execute on function advance_lab_booking_demo (uuid) from public, anon;
grant execute on function advance_lab_booking_demo (uuid) to authenticated;

-- ------------------------------------------------------------ sample seed --

insert into lab_partners (id, name, monogram, tagline, about, accreditation, collection_fee, free_collection_above, report_hours, price_factor, color) values
  ('lalpath', 'Dr Lal PathLabs', 'LPL', 'Trusted by families for decades', 'One of India''s largest diagnostic networks, with home collection across most cities and reports reviewed by a pathologist.', '{NABL,CAP}', 99, 999, 24, 1.10, '#e8f0ff'),
  ('thyrocare', 'Thyrocare', 'TC', 'Big panels at small prices', 'Known for affordable wellness packages processed at a central, automated lab. Early morning collection.', '{NABL}', 0, null, 36, 0.85, '#fff1e3'),
  ('metropolis', 'Metropolis Healthcare', 'MH', 'Specialist tests, careful reporting', 'A pan-India lab network strong in specialist and hormone testing, with doctor-reviewed reports.', '{NABL,CAP}', 149, 1499, 24, 1.15, '#f3ecff'),
  ('redcliffe', 'Redcliffe Labs', 'RL', 'Fast home collection', 'Home-first diagnostics with quick slots and same-day reports for common tests.', '{NABL}', 49, 699, 18, 0.95, '#ffe9f1'),
  ('healthians', 'Healthians', 'HL', 'Health checkups at home', 'Home collection specialists with a wide choice of preventive checkup packages.', '{NABL}', 0, null, 30, 0.90, '#e3f5ef');

insert into lab_tests (id, name, kind, categories, sample, fasting_hours, parameters, includes, about, keywords, base_price, popular) values
  ('cbc', 'Complete blood count (CBC)', 'test', '{fever,general,women}', 'Blood', 0, 24, '{}', 'Counts red cells, white cells and platelets. The first test for tiredness, fever or infection.', '{cbc,blood count,haemoglobin,hemoglobin,hb,platelets,wbc,anaemia,anemia}', 350, true),
  ('hba1c', 'HbA1c', 'test', '{diabetes}', 'Blood', 0, 1, '{}', 'Your average blood sugar over the last three months. The main test for tracking diabetes.', '{hba1c,sugar,diabetes,glucose,a1c}', 450, true),
  ('fbs', 'Fasting blood sugar', 'test', '{diabetes}', 'Blood', 10, 1, '{}', 'Blood sugar after an overnight fast.', '{fbs,fasting sugar,glucose,diabetes,sugar}', 120, false),
  ('lipid', 'Lipid profile', 'test', '{heart,diabetes}', 'Blood', 12, 8, '{}', 'Cholesterol and triglycerides, for heart health.', '{lipid,cholesterol,ldl,hdl,triglycerides,heart}', 500, true),
  ('thyroid', 'Thyroid profile (T3, T4, TSH)', 'test', '{thyroid,women}', 'Blood', 0, 3, '{}', 'Checks how your thyroid gland is working.', '{thyroid,tsh,t3,t4,hypothyroid,hyperthyroid}', 450, true),
  ('vitd', 'Vitamin D', 'test', '{vitamins,women,senior}', 'Blood', 0, 1, '{}', 'Low vitamin D is very common in India and can cause tiredness and bone aches.', '{vitamin d,vit d,d3,bones,vitamins}', 900, true),
  ('b12', 'Vitamin B12', 'test', '{vitamins,senior}', 'Blood', 0, 1, '{}', 'Low B12 causes tiredness, tingling and memory trouble, especially in vegetarians and elders.', '{b12,vitamin b12,cobalamin,vitamins,tingling}', 800, false),
  ('lft', 'Liver function test (LFT)', 'test', '{general}', 'Blood', 0, 11, '{}', 'Enzymes and proteins that show how the liver is doing.', '{lft,liver,sgpt,sgot,bilirubin,alt,ast}', 600, false),
  ('kft', 'Kidney function test (KFT)', 'test', '{diabetes,senior}', 'Blood', 0, 8, '{}', 'Creatinine, urea and salts that show how well the kidneys filter.', '{kft,kidney,creatinine,urea,rft,renal}', 600, false),
  ('urine', 'Urine routine', 'test', '{general,fever}', 'Urine', 0, 20, '{}', 'Checks urine for infection, sugar and protein.', '{urine,routine,uti,infection}', 150, false),
  ('ferritin', 'Iron studies with ferritin', 'test', '{women,vitamins}', 'Blood', 0, 4, '{}', 'Shows your iron stores. Useful for tiredness, hair fall and heavy periods.', '{iron,ferritin,anaemia,anemia,hair fall}', 900, false),
  ('crp', 'CRP (C-reactive protein)', 'test', '{fever,heart}', 'Blood', 0, 1, '{}', 'A general marker of inflammation or infection.', '{crp,inflammation,infection,fever}', 500, false),
  ('pcos', 'PCOS panel', 'test', '{women}', 'Blood', 0, 5, '{}', 'Hormones doctors check for PCOS: LH, FSH, prolactin, testosterone and insulin.', '{pcos,pcod,lh,fsh,prolactin,testosterone,hormones,periods}', 1800, false),
  ('fullbody', 'Full body checkup', 'package', '{general,senior}', 'Blood and urine', 12, 72, '{cbc,hba1c,lipid,thyroid,lft,kft,vitd,b12,urine}', 'The yearly all-rounder: blood count, sugar, cholesterol, thyroid, liver, kidney and key vitamins.', '{full body,checkup,annual,master,health check,preventive}', 2400, true),
  ('diabetes-care', 'Diabetes care', 'package', '{diabetes}', 'Blood and urine', 10, 38, '{hba1c,fbs,lipid,kft,urine}', 'Everything a diabetes review needs: HbA1c, fasting sugar, cholesterol, kidneys and urine.', '{diabetes,sugar,review,hba1c,package}', 1500, true),
  ('heart-care', 'Heart care', 'package', '{heart,senior}', 'Blood', 12, 12, '{lipid,crp,hba1c}', 'Cholesterol, inflammation and sugar: the heart-risk basics.', '{heart,cardiac,cholesterol,package}', 1300, false),
  ('women-wellness', 'Women''s wellness', 'package', '{women}', 'Blood', 0, 33, '{cbc,thyroid,vitd,b12,ferritin}', 'Blood count, thyroid, iron and vitamins, the usual suspects behind tiredness.', '{women,wellness,iron,thyroid,vitamins,package}', 2200, true),
  ('senior-care', 'Senior citizen care', 'package', '{senior}', 'Blood and urine', 12, 68, '{cbc,hba1c,lipid,kft,lft,vitd,b12,urine}', 'Built for parents over 60: sugar, heart, kidneys, liver, bones and B12.', '{senior,elder,parents,dadi,nana,package,old age}', 2600, true);

-- Every partner offers everything except a couple of gaps, priced from a base
-- with the partner's factor, rounded to the nearest ten.
insert into lab_offers (partner_id, test_id, price, mrp)
select p.id, t.id,
  (round(t.base_price * p.price_factor / 10) * 10)::int,
  (round(t.base_price * p.price_factor * 1.6 / 10) * 10)::int
from lab_partners p cross join lab_tests t
where not (p.id = 'thyrocare' and t.id = 'pcos')
  and not (p.id = 'healthians' and t.id in ('ferritin', 'crp'));

insert into lab_result_templates (test_id, name, canonical_name, value, unit, ref_range) values
  ('cbc', 'Haemoglobin', 'hemoglobin', 13.6, 'g/dL', '12.0 - 16.0'),
  ('cbc', 'Total WBC count', 'wbc', 7.2, 'x10^3/uL', '4.0 - 11.0'),
  ('cbc', 'Platelet count', 'platelets', 2.6, 'lakh/uL', '1.5 - 4.5'),
  ('hba1c', 'HbA1c', 'hba1c', 5.4, '%', '4.0 - 5.6'),
  ('fbs', 'Fasting glucose', 'fasting_glucose', 92, 'mg/dL', '70 - 100'),
  ('lipid', 'Total cholesterol', 'total_cholesterol', 172, 'mg/dL', '< 200'),
  ('lipid', 'LDL cholesterol', 'ldl', 98, 'mg/dL', '< 100'),
  ('lipid', 'HDL cholesterol', 'hdl', 52, 'mg/dL', '> 40'),
  ('lipid', 'Triglycerides', 'triglycerides', 128, 'mg/dL', '< 150'),
  ('thyroid', 'TSH', 'tsh', 2.1, 'uIU/mL', '0.4 - 4.0'),
  ('thyroid', 'Free T4', 'ft4', 1.2, 'ng/dL', '0.8 - 1.8'),
  ('vitd', 'Vitamin D (25-OH)', 'vitamin_d', 34, 'ng/mL', '30 - 100'),
  ('b12', 'Vitamin B12', 'vitamin_b12', 420, 'pg/mL', '200 - 900'),
  ('lft', 'SGPT (ALT)', 'alt', 24, 'U/L', '< 40'),
  ('lft', 'SGOT (AST)', 'ast', 22, 'U/L', '< 40'),
  ('kft', 'Creatinine', 'creatinine', 0.9, 'mg/dL', '0.6 - 1.2'),
  ('kft', 'Blood urea', 'urea', 28, 'mg/dL', '15 - 40'),
  ('urine', 'Urine protein', 'urine_protein', 0, 'mg/dL', 'Nil'),
  ('ferritin', 'Ferritin', 'ferritin', 64, 'ng/mL', '15 - 150'),
  ('crp', 'CRP', 'crp', 2.1, 'mg/L', '< 5'),
  ('pcos', 'Prolactin', 'prolactin', 12, 'ng/mL', '4.8 - 23.3'),
  ('pcos', 'LH', 'lh', 6.2, 'mIU/mL', '2.4 - 12.6');

insert into provider_reviews (provider_kind, provider_id, author, city, rating, body, created_at, is_sample) values
  ('doctor', 'd1', 'Pooja T.', 'London', 3, 'Fine overall, but the call felt short.', now() - interval '21 days', true),
  ('doctor', 'd1', 'Vikram R.', 'Chennai', 4, 'Knew the case well from the notes. Clinic was a bit crowded.', now() - interval '17 days', true),
  ('doctor', 'd1', 'Sneha D.', 'Bengaluru', 4, 'Good consult, slightly delayed start but worth the wait.', now() - interval '114 days', true),
  ('doctor', 'd1', 'Karthik N.', 'Mumbai', 5, 'Practical advice, no unnecessary medicines. Would book again.', now() - interval '18 days', true),
  ('doctor', 'd1', 'Vikram R.', 'Hyderabad', 4, 'Knew the case well from the notes. Clinic was a bit crowded.', now() - interval '152 days', true),
  ('doctor', 'd2', 'Pooja T.', 'Bengaluru', 5, 'Very clear, calm and on time. My mother felt comfortable immediately.', now() - interval '14 days', true),
  ('doctor', 'd2', 'Neha G.', 'Delhi', 5, 'Practical advice, no unnecessary medicines. Would book again.', now() - interval '39 days', true),
  ('doctor', 'd2', 'Zoya A.', 'Delhi', 5, 'Very clear, calm and on time. My mother felt comfortable immediately.', now() - interval '29 days', true),
  ('doctor', 'd2', 'Sneha D.', 'Chennai', 5, 'Listened properly and didn''t rush. Explained the report line by line.', now() - interval '143 days', true),
  ('doctor', 'd3', 'Rahul M.', 'Ahmedabad', 5, 'Very clear, calm and on time. My mother felt comfortable immediately.', now() - interval '130 days', true),
  ('doctor', 'd3', 'Imran H.', 'Chennai', 4, 'Helpful and patient. Follow-up questions answered on chat.', now() - interval '152 days', true),
  ('doctor', 'd3', 'Siddharth J.', 'Delhi', 3, 'Fine overall, but the call felt short.', now() - interval '49 days', true),
  ('doctor', 'd3', 'Karthik N.', 'Mumbai', 4, 'Knew the case well from the notes. Clinic was a bit crowded.', now() - interval '79 days', true),
  ('doctor', 'd3', 'Meenakshi V.', 'Dubai', 5, 'Practical advice, no unnecessary medicines. Would book again.', now() - interval '76 days', true),
  ('doctor', 'd3', 'Ayesha K.', 'Mumbai', 5, 'Practical advice, no unnecessary medicines. Would book again.', now() - interval '45 days', true),
  ('doctor', 'd4', 'Aditya C.', 'Kochi', 5, 'Listened properly and didn''t rush. Explained the report line by line.', now() - interval '22 days', true),
  ('doctor', 'd4', 'Zoya A.', 'Chennai', 4, 'Helpful and patient. Follow-up questions answered on chat.', now() - interval '92 days', true),
  ('doctor', 'd4', 'Zoya A.', 'Jaipur', 5, 'Listened properly and didn''t rush. Explained the report line by line.', now() - interval '26 days', true),
  ('doctor', 'd4', 'Aditya C.', 'Dubai', 3, 'Fine overall, but the call felt short.', now() - interval '18 days', true),
  ('doctor', 'd4', 'Rohit B.', 'London', 4, 'Knew the case well from the notes. Clinic was a bit crowded.', now() - interval '117 days', true),
  ('doctor', 'd5', 'Siddharth J.', 'Bengaluru', 4, 'Helpful and patient. Follow-up questions answered on chat.', now() - interval '93 days', true),
  ('doctor', 'd5', 'Vikram R.', 'Jaipur', 5, 'Listened properly and didn''t rush. Explained the report line by line.', now() - interval '58 days', true),
  ('doctor', 'd5', 'Neha G.', 'Dubai', 4, 'Good consult, slightly delayed start but worth the wait.', now() - interval '104 days', true),
  ('doctor', 'd5', 'Aditya C.', 'Mumbai', 5, 'Very clear, calm and on time. My mother felt comfortable immediately.', now() - interval '117 days', true),
  ('doctor', 'd5', 'Fatima Z.', 'Pune', 5, 'Practical advice, no unnecessary medicines. Would book again.', now() - interval '143 days', true),
  ('doctor', 'd6', 'Siddharth J.', 'London', 4, 'Helpful and patient. Follow-up questions answered on chat.', now() - interval '62 days', true),
  ('doctor', 'd6', 'Arjun P.', 'Pune', 5, 'Very clear, calm and on time. My mother felt comfortable immediately.', now() - interval '62 days', true),
  ('doctor', 'd6', 'Zoya A.', 'Pune', 5, 'Took the pre-consultation note seriously, so we didn''t repeat everything.', now() - interval '75 days', true),
  ('doctor', 'd6', 'Imran H.', 'Kolkata', 5, 'Took the pre-consultation note seriously, so we didn''t repeat everything.', now() - interval '159 days', true),
  ('doctor', 'd6', 'Neha G.', 'Dubai', 5, 'Listened properly and didn''t rush. Explained the report line by line.', now() - interval '119 days', true),
  ('doctor', 'd7', 'Pooja T.', 'Kochi', 4, 'Helpful and patient. Follow-up questions answered on chat.', now() - interval '103 days', true),
  ('doctor', 'd7', 'Pooja T.', 'Bengaluru', 5, 'Very clear, calm and on time. My mother felt comfortable immediately.', now() - interval '20 days', true),
  ('doctor', 'd7', 'Divya L.', 'Pune', 3, 'Fine overall, but the call felt short.', now() - interval '90 days', true),
  ('doctor', 'd7', 'Vikram R.', 'Bengaluru', 5, 'Very clear, calm and on time. My mother felt comfortable immediately.', now() - interval '140 days', true),
  ('doctor', 'd7', 'Siddharth J.', 'Ahmedabad', 5, 'Listened properly and didn''t rush. Explained the report line by line.', now() - interval '21 days', true),
  ('doctor', 'd7', 'Manish Y.', 'Kochi', 4, 'Good consult, slightly delayed start but worth the wait.', now() - interval '67 days', true),
  ('doctor', 'd8', 'Aditya C.', 'Mumbai', 5, 'Listened properly and didn''t rush. Explained the report line by line.', now() - interval '127 days', true),
  ('doctor', 'd8', 'Divya L.', 'Jaipur', 3, 'Advice was okay, waited 20 minutes past the slot.', now() - interval '82 days', true),
  ('doctor', 'd8', 'Vikram R.', 'Dubai', 5, 'Took the pre-consultation note seriously, so we didn''t repeat everything.', now() - interval '70 days', true),
  ('doctor', 'd8', 'Arjun P.', 'Kolkata', 5, 'Listened properly and didn''t rush. Explained the report line by line.', now() - interval '55 days', true),
  ('doctor', 'd8', 'Lakshmi R.', 'Chennai', 3, 'Fine overall, but the call felt short.', now() - interval '142 days', true),
  ('doctor', 'd9', 'Rohit B.', 'London', 4, 'Good consult, slightly delayed start but worth the wait.', now() - interval '69 days', true),
  ('doctor', 'd9', 'Arjun P.', 'Chennai', 5, 'Very clear, calm and on time. My mother felt comfortable immediately.', now() - interval '139 days', true),
  ('doctor', 'd9', 'Lakshmi R.', 'Chennai', 5, 'Very clear, calm and on time. My mother felt comfortable immediately.', now() - interval '159 days', true),
  ('doctor', 'd9', 'Sneha D.', 'Hyderabad', 4, 'Helpful and patient. Follow-up questions answered on chat.', now() - interval '61 days', true),
  ('doctor', 'd10', 'Siddharth J.', 'Dubai', 5, 'Listened properly and didn''t rush. Explained the report line by line.', now() - interval '10 days', true),
  ('doctor', 'd10', 'Aditya C.', 'Delhi', 4, 'Good consult, slightly delayed start but worth the wait.', now() - interval '157 days', true),
  ('doctor', 'd10', 'Divya L.', 'Dubai', 3, 'Advice was okay, waited 20 minutes past the slot.', now() - interval '96 days', true),
  ('doctor', 'd10', 'Vikram R.', 'Hyderabad', 5, 'Practical advice, no unnecessary medicines. Would book again.', now() - interval '53 days', true),
  ('doctor', 'd11', 'Manish Y.', 'Ahmedabad', 5, 'Listened properly and didn''t rush. Explained the report line by line.', now() - interval '125 days', true),
  ('doctor', 'd11', 'Siddharth J.', 'London', 4, 'Good consult, slightly delayed start but worth the wait.', now() - interval '33 days', true),
  ('doctor', 'd11', 'Sneha D.', 'Jaipur', 4, 'Good consult, slightly delayed start but worth the wait.', now() - interval '114 days', true),
  ('doctor', 'd11', 'Meenakshi V.', 'Mumbai', 4, 'Knew the case well from the notes. Clinic was a bit crowded.', now() - interval '104 days', true),
  ('doctor', 'd11', 'Ayesha K.', 'Dubai', 5, 'Very clear, calm and on time. My mother felt comfortable immediately.', now() - interval '46 days', true),
  ('lab', 'lalpath', 'Zoya A.', 'Jaipur', 5, 'On time, gentle with my father, report landed in Cheeku automatically.', now() - interval '159 days', true),
  ('lab', 'lalpath', 'Aditya C.', 'London', 4, 'Good experience, the app reminder about fasting really helped.', now() - interval '42 days', true),
  ('lab', 'lalpath', 'Neha G.', 'Bengaluru', 5, 'Phlebotomist came at 7:10, painless draw, report next evening.', now() - interval '29 days', true),
  ('lab', 'lalpath', 'Neha G.', 'Kochi', 5, 'On time, gentle with my father, report landed in Cheeku automatically.', now() - interval '57 days', true),
  ('lab', 'lalpath', 'Sneha D.', 'Delhi', 5, 'On time, gentle with my father, report landed in Cheeku automatically.', now() - interval '153 days', true),
  ('lab', 'thyrocare', 'Imran H.', 'Pune', 5, 'Phlebotomist came at 7:10, painless draw, report next evening.', now() - interval '93 days', true),
  ('lab', 'thyrocare', 'Zoya A.', 'Kolkata', 4, 'Good experience, the app reminder about fasting really helped.', now() - interval '131 days', true),
  ('lab', 'thyrocare', 'Neha G.', 'Kolkata', 5, 'Phlebotomist came at 7:10, painless draw, report next evening.', now() - interval '115 days', true),
  ('lab', 'thyrocare', 'Manish Y.', 'Bengaluru', 4, 'Collector was polite, report took a few hours longer than promised.', now() - interval '47 days', true),
  ('lab', 'thyrocare', 'Manish Y.', 'Dubai', 5, 'Phlebotomist came at 7:10, painless draw, report next evening.', now() - interval '145 days', true),
  ('lab', 'thyrocare', 'Lakshmi R.', 'Kolkata', 5, 'Early morning slot worked perfectly for the fasting test.', now() - interval '30 days', true),
  ('lab', 'metropolis', 'Sneha D.', 'Delhi', 5, 'Phlebotomist came at 7:10, painless draw, report next evening.', now() - interval '28 days', true),
  ('lab', 'metropolis', 'Harpreet K.', 'Bengaluru', 5, 'Phlebotomist came at 7:10, painless draw, report next evening.', now() - interval '116 days', true),
  ('lab', 'metropolis', 'Lakshmi R.', 'Ahmedabad', 5, 'On time, gentle with my father, report landed in Cheeku automatically.', now() - interval '73 days', true),
  ('lab', 'metropolis', 'Harpreet K.', 'Jaipur', 5, 'On time, gentle with my father, report landed in Cheeku automatically.', now() - interval '136 days', true),
  ('lab', 'metropolis', 'Fatima Z.', 'Kolkata', 4, 'Collector was polite, report took a few hours longer than promised.', now() - interval '117 days', true),
  ('lab', 'metropolis', 'Vikram R.', 'Kochi', 5, 'Early morning slot worked perfectly for the fasting test.', now() - interval '83 days', true),
  ('lab', 'metropolis', 'Karthik N.', 'Kochi', 5, 'Phlebotomist came at 7:10, painless draw, report next evening.', now() - interval '57 days', true),
  ('lab', 'redcliffe', 'Vikram R.', 'Pune', 5, 'Clean kit, sealed needles opened in front of us. Very professional.', now() - interval '39 days', true),
  ('lab', 'redcliffe', 'Neha G.', 'Jaipur', 5, 'On time, gentle with my father, report landed in Cheeku automatically.', now() - interval '27 days', true),
  ('lab', 'redcliffe', 'Aditya C.', 'Pune', 5, 'On time, gentle with my father, report landed in Cheeku automatically.', now() - interval '44 days', true),
  ('lab', 'redcliffe', 'Lakshmi R.', 'Kochi', 4, 'Good experience, the app reminder about fasting really helped.', now() - interval '110 days', true),
  ('lab', 'redcliffe', 'Meenakshi V.', 'Mumbai', 5, 'Clean kit, sealed needles opened in front of us. Very professional.', now() - interval '7 days', true),
  ('lab', 'redcliffe', 'Divya L.', 'Jaipur', 5, 'Phlebotomist came at 7:10, painless draw, report next evening.', now() - interval '101 days', true),
  ('lab', 'redcliffe', 'Manish Y.', 'Delhi', 5, 'Phlebotomist came at 7:10, painless draw, report next evening.', now() - interval '31 days', true),
  ('lab', 'healthians', 'Vikram R.', 'Mumbai', 3, 'Came 40 minutes late, but the report was accurate and quick.', now() - interval '72 days', true),
  ('lab', 'healthians', 'Arjun P.', 'Delhi', 5, 'On time, gentle with my father, report landed in Cheeku automatically.', now() - interval '111 days', true),
  ('lab', 'healthians', 'Fatima Z.', 'Kochi', 4, 'Collector was polite, report took a few hours longer than promised.', now() - interval '140 days', true),
  ('lab', 'healthians', 'Zoya A.', 'Jaipur', 4, 'Good experience, the app reminder about fasting really helped.', now() - interval '25 days', true),
  ('lab', 'healthians', 'Arjun P.', 'Kochi', 5, 'Phlebotomist came at 7:10, painless draw, report next evening.', now() - interval '71 days', true);
