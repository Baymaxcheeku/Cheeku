-- Daily chat limit raised to 1000 (owner's call, 2026-11-17).
-- Run in the Supabase SQL editor. Matches FREE_CHAT_LIMIT = 1000 in
-- src/lib/billing/plans.ts; the two must move together (0035).
--   free_daily        20  -> 1000  chats a day on Free (the trigger and claim_model_call read it)
--   paid_model_daily  300 -> 1000  fair-use model calls a day on paid plans
-- Burst limits stay: 6 a minute, 60 an hour.
-- To go back: set free_daily 20 and paid_model_daily 300 the same way.

update app_config
set value = value || '{"free_daily": 1000, "paid_model_daily": 1000}'::jsonb
where key = 'chat_limits';

select value from app_config where key = 'chat_limits';
