-- 0036 step 1 of 5. Run the steps in order, each in a new query. Safe to run again.
begin;

create or replace function notify_flagged_entity () returns trigger
security definer
set
  search_path = public as $$
declare
  v_doc documents;
begin
  if new.document_id is null or coalesce(new.flag, 'normal') not in ('high', 'low') then
    return null;
  end if;

  select * into v_doc from documents where id = new.document_id;
  if not found then
    return null;
  end if;

  perform notify_user(
    new.user_id, new.profile_id, new.document_id, 'report_flagged',
    'A few values in ' || document_display_title(v_doc) || ' are outside range',
    'Worth a word with your doctor. I can help you prep your questions.',
    '/records/' || new.document_id,
    'flag:' || new.document_id,
    jsonb_build_object('tone', 'attention')
  );
  return null;
end;
$$ language plpgsql;

create or replace function notify_profile_added () returns trigger
security definer
set
  search_path = public as $$
begin
  if new.is_primary then
    perform notify_user(
      new.user_id, new.id, null, 'welcome',
      'Hi, I''m Cheeku 👋',
      'Send me any report, prescription or bill. I''ll read it, file it and remember it.',
      '/scan',
      'welcome'
    );
  else
    perform notify_user(
      new.user_id, new.id, null, 'family_added',
      new.name || ' joined the family 🎉',
      'Add their first report and I''ll start remembering for them too.',
      '/scan',
      'family:' || new.id
    );
  end if;
  return null;
end;
$$ language plpgsql;

create or replace function notify_ticket_closed () returns trigger
security definer
set
  search_path = public as $$
begin
  if new.status = 'closed' and old.status is distinct from 'closed' then
    perform notify_user(
      new.user_id, null, null, 'support_update',
      'We''ve closed your request',
      '"' || left(new.subject, 60) || '". Still stuck? Write to us from Help.',
      '/settings/help',
      'ticket:' || new.id
    );
  end if;
  return null;
end;
$$ language plpgsql;

create or replace function announce_service_launch (p_service text, p_label text, p_route text) returns integer
security definer
set
  search_path = public as $$
declare
  v_count integer;
begin
  insert into notifications (user_id, kind, title, body, route, dedupe_key, data)
  select
    w.user_id,
    'service_live',
    left(p_label || ' is live 🎉', 120),
    'You asked to hear first. Book in two taps.',
    p_route,
    'live:' || p_service,
    jsonb_build_object('service', p_service)
  from service_waitlist w
  where w.service_id = p_service
  on conflict (user_id, dedupe_key) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$ language plpgsql;

commit;
