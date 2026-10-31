-- Does this database have 0036 (notification copy)? Read only.
-- Paste into the Supabase SQL editor and Run; run any step that says NO, in order.
with checks (step, looks_for, applied) as (values
  ('0036 step 1 of 5', 'welcome says "Hi, I''m Cheeku"',
    exists (select 1 from pg_proc where proname = 'notify_profile_added' and prosrc like '%Hi, I''''m Cheeku%')),
  ('0036 step 2 of 5', 'plan ended reads the free limit from chat_limits()',
    exists (select 1 from pg_proc where proname = 'notify_plan_change' and prosrc like '%chat_limits()%')),
  ('0036 step 3 of 5', 'lab booking says "Collection booked with"',
    exists (select 1 from pg_proc where proname = 'create_lab_booking' and prosrc like '%Collection booked with%')),
  ('0036 step 4 of 5', 'lab updates say "The lab is on it"',
    exists (select 1 from pg_proc where proname = 'apply_lab_status' and prosrc like '%The lab is on it%')),
  ('0036 step 5 of 5', 'record updates say "hard to read"',
    exists (select 1 from pg_proc where proname = 'notify_document_change' and prosrc like '%hard to read%'))
)
select step, looks_for, case when applied then 'yes' else 'NO' end as applied from checks order by step;
