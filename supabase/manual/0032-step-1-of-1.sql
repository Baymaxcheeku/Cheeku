-- 0032 step 1 of 1. Run the steps in order, each in a new query. Safe to run again.
begin;

alter table consent_log drop constraint if exists consent_log_method_check;

alter table consent_log add constraint consent_log_method_check check (
  method is null
  or method in ('signup_checkbox', 'reconsent_sheet', 'privacy_settings', 'withdrawal', 'carried_over')
) not valid;

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

commit;
