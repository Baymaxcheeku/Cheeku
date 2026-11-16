-- Review and demo: no practical pace limit (owner's call, 2026-11-17).
-- Run in the Supabase SQL editor of project mhriweqqtokdgyemvzuq:
--   https://supabase.com/dashboard/project/mhriweqqtokdgyemvzuq/sql/new
--   per_minute  6  -> 1000
--   per_hour    60 -> 10000
-- The daily limit stays at 1000 a day per account (chat-limits-1000.sql).
-- Every call is still metered and recorded in model_calls; only the ceilings move.
--
-- BEFORE LAUNCH put the pace limits back (the burst limits are what stop one
-- account from running up the Gemini bill):
--   update app_config set value = value || '{"per_minute": 6, "per_hour": 60}'::jsonb, updated_at = now() where key = 'chat_limits';

insert into app_config (key, value, note)
values ('chat_limits', '{"free_daily": 1000, "free_model_extra": 5, "per_minute": 1000, "per_hour": 10000, "paid_model_daily": 1000}'::jsonb, 'Demo limits, 2026-11-17. Restore per_minute 6, per_hour 60 before launch.')
on conflict (key) do update
set value = app_config.value || '{"per_minute": 1000, "per_hour": 10000}'::jsonb,
    note = 'Demo limits, 2026-11-17. Restore per_minute 6, per_hour 60 before launch.',
    updated_at = now();

-- Should show per_minute 1000 and per_hour 10000.
select chat_limits();
