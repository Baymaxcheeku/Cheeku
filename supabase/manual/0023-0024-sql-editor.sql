-- ONE-OFF COPY for pasting into the Supabase SQL Editor, for anyone applying
-- migrations without a terminal. It is 0023 + 0024 verbatim, plus the ledger
-- rows `npm run db:migrate` would have written. The files in
-- supabase/migrations are the source of truth; do not edit this one.
--
-- Cheeku AI: notifications update, for the Supabase SQL Editor.
-- Paste this whole file into SQL Editor and press Run. It does two things:
--   1. 0023: renames "Baymax" to "Cheeku" in the stored articles (safe to repeat)
--   2. 0024: adds the notifications inbox, triggers, waitlist and push devices
-- It all runs as one transaction: if anything fails, nothing is changed.
-- If you see "relation notifications already exists", it was already applied
-- and there is nothing more to do.

begin;

create table if not exists schema_migrations (
  filename text primary key,
  applied_at timestamptz not null default now()
);
-- Deny-all through the API, as migration 0007 set it. The SQL Editor runs as
-- the owner, so the inserts below still work.
alter table schema_migrations enable row level security;

-- ================================================ 0023_rename_to_cheeku.sql
-- The product is now Cheeku AI, and the companion inside it is Cheeku.
--
-- Migrations 0017 and 0021 seeded article bodies that name the companion
-- "Baymax". Those files have already run against live databases and are left
-- exactly as they were; this rewrites the stored copy instead. Only the
-- article body and standfirst carry the name, and a plain text swap on the
-- JSON is safe because "Baymax" never appears as a key, only inside values.

update articles
set body = replace(body::text, 'Baymax', 'Cheeku')::jsonb
where body::text like '%Baymax%';

update articles
set standfirst = replace(standfirst, 'Baymax', 'Cheeku')
where standfirst like '%Baymax%';

update articles
set title = replace(title, 'Baymax', 'Cheeku')
where title like '%Baymax%';

insert into schema_migrations (filename) values ('0023_rename_to_cheeku.sql') on conflict do nothing;

-- ================================================== 0024_notifications.sql
-- Notifications: one inbox, written by the database, read by the app.
--
-- Before this, the bell on Home derived its rows on the device from records
-- that happened to be flagged. That could never say "your report is filed",
-- "Amma was added", "your plan changed" or "that service you asked about is
-- live", because none of those are visible in a list of documents. So the
-- events now write rows here, at the moment they happen, from triggers on the
-- tables that own them.
--
-- THREE RULES THIS FILE KEEPS
--
-- 1. The inbox is a record, the phone buzz is a choice. Every event lands in
--    the inbox regardless of preferences. `families.notification_prefs` only
--    decides what may interrupt someone as a push (see the push-dispatch Edge
--    Function). An inbox that silently drops things because a switch was off
--    is an inbox nobody can trust.
--
-- 2. Rows name the family member they are about (`profile_id`), and the app
--    switches to that member before opening the row, so one person's report is
--    never shown in another's context (PLAN.md rule 4).
--
-- 3. No health values in any row. A title may name a report ("Lipid profile")
--    because the records list already does; it never carries a number, a flag
--    or a condition. Push text is more careful still and is generic per
--    category, so nothing sensitive shows on a locked screen.
--
-- Everything here hangs off auth.users and is cascaded, and the app's delete
-- path removes it explicitly as well, the same as support tickets.

-- ------------------------------------------------------------ notifications --

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Which family member this is about, when it is about one.
  profile_id uuid references profiles (id) on delete cascade,
  -- Deleting a record deletes the rows that point at it, so no row can ever
  -- open onto a document that no longer exists.
  document_id uuid references documents (id) on delete cascade,
  kind text not null check (
    kind in (
      'report_ready',
      'report_review',
      'report_flagged',
      'appointment_booked',
      'appointment_rescheduled',
      'appointment_cancelled',
      'family_added',
      'plan_changed',
      'plan_ended',
      'password_changed',
      'support_update',
      'service_live',
      'welcome'
    )
  ),
  -- Derived, never written: a client cannot file a row under the wrong shelf.
  category text generated always as (
    case
      when kind like 'report\_%' then 'reports'
      when kind like 'appointment\_%' then 'appointments'
      when kind = 'family_added' then 'family'
      when kind in ('plan_changed', 'plan_ended', 'password_changed', 'support_update') then 'account'
      else 'updates'
    end
  ) stored,
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) <= 400),
  -- An in-app path only. Never a URL, never a query string with content in it.
  route text check (
    route is null
    or route ~ '^/[A-Za-z0-9/_-]*$'
  ),
  -- Makes every writer idempotent: the same event twice is one row.
  dedupe_key text check (
    dedupe_key is null
    or char_length(dedupe_key) <= 120
  ),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  dismissed_at timestamptz
);

