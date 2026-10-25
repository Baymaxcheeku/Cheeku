-- Migration 0040 (member locations), exercised against a local Postgres with
-- 0001-0039 applied. Applies 0040 twice, then saves, throttles, caps and
-- forgets places as different people.
-- Run from the repo root:  psql -d cheeku -f supabase/manual/local-check/0040-member-locations-scenarios.sql
--
--   L1  saves their own GPS fix with an address, a jitter is skipped, a real
--       move is saved and a stale address is dropped, Papa's home is set by search.
--   L2  cannot read or write L1's places, or save for L1's member.
--   L3  never agreed to the required uses: refused.

\set ON_ERROR_STOP 1
\i supabase/migrations/0040_member_locations.sql
\i supabase/migrations/0040_member_locations.sql
\echo --- 0040 applied twice
\set ON_ERROR_STOP 0

delete from auth.users where email like '%@loc.test';

insert into auth.users (id, email) values
 ('00000000-0000-4000-8000-0000000000e1', 'l1@loc.test'),
 ('00000000-0000-4000-8000-0000000000e2', 'l2@loc.test'),
 ('00000000-0000-4000-8000-0000000000e3', 'l3@loc.test');

insert into consent_log (user_id, consent_type, version, granted, granted_at, method)
select u.id, r.purpose, '2026-10-08', true, now(), 'signup_checkbox'
from auth.users u cross join unnest(required_purposes()) as r (purpose)
where u.email in ('l1@loc.test', 'l2@loc.test');

insert into families (id, owner_id)
select ('f0000000-0000-4000-8000-0000000000e' || n)::uuid, ('00000000-0000-4000-8000-0000000000e' || n)::uuid from generate_series(1, 3) n
on conflict do nothing;
insert into subscriptions (family_id, tier)
select ('f0000000-0000-4000-8000-0000000000e' || n)::uuid, 'family' from generate_series(1, 3) n
on conflict (family_id) do update set tier = 'family';

insert into profiles (id, user_id, family_id, name, is_primary, created_at) values
 ('a1000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000e1', 'f0000000-0000-4000-8000-0000000000e1', 'Athar', true, '2026-01-01'),
 ('a2000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000e1', 'f0000000-0000-4000-8000-0000000000e1', 'Papa', false, '2026-01-02'),
 ('a1000000-0000-4000-8000-0000000000e2', '00000000-0000-4000-8000-0000000000e2', 'f0000000-0000-4000-8000-0000000000e2', 'Kiran', true, '2026-01-01'),
 ('a1000000-0000-4000-8000-0000000000e3', '00000000-0000-4000-8000-0000000000e3', 'f0000000-0000-4000-8000-0000000000e3', 'Sam', true, '2026-01-01')
on conflict do nothing;

\echo --- geo_km: MG Road to Indiranagar is about 3.7 km
select round(geo_km(12.9756, 77.6066, 12.9784, 77.6408)::numeric, 1) as km;

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000e1', false) \g /dev/null

\echo --- L1 saves a GPS fix with an address (expect saved)
select set_member_location('a1000000-0000-4000-8000-0000000000e1', 12.971598, 77.640781, 25, 'gps',
  '{"label":"Indiranagar, Bengaluru","locality":"Indiranagar","city":"Bengaluru","district":"Bengaluru Urban","state":"Karnataka","pincode":"560 038","countryCode":"in","formatted":"100 Feet Rd, Indiranagar, Bengaluru, Karnataka 560038","provider":"ola"}');
\echo --- jitter 20 m, a minute later (expect unchanged)
select set_member_location('a1000000-0000-4000-8000-0000000000e1', 12.97175, 77.64090, 30, 'gps', '{}');
\echo --- a picked place always saves (expect saved), pincode junk dropped
select set_member_location('a1000000-0000-4000-8000-0000000000e1', 12.9352, 77.6245, null, 'search', '{"label":"Koramangala, Bengaluru","locality":"Koramangala","city":"Bengaluru","pincode":"ABC","provider":"osm"}');
\echo --- a GPS fix 30 km away with no address (expect saved, old label and pincode gone)
select set_member_location('a1000000-0000-4000-8000-0000000000e1', 13.1986, 77.7066, 40, 'gps', '{}');
\echo --- Papa lives in Lucknow, set by search (expect saved)
select set_member_location('a2000000-0000-4000-8000-0000000000e1', 26.8467, 80.9462, null, 'city', '{"label":"Lucknow","city":"Lucknow","state":"Uttar Pradesh","countryCode":"IN","provider":"none"}');
\echo --- nonsense: null island, out of range, unknown source (expect three errors)
select set_member_location('a1000000-0000-4000-8000-0000000000e1', 0, 0, null, 'gps', '{}');
select set_member_location('a1000000-0000-4000-8000-0000000000e1', 120, 77, null, 'gps', '{}');
select set_member_location('a1000000-0000-4000-8000-0000000000e1', 12.9, 77.6, null, 'satellite', '{}');
\echo --- L1 reads both rows: rounded to 4 decimals, own place moved, pincode cleaned
select p.name, m.lat, m.lng, m.label, m.city, m.pincode, m.country_code, m.source, m.provider, m.write_count
from member_locations m join profiles p on p.id = m.profile_id order by p.name;
\echo --- L1 cannot write the table directly (expect RLS error)
insert into member_locations (profile_id, user_id, lat, lng, source) values ('a1000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000e1', 1, 1, 'gps');
\echo --- L1 cannot read the cache (0 rows, RLS) or take quota (permission error)
select count(*) from geo_cache;
select geo_take_quota('00000000-0000-4000-8000-0000000000e1', 5);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000e2', false) \g /dev/null
\echo --- L2 sees none of the L1 places (expect 0)
select count(*) from member_locations;
\echo --- L2 saves for the Papa of L1 (expect unknown family member)
select set_member_location('a2000000-0000-4000-8000-0000000000e1', 12.9, 77.6, null, 'gps', '{}');
\echo --- L2 forgets everything: touches nothing of L1 (expect 0)
select forget_member_location();

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000e3', false) \g /dev/null
\echo --- L3 without consent (expect agree first)
select set_member_location('a1000000-0000-4000-8000-0000000000e3', 12.9, 77.6, null, 'gps', '{}');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000e1', false) \g /dev/null
\echo --- L1 forgets Papa (expect 1), then all (expect 1)
select forget_member_location('a2000000-0000-4000-8000-0000000000e1');
select forget_member_location();
reset role;

\echo --- the daily cap: 200 writes, then limit
update member_locations set write_count = 200 where false;
insert into member_locations (profile_id, user_id, lat, lng, source, write_day, write_count)
values ('a1000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000e1', 12.9, 77.6, 'search', current_date, 200);
set role authenticated;
select set_member_location('a1000000-0000-4000-8000-0000000000e1', 13.5, 77.9, null, 'search', '{}');
reset role;

\echo --- quota as the service role: 3 calls under a cap of 2 (expect t, t, f)
select geo_take_quota('00000000-0000-4000-8000-0000000000e2', 2), geo_take_quota('00000000-0000-4000-8000-0000000000e2', 2), geo_take_quota('00000000-0000-4000-8000-0000000000e2', 2);

\echo --- account deletion cascades (expect 0 rows left for L1)
delete from auth.users where email = 'l1@loc.test';
select count(*) from member_locations where user_id = '00000000-0000-4000-8000-0000000000e1';
delete from auth.users where email like '%@loc.test';
