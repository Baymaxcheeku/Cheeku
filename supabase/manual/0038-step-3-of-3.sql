-- 0038 step 3 of 3. Makes phones buzz: sends every new inbox row to the
-- push-dispatch Edge Function. Without this nothing the server writes ever
-- reaches a phone (launch tracker ops-push-webhook).
--
-- Do these first, in order:
--   1. supabase secrets set PUSH_WEBHOOK_SECRET=<a long random string>
--   2. supabase functions deploy push-dispatch --no-verify-jwt
--   3. EAS: the app needs an EAS project id and APNs/FCM credentials before a
--      phone can have a push token at all (see push.ts, registerThisDevice).
--
-- Then create the webhook in the Dashboard. This is the way that worked on
-- production (2026-10-25):
--   Integrations > Database Webhooks (enable it if asked) > Webhooks >
--   Create a new hook: table public.notifications, event Insert only, type
--   Supabase Edge Functions, push-dispatch, POST, timeout 5000, extra header
--   x-webhook-secret = the same string. Also turn off "Enforce JWT
--   verification" on the push-dispatch function.
--
-- The SQL below only works AFTER Database Webhooks has been enabled once
-- (before that, "schema supabase_functions does not exist"). Never commit a
-- filled-in copy: it contains the secret.

drop trigger if exists push_dispatch_webhook on public.notifications;

create trigger push_dispatch_webhook
after insert on public.notifications
for each row
execute function supabase_functions.http_request (
  'https://<PROJECT_REF>.supabase.co/functions/v1/push-dispatch',
  'POST',
  '{"Content-Type":"application/json","x-webhook-secret":"<PUSH_WEBHOOK_SECRET>"}',
  '{}',
  '5000'
);
