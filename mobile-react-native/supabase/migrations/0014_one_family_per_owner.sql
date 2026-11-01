-- One family per account, enforced.
--
-- THE BUG. Onboarding's profile step inserts a `families` row unconditionally,
-- in both the web build (`lib/auth/actions.ts`) and the mobile one
-- (`app/profile.tsx`). Running onboarding twice therefore creates a second
-- family for the same owner, and nothing in the schema said no.
--
-- WHY IT MATTERED, which is more than untidiness. Every entitlement read
-- resolves the family by owner and takes one row:
--
--   * `getEntitlement` uses PostgREST `.maybeSingle()`, which ERRORS on more
--     than one row. The catch falls through to the free entitlement, so a
--     paying account silently displayed "Free Plan" and a 5-chat allowance.
--     That is what surfaced this.
--   * `effective_tier`, `consume_chat` and `ownFamily` use `limit 1` with no
--     ordering, so which family answers is arbitrary. The subscription can sit
--     on the row that is not picked, and the profiles on the row that is.
--
-- So an account could be charged for Family and read as free, and its seat
-- count could be derived from a family holding none of its people.
--
-- THIS MIGRATION MERGES RATHER THAN DELETES. No profile and no document is
-- removed. Duplicate `families` rows are emptied and then dropped; a family row
-- carries nothing but an owner and a grouping, so once its profiles and its
-- subscription have moved there is nothing in it to lose.

-- ------------------------------------------------------------ the survivor --
-- The OLDEST family wins. It is the one created by the first onboarding run,
-- so it is the one the original profile and its documents already point at,
-- and keeping it means the fewest rows move.
create temporary table family_merge on commit drop as
select
  f.id as duplicate_id,
  first_value(f.id) over (
    partition by f.owner_id order by f.created_at, f.id
  ) as survivor_id,
  f.owner_id
from families f
where f.owner_id in (select owner_id from families group by owner_id having count(*) > 1);

-- --------------------------------------------------------- the subscription --
/*
 * Keep the survivor's subscription if it has one; otherwise move the most
 * recently created subscription from the duplicates onto it.
 *
 * Most-recent rather than highest-tier, because the newest row is the last
 * thing the account actually did. Choosing "the best tier we can find" would
 * quietly restore a plan somebody had already moved off, which is a worse
 * error than the one being fixed: it hands out entitlement nobody asked for.
 */
with moved as (
  select distinct on (m.survivor_id) s.id, m.survivor_id
  from family_merge m
  join subscriptions s on s.family_id = m.duplicate_id
  where m.duplicate_id <> m.survivor_id
    and not exists (select 1 from subscriptions x where x.family_id = m.survivor_id)
  order by m.survivor_id, s.created_at desc
)
update subscriptions s
set family_id = moved.survivor_id
from moved
where s.id = moved.id;

-- Any subscription still attached to a duplicate is now redundant.
delete from subscriptions s
using family_merge m
where s.family_id = m.duplicate_id and m.duplicate_id <> m.survivor_id;

-- -------------------------------------------------------------- the profiles --
/*
 * DEMOTE BEFORE MOVING, not after.
 *
 * A family may hold only one primary profile — `profiles_one_primary_per_family_idx`
 * from migration 0001 — and each duplicate family will have had one. That index
 * is not deferrable, so it is checked as the UPDATE runs: moving both primaries
 * into the survivor raises 23505 before any later statement gets the chance to
 * fix it. Demoting first means only one primary ever arrives.
 *
 * The EARLIEST primary per OWNER stays primary. The rest are demoted, never
 * deleted: these are duplicate identities, the app cannot know which one a
 * person considers themselves, and a demoted profile keeps every document
 * filed against it. It sorts after the primary in `familyProfiles`, so on a
 * one-seat plan it shows as a padlock rather than vanishing.
 */
update profiles p
set is_primary = false
where p.is_primary
  and p.user_id in (select owner_id from family_merge)
  and p.id <> (
    select p2.id from profiles p2
    where p2.user_id = p.user_id and p2.is_primary
    order by p2.created_at, p2.id
    limit 1
  );

update profiles p
set family_id = m.survivor_id
from family_merge m
where p.family_id = m.duplicate_id and m.duplicate_id <> m.survivor_id;

-- ------------------------------------------------------------ the leftovers --
delete from families f
using family_merge m
where f.id = m.duplicate_id and m.duplicate_id <> m.survivor_id;

-- ------------------------------------------------------------ the guarantee --
-- The reason this cannot happen again, and the reason the client fix alone is
-- not enough: a check that lives only in onboarding is a check that a second
-- code path does not have.
create unique index families_one_per_owner_idx on families (owner_id);

comment on index families_one_per_owner_idx is 'One family per account. Entitlement reads resolve the family by owner and take one row, so a second family makes the answer arbitrary.';
