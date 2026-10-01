-- 0028 step 6 of 6. Run the steps in order, each in a new query. Safe to run again.
begin;

revoke execute on function file_consultation_invoice (uuid, text, text, text, text, date, text, int, text) from public, anon;
grant execute on function file_consultation_invoice (uuid, text, text, text, text, date, text, int, text) to authenticated;
create or replace function update_consultation_invoice (p_doc uuid, p_action text, p_day date default null, p_slot text default null) returns boolean
security definer
set
  search_path = public as $$
declare
  d documents;
begin
  select * into d from documents
  where id = p_doc and user_id = auth.uid() and doc_type = 'consultation_invoice'
  for update;
  if not found then
    return false;
  end if;

  if p_action = 'cancel' then
    perform set_invoice_detail(p_doc, 'status', to_jsonb(
      case when d.extraction -> 'details' ->> 'status' = 'paid' then 'refunded' else 'cancelled' end
    ));
  elsif p_action = 'reschedule' and p_day is not null then
    perform set_invoice_detail(p_doc, 'appointment', jsonb_build_object('day', p_day, 'slot', left(coalesce(p_slot, ''), 40)));
    update documents set event_date = p_day where id = p_doc;
  else
    return false;
  end if;
  return true;
end;
$$ language plpgsql;
revoke execute on function update_consultation_invoice (uuid, text, date, text) from public, anon;
grant execute on function update_consultation_invoice (uuid, text, date, text) to authenticated;
create or replace function move_document (p_doc uuid, p_profile uuid) returns boolean
security definer
set
  search_path = public as $$
declare
  v_user uuid := auth.uid();
  d documents;
begin
  select * into d from documents where id = p_doc and user_id = v_user for update;
  if not found then
    return false;
  end if;
  if d.profile_id = p_profile then
    return true;
  end if;
  if not exists (select 1 from profiles where id = p_profile and user_id = v_user)
     or p_profile not in (select covered_profile_ids(v_user)) then
    raise exception 'profile % is not covered by the current plan', p_profile using errcode = 'check_violation';
  end if;

  update documents set profile_id = p_profile where id = p_doc;
  update entities set profile_id = p_profile where document_id = p_doc;
  update timeline_events set profile_id = p_profile where source_document_id = p_doc;
  update notifications set profile_id = p_profile where document_id = p_doc and user_id = v_user;
  return true;
end;
$$ language plpgsql;
revoke execute on function move_document (uuid, uuid) from public, anon;
grant execute on function move_document (uuid, uuid) to authenticated;

insert into schema_migrations (filename) values ('0028_record_types.sql') on conflict do nothing;

commit;
