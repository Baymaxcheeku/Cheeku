-- Daily chat limit raised to 1000 (owner's call, 2026-11-17).
-- Run in the Supabase SQL editor of project mhriweqqtokdgyemvzuq:
--   https://supabase.com/dashboard/project/mhriweqqtokdgyemvzuq/sql/new
-- Matches FREE_CHAT_LIMIT = 1000 in src/lib/billing/plans.ts; the two must
-- move together (0035).
--   free_daily        20  -> 1000  chats a day on Free
--   paid_model_daily  300 -> 1000  fair-use model calls a day on paid plans
-- Burst limits stay: 6 a minute, 60 an hour.
--
-- An upsert, not an update: if the chat_limits row was never written, an
-- update changes nothing and says so only as "UPDATE 0".
-- To go back: set free_daily 20 and paid_model_daily 300 the same way.

insert into app_config (key, value, note)
values ('chat_limits', '{"free_daily": 1000, "free_model_extra": 5, "per_minute": 6, "per_hour": 60, "paid_model_daily": 1000}'::jsonb, 'Raised to 1000 a day, 2026-11-17.')
on conflict (key) do update
set value = app_config.value || '{"free_daily": 1000, "paid_model_daily": 1000}'::jsonb,
    updated_at = now();

-- Should show free_daily 1000 and paid_model_daily 1000.
select chat_limits();
