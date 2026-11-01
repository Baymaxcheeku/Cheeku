-- 0038 step 2 of 3. Runs the family-care sweep every 15 minutes.
-- First: Supabase Dashboard > Database > Extensions > enable pg_cron.
-- Then paste this into the SQL editor and Run. Safe to run again (it replaces
-- the job rather than adding a second one).
--
-- To check it ran:  select * from cron.job_run_details order by start_time desc limit 5;
-- To stop it:       select cron.unschedule('care-sweep');

-- ----------------------------------------------------------------- 5. cron --
-- Every 15 minutes. Skipped where pg_cron is not installed (a local Postgres);
-- on Supabase, enable it under Database > Extensions first if this says so.

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    if exists (select 1 from cron.job where jobname = 'care-sweep') then
      perform cron.unschedule('care-sweep');
    end if;
    perform cron.schedule('care-sweep', '*/15 * * * *', 'select public.run_care_sweep()');
  else
    raise notice 'pg_cron is not available here: run_care_sweep() is installed but not scheduled';
  end if;
end $$;
