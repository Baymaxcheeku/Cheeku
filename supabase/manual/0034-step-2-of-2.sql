-- 0034 step 2 of 2. Run the steps in order, each in a new query. Safe to run again.
begin;

alter table profiles add column if not exists daily_prefs jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_daily_prefs_check') then
    alter table profiles add constraint profiles_daily_prefs_check
      check (jsonb_typeof(daily_prefs) = 'object' and pg_column_size(daily_prefs) <= 2000);
  end if;
end $$;

commit;
