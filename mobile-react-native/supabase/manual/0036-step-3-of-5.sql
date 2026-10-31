-- 0036 step 3 of 5. Run the steps in order, each in a new query. Safe to run again.
begin;

create or replace function create_lab_booking (
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
    'Collection booked with ' || v_partner.name,
    to_char(p_date, 'Dy DD Mon') || ', ' || p_window || ' for ' || v_name || '. I''ll file the results.',
    '/labs/booking/' || v_id,
    'lab:' || v_id || ':booked'
  );
  return v_id;
end;
$$ language plpgsql;

commit;
