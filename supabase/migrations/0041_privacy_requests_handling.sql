-- DPDP readiness, part one (sec-dpdp): someone answers privacy requests.
--
-- Since 0031 a person can open a rights request from Settings, Privacy
-- (correction, access, nomination, grievance). The row was written with a
-- 90-day due date and then sat there: nobody on our side was told, there was
-- no way to answer it, and the person never heard back. This adds:
--
--   1. The contact details in the legal texts. Our Grievance Officer is now
--      named (Athar Ali) with privacy@cheekuai.in and support@cheekuai.in.
--      New versions of the Terms, Privacy Policy and Health Data Consent,
--      published NON-material: nothing about what we collect or share
--      changed, so nobody already signed in is asked to agree again.
--   2. privacy_queue: every open request, oldest due date first, with days
--      left. For the team only (SQL editor, service role); never the app.
--   3. answer_privacy_request(): the one way to move a request on. Checks the
--      status, needs a reply before closing, stamps resolved_at.
--   4. A note in the person's inbox whenever their request moves, so the
--      answer is not only visible to someone who happens to open Settings.
--      The note never repeats what they wrote.
--
-- The email to privacy@ on every new request is the privacy-alert Edge
-- Function, fired by a Database Webhook (see that function's header).

-- --------------------------------------------- 1. the legal texts, again --

insert into legal_documents (kind, version, effective_on, material, summary, text_sha256) values
  ('terms', '2026-10-27', '2026-10-27', false,
   'These terms are the agreement between you and us for using Cheeku AI. Cheeku helps you understand and organise health information; it does not diagnose, prescribe or replace a doctor.',
   'd7d7256d59643bd576108a9db6a14be333b4f8e1f8b5190f89a8a24bcc6127a5'),
  ('privacy', '2026-10-27', '2026-10-27', false,
   'We collect what Cheeku needs to keep your family''s health records and answer your questions, and nothing for advertising. We never sell your data, and you can see, correct, export or delete it at any time.',
   '70a3cca6408c880fde138f2ea42de5a15d441655310808c52a63b9ebecfc7579'),
  ('health_consent', '2026-10-27', '2026-10-27', false,
   'This is the consent notice under India''s DPDP Act. It lists exactly what Cheeku does with your family''s health data when you tick the box, and the optional uses that stay off unless you turn them on.',
   '6a98d33bc73a80f4d00b36fd4b7bbf6957b06f194c7997a818783cc05353f032')
on conflict (kind, version) do nothing;

-- ------------------------------------------------------------ 2. columns --

alter table privacy_requests add column if not exists updated_at timestamptz not null default now();
-- Who on our side moved it last: a name or initials, never shown to the person.
alter table privacy_requests add column if not exists handled_by text check (handled_by is null or char_length(handled_by) <= 60);

create index if not exists privacy_requests_open_idx on privacy_requests (due_by) where status in ('received', 'in_progress');

-- --------------------------------------------------------------- 3. queue --

create or replace view privacy_queue
with
  (security_barrier = true) as
select
  r.id,
  r.kind,
  r.status,
  r.created_at::date as received_on,
  r.due_by,
  (r.due_by - current_date) as days_left,
  (r.due_by < current_date) as overdue,
  u.email as account_email,
  r.details,
  r.handled_by,
  r.updated_at
from privacy_requests r
left join auth.users u on u.id = r.user_id
where r.status in ('received', 'in_progress')
order by r.due_by, r.created_at;

-- Reads auth.users and holds what people wrote: the team's view only.
revoke all on privacy_queue from public, anon, authenticated;

-- ---------------------------------------------------------------- 4. answer --

-- Run from the SQL editor:
--   select answer_privacy_request('<id>', 'in_progress', null, 'Athar');
--   select answer_privacy_request('<id>', 'resolved', 'We corrected the date on your March report.', 'Athar');
create or replace function answer_privacy_request (
  p_id uuid,
  p_status text,
  p_response text default null,
  p_handled_by text default null
) returns privacy_requests
security definer
set
  search_path = public as $$
declare
  v_row privacy_requests;
  v_reply text := nullif(trim(coalesce(p_response, '')), '');
begin
  if p_status not in ('in_progress', 'resolved', 'rejected') then
    raise exception 'status must be in_progress, resolved or rejected' using errcode = 'check_violation';
  end if;
  if p_status in ('resolved', 'rejected') and v_reply is null then
    raise exception 'write the reply the person will read before closing' using errcode = 'check_violation';
  end if;
  if v_reply is not null and char_length(v_reply) > 2000 then
    raise exception 'keep the reply under 2,000 characters' using errcode = 'check_violation';
  end if;

  select * into v_row from privacy_requests where id = p_id for update;
  if not found then
    raise exception 'no such request' using errcode = 'no_data_found';
  end if;
  if v_row.status in ('resolved', 'rejected') then
    raise exception 'that request is already closed' using errcode = 'check_violation';
  end if;

  update privacy_requests
  set
    status = p_status,
    response = coalesce(v_reply, response),
    handled_by = coalesce(nullif(trim(coalesce(p_handled_by, '')), ''), handled_by),
    resolved_at = case when p_status in ('resolved', 'rejected') then now() else null end,
    updated_at = now()
  where id = p_id
  returning * into v_row;

  return v_row;
end;
$$ language plpgsql;

revoke execute on function answer_privacy_request (uuid, text, text, text) from public, anon, authenticated;

-- ----------------------------------------------------------- 5. the inbox --

-- Account category, so it follows the person's "Account and security"
-- notification setting. Words fit the inbox limits (title 40, body 90) and
-- never repeat the request itself.
create or replace function notify_privacy_request () returns trigger
security definer
set
  search_path = public as $$
declare
  v_title text;
  v_body text;
begin
  if new.status is not distinct from old.status then
    return null;
  end if;

  if new.status = 'in_progress' then
    v_title := 'We''re on your privacy request';
    v_body := 'We''ll reply by ' || to_char(new.due_by, 'FMDD Mon') || '. Follow it in Settings, Privacy.';
  elsif new.status = 'resolved' then
    v_title := 'Your privacy request is answered';
    v_body := 'Read our reply in Settings, Privacy.';
  elsif new.status = 'rejected' then
    v_title := 'We''ve closed your privacy request';
    v_body := 'Read why in Settings, Privacy. You can still reach our Grievance Officer.';
  else
    return null;
  end if;

  perform notify_user(new.user_id, null, null, 'support_update', v_title, v_body, '/settings/privacy', 'privacy:' || new.id || ':' || new.status);
  return null;
end;
$$ language plpgsql;

drop trigger if exists privacy_requests_notify_trigger on privacy_requests;

create trigger privacy_requests_notify_trigger
after update of status on privacy_requests for each row
execute function notify_privacy_request ();
