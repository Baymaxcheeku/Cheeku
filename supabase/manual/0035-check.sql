-- Does this database have 0035 (chat metering, 20 free chats a day)? Read only.
-- Paste into the Supabase SQL editor and Run; run any step that says NO, in order.
with checks (step, looks_for, applied) as (values
  ('0035 step 1 of 3', 'chat_limits config row and model_calls table',
    exists (select 1 from app_config where key = 'chat_limits')
    and to_regclass('public.model_calls') is not null),
  ('0035 step 2 of 3', 'claim_model_call()',
    exists (select 1 from pg_proc where proname = 'claim_model_call')),
  ('0035 step 3 of 3', 'chat allowance reads the limit from chat_limits (20)',
    exists (select 1 from pg_proc where proname = 'enforce_chat_quota' and prosrc like '%chat_limits()%'))
)
select step, looks_for, case when applied then 'yes' else 'NO' end as applied
from checks
order by step;
