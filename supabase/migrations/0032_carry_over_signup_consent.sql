-- Baymax data model, part 32: carry over the sign-up consent of existing users.
--
-- WHY. Before 0031 the app's sign-up made people tick a box ("I agree that
-- Cheeku AI may store and process my family's health records to give me
-- insights. I can export or delete everything, any time.", consent version
-- 1.1.0) and then never saved the tick. 0031 therefore saw those people as
-- never having agreed: the write guard refused their uploads and chats, and
-- every optional switch in Privacy refused to move.
--
-- WHAT THIS DOES. For every account with no decision at all on the required
-- purposes, it appends one granted row per required purpose, dated when the
-- account was created (which is when the box was ticked), with method
-- 'carried_over' and the old box's exact wording as the fingerprint. Nothing
-- existing is changed or removed.
--
-- WHAT IT DOES NOT DO. It does not count the old box as agreement to the
-- current documents. The versions recorded are the old agreement's, so
-- my_consent_state() reports these people as 'updated' and the app shows a
-- one-tap "we've updated our terms" notice once. The write guard only checks
-- the required purposes are granted, so their records keep working in the
-- meantime. Optional uses are never carried over: they stay off until the
-- person switches them on.
--
-- Idempotent: a second run finds every carried-over account already has rows.

-- ----------------------------------------------------- 1. allow the method --

alter table consent_log drop constraint if exists consent_log_method_check;

-- NOT VALID, as in 0031: checked on every new row, old rows left as written.
alter table consent_log add constraint consent_log_method_check check (
  method is null
  or method in ('signup_checkbox', 'reconsent_sheet', 'privacy_settings', 'withdrawal', 'carried_over')
) not valid;

-- ------------------------------------------------------- 2. carry it over --

insert into consent_log (
  user_id, consent_type, version, granted, granted_at,
  method, bundle_id, document_versions, text_fingerprint
)
select
  u.id,
  r.purpose,
  '1.1.0',
  true,
  u.created_at,
  'carried_over',
  b.bundle_id,
  '{"signup_agreement": "1.1.0"}'::jsonb,
  'signup checkbox 1.1.0: I agree that Cheeku AI may store and process my family''s health records to give me insights. I can export or delete everything, any time.'
from auth.users u
cross join lateral (select gen_random_uuid() as bundle_id) b
cross join unnest(required_purposes()) as r (purpose)
where not exists (
  select 1
  from consent_log c
  where c.user_id = u.id and c.consent_type = any (required_purposes())
);
