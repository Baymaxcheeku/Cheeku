-- 0033 step 4 of 4. Run the steps in order, each in a new query. Safe to run again.
begin;

with decided as (
  select f.id, home_decide(home_signals(f.owner_id, false), coalesce((select value from app_config where key = 'home_stage'), '{"unlock_items": 1}'::jsonb)) as d
  from families f
  where f.home_stage = 'starter'
)
update families f
set home_stage = decided.d ->> 'stage',
    home_stage_at = now(),
    today_unlocked_via = case when decided.d ->> 'stage' = 'today' then 'backfill' else null end
from decided
where f.id = decided.id and decided.d ->> 'stage' <> 'starter';

commit;