-- Not partial: the app's upsert names these columns as its conflict target,
-- and PostgREST cannot express a partial index's predicate. Rows without a key
-- never collide anyway, because nulls are distinct in a unique index.
create unique index notifications_dedupe_idx on notifications (user_id, dedupe_key);

create index notifications_inbox_idx on notifications (user_id, created_at desc)
where
  dismissed_at is null;

alter table notifications enable row level security;

create policy "users read own notifications" on notifications for select using (auth.uid() = user_id);

-- The app writes only the events that live on the device: appointments (kept in
-- the phone's secure storage by design) and a password change it just made.
-- Everything about records, family, plans and support is written by triggers
-- below, so a client cannot invent "your report is filed".
create policy "users write own device events" on notifications for insert
with
  check (
    auth.uid() = user_id
    and kind in (
      'appointment_booked',
      'appointment_rescheduled',
      'appointment_cancelled',
      'password_changed'
    )
    and document_id is null
    and (
      profile_id is null
      or exists (
        select
          1
        from
          profiles p
        where
          p.id = notifications.profile_id
          and p.user_id = auth.uid ()
      )
    )
  );

create policy "users update own notifications" on notifications
for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users delete own notifications" on notifications for delete using (auth.uid() = user_id);

-- Reading and dismissing are the only edits. Without this a client could
-- rewrite a trigger's title into anything it liked.
revoke update on notifications from anon, authenticated;
grant update (read_at, dismissed_at) on notifications to authenticated;

-- ------------------------------------------------------------- the writer --
-- Internal. Every trigger goes through here so truncation and idempotency live
-- in one place. Not callable from the app.

create function notify_user (
  p_user uuid,
  p_profile uuid,
  p_document uuid,
  p_kind text,
  p_title text,
  p_body text,
  p_route text,
  p_dedupe text,
  p_data jsonb default '{}'::jsonb
) returns void
security definer
set
  search_path = public as $$
begin
  insert into notifications (user_id, profile_id, document_id, kind, title, body, route, dedupe_key, data)
  values (
    p_user,
    p_profile,
    p_document,
    p_kind,
    left(p_title, 120),
    left(p_body, 400),
    p_route,
    p_dedupe,
    coalesce(p_data, '{}'::jsonb)
  )
  on conflict (user_id, dedupe_key) do nothing;
end;
$$ language plpgsql;

revoke execute on function notify_user (uuid, uuid, uuid, text, text, text, text, text, jsonb) from public, anon, authenticated;

-- What a document is called, the same way the app titles it: the extracted
-- title, else the type.
create function document_display_title (p_doc documents) returns text
set
  search_path = public as $$
  select coalesce(
    nullif(trim(p_doc.extraction ->> 'title'), ''),
    case p_doc.doc_type
      when 'lab_report' then 'Lab report'
      when 'prescription' then 'Prescription'
      when 'discharge' then 'Discharge summary'
      when 'scan' then 'Scan'
      when 'bill' then 'Bill'
      when 'vaccination' then 'Vaccination record'
      else 'Document'
    end
  );
$$ language sql stable;

-- "your health file" for the account holder, "Amma's health file" for anyone
-- else. The account holder reading their own name back reads like a form.
create function whose_file (p_profile uuid) returns text
set
  search_path = public as $$
  select case when p.is_primary then 'your' else p.name || '''s' end
  from profiles p where p.id = p_profile;
$$ language sql stable;

-- ------------------------------------------------------------- documents --

create function notify_document_change () returns trigger
security definer
set
  search_path = public as $$
declare
  v_title text := document_display_title(new);
  v_whose text := coalesce(whose_file(new.profile_id), 'your');
begin
  if new.status = 'needs_review'
     and (tg_op = 'INSERT' or old.status is distinct from 'needs_review') then
    perform notify_user(
      new.user_id, new.profile_id, new.id, 'report_review',
      'Quick check on ' || v_title,
      'A few lines weren''t clear enough for me to be sure. Have a look and confirm, it takes a minute.',
      '/records/' || new.id,
      'review:' || new.id
    );
  elsif new.status = 'filed' then
    if tg_op = 'INSERT' or old.status = 'processing' then
      perform notify_user(
        new.user_id, new.profile_id, new.id, 'report_ready',
        v_title || ' is filed',
        'It''s in ' || v_whose || ' health file now. Ask me anything about it.',
        '/records/' || new.id,
        'ready:' || new.id
      );
    end if;

    -- Confirmed by the reader: the "quick check" is done, so it stops counting
    -- as unread. No new row, because they did it themselves.
    if tg_op = 'UPDATE' and old.status = 'needs_review' then
      update notifications
      set read_at = coalesce(read_at, now())
      where user_id = new.user_id and dedupe_key = 'review:' || new.id;
    end if;
  end if;

  return null;
end;
$$ language plpgsql;

create trigger documents_notify_trigger
after insert or update of status on documents for each row
execute function notify_document_change ();

-- ------------------------------------------------------------- entities --
-- One row per document however many values are out of range, by dedupe key.
-- Says where to look and who to ask; never what it might mean.

create function notify_flagged_entity () returns trigger
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
    'Some values in ' || document_display_title(v_doc) || ' need a look',
    'They''re outside the range the lab printed. Worth showing your doctor, and I can help you get your questions ready.',
    '/records/' || new.document_id,
    'flag:' || new.document_id,
    jsonb_build_object('tone', 'attention')
  );
  return null;
end;
$$ language plpgsql;

create trigger entities_notify_trigger
after insert on entities for each row
execute function notify_flagged_entity ();

-- ------------------------------------------------------------- profiles --

create function notify_profile_added () returns trigger
security definer
set
  search_path = public as $$
begin
  if new.is_primary then
    perform notify_user(
      new.user_id, new.id, null, 'welcome',
      'Welcome to Cheeku AI',
      'Snap any report, prescription or bill and I''ll read it, file it and remember it for you.',
      '/scan',
      'welcome'
    );
  else
    perform notify_user(
      new.user_id, new.id, null, 'family_added',
      new.name || ' is in the family now',
      'Their health file is ready. Add a first report and I''ll start remembering for them too.',
      '/scan',
      'family:' || new.id
    );
  end if;
  return null;
end;
$$ language plpgsql;

create trigger profiles_notify_trigger
after insert on profiles for each row
execute function notify_profile_added ();

-- ---------------------------------------------------------- subscriptions --

create function notify_plan_change () returns trigger
security definer
set
  search_path = public as $$
declare
  v_owner uuid;
begin
  if tg_op = 'UPDATE' and new.tier is not distinct from old.tier then
    return null;
  end if;

  select owner_id into v_owner from families where id = new.family_id;
  if v_owner is null then
    return null;
  end if;

  if new.tier = 'free' then
    -- A brand-new free row is not news; only a paid plan ending is.
    if tg_op = 'UPDATE' then
      perform notify_user(
        v_owner, null, null, 'plan_ended',
        'You''re back on the Free plan',
        'Your records stay exactly where they are. Upgrade any time from Profile.',
        '/settings/subscription',
        null
      );
    end if;
  else
    perform notify_user(
      v_owner, null, null, 'plan_changed',
      case new.tier
        when 'family' then 'Family plan is on'
        when 'solo' then 'Solo plan is on'
        else 'Your Daily pass is on'
      end,
      case new.tier
        when 'family' then 'Up to 4 people and unlimited chats. Add your family from Profile.'
        when 'solo' then 'Unlimited chats with Cheeku, just for you.'
        else 'Unlimited chats for the next 24 hours. Make them count.'
      end,
      '/settings/subscription',
      null,
      jsonb_build_object('tier', new.tier)
    );
  end if;
  return null;
end;
$$ language plpgsql;

create trigger subscriptions_notify_trigger
after insert or update of tier on subscriptions for each row
execute function notify_plan_change ();

-- -------------------------------------------------------- support tickets --

create function notify_ticket_closed () returns trigger
security definer
set
  search_path = public as $$
begin
  if new.status = 'closed' and old.status is distinct from 'closed' then
    perform notify_user(
      new.user_id, null, null, 'support_update',
      'We''ve closed your support request',
      '"' || left(new.subject, 80) || '". Still stuck? Write to us again from Help and we''ll pick it up.',
      '/settings/help',
      'ticket:' || new.id
    );
  end if;
  return null;
end;
$$ language plpgsql;

create trigger support_tickets_notify_trigger
after update of status on support_tickets for each row
execute function notify_ticket_closed ();

-- --------------------------------------------------------- the waitlist --
-- "Notify me" on a service that is not live yet. Was device-only storage, so a
-- tap on one phone meant nothing and nobody could ever actually be told.

create table service_waitlist (
  user_id uuid not null references auth.users (id) on delete cascade,
  service_id text not null check (service_id ~ '^[a-z0-9-]{1,40}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, service_id)
);

alter table service_waitlist enable row level security;

create policy "users read own waitlist" on service_waitlist for select using (auth.uid() = user_id);

create policy "users join waitlist" on service_waitlist for insert
with
  check (auth.uid() = user_id);

create policy "users leave waitlist" on service_waitlist for delete using (auth.uid() = user_id);

-- Run by the team from the SQL editor on launch day, never by the app:
--   select announce_service_launch('diet', 'Dietitian consults', '/book/consult');
-- Tells everyone who asked, once each, and empties nobody's list (a second run
-- is a no-op thanks to the dedupe key).
create function announce_service_launch (p_service text, p_label text, p_route text) returns integer
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
    left(p_label || ' is live on Cheeku', 120),
    'You asked us to tell you first. Book in a couple of taps.',
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

revoke execute on function announce_service_launch (text, text, text) from public, anon, authenticated;

-- ------------------------------------------------------------ push devices --
-- Expo push tokens, one row per phone. Registered through a function because a
-- phone can change hands between accounts (sign out, sign in as someone else),
-- and the second account's insert would otherwise collide with a row RLS will
-- not let it see.

create table push_devices (
  token text primary key check (char_length(token) between 10 and 200),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index push_devices_user_idx on push_devices (user_id);

alter table push_devices enable row level security;

create policy "users read own devices" on push_devices for select using (auth.uid() = user_id);

create policy "users remove own devices" on push_devices for delete using (auth.uid() = user_id);

create function register_push_device (p_token text, p_platform text) returns void
security definer
set
  search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = 'insufficient_privilege';
  end if;

  insert into push_devices (token, user_id, platform)
  values (p_token, auth.uid(), p_platform)
  on conflict (token) do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        last_seen_at = now();
end;
$$ language plpgsql;

revoke execute on function register_push_device (text, text) from public, anon;
grant execute on function register_push_device (text, text) to authenticated;

-- ---------------------------------------------------------------- realtime --
-- So a row written by a trigger reaches an open app within a second or two,
-- instead of on the next pull to refresh. RLS still applies to what streams.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table notifications;
  end if;
end;
$$;

-- ---------------------------------------------------------------- backfill --
-- The events that already happened and still matter: records waiting for a
-- check, and records with values out of range. Recent ones arrive unread, older
-- ones already read, so nobody opens the app to forty old alerts at once.
-- Written directly rather than through notify_user so created_at can be the
-- document's own date.

insert into notifications (user_id, profile_id, document_id, kind, title, body, route, dedupe_key, created_at, read_at)
select
  d.user_id,
  d.profile_id,
  d.id,
  'report_review',
  left('Quick check on ' || document_display_title(d), 120),
  'A few lines weren''t clear enough for me to be sure. Have a look and confirm, it takes a minute.',
  '/records/' || d.id,
  'review:' || d.id,
  d.created_at,
  case when d.created_at > now() - interval '30 days' then null else now() end
from documents d
where d.status = 'needs_review'
on conflict (user_id, dedupe_key) do nothing;

insert into notifications (user_id, profile_id, document_id, kind, title, body, route, dedupe_key, data, created_at, read_at)
select
  d.user_id,
  d.profile_id,
  d.id,
  'report_flagged',
  left('Some values in ' || document_display_title(d) || ' need a look', 120),
  'They''re outside the range the lab printed. Worth showing your doctor, and I can help you get your questions ready.',
  '/records/' || d.id,
  'flag:' || d.id,
  jsonb_build_object('tone', 'attention'),
  d.created_at,
  case when d.created_at > now() - interval '30 days' then null else now() end
from documents d
where exists (
  select 1 from entities e where e.document_id = d.id and e.flag in ('high', 'low')
)
on conflict (user_id, dedupe_key) do nothing;

insert into schema_migrations (filename) values ('0024_notifications.sql') on conflict do nothing;

commit;
