-- Is 0042 (prescription scorecards) in place? Read only. Paste into the
-- Supabase SQL editor and Run. Every row should say yes.
with checks (looks_for, applied) as (values
  ('the scorecards table exists, with row-level security on',
    exists (select 1 from pg_class where relname = 'rx_scorecards' and relrowsecurity)),
  ('people read, write, refresh and delete only their own cards',
    (select count(*) from pg_policies where tablename = 'rx_scorecards') = 4),
  ('a card can only be written for the owner''s own prescription',
    exists (select 1 from pg_policies where tablename = 'rx_scorecards' and cmd = 'INSERT' and with_check like '%doc_type = ''prescription''%')),
  ('editing a prescription clears its card',
    exists (select 1 from pg_trigger where tgname = 'rx_scorecards_forget_trigger' and not tgisinternal)),
  ('the app can use the table',
    has_table_privilege('authenticated', 'public.rx_scorecards', 'select, insert, update, delete'))
)
select looks_for, case when applied then 'yes' else 'NO' end as applied from checks;
