-- Migration 0039 (fitness sessions), exercised against a local Postgres with
-- 0001-0038 applied. Applies 0039 twice, then books and cancels as different
-- people and checks prices, guards and the inbox.
-- Run from the repo root:  psql -d cheeku -f supabase/manual/local-check/0039-fitness-scenarios.sql
--
--   F1  Family plan: books for themselves and for Papa, then cancels one.
--   F2  Free plan: can book for themselves, not for a paused member.
--   F3  never agreed to the required uses: refused.

\set ON_ERROR_STOP 1
\i supabase/migrations/0039_fitness.sql
\i supabase/migrations/0039_fitness.sql
\echo --- 0039 applied twice
\set ON_ERROR_STOP 0

insert into auth.users (id, email) values
 ('00000000-0000-4000-8000-0000000000f1', 'f1@fit.test'),
 ('00000000-0000-4000-8000-0000000000f2', 'f2@fit.test'),
 ('00000000-0000-4000-8000-0000000000f3', 'f3@fit.test');

insert into consent_log (user_id, consent_type, version, granted, granted_at, method)
select u.id, r.purpose, '2026-10-08', true, now(), 'signup_checkbox'
from auth.users u cross join unnest(required_purposes()) as r (purpose)
where u.email in ('f1@fit.test', 'f2@fit.test');

insert into families (id, owner_id)
select ('f0000000-0000-4000-8000-0000000000f' || n)::uuid, ('00000000-0000-4000-8000-0000000000f' || n)::uuid from generate_series(1, 3) n;
insert into subscriptions (family_id, tier)
select ('f0000000-0000-4000-8000-0000000000f' || n)::uuid, 'family' from generate_series(1, 3) n
on conflict (family_id) do update set tier = 'family';

insert into profiles (id, user_id, family_id, name, is_primary, created_at) values
 ('a1000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000f1', 'f0000000-0000-4000-8000-0000000000f1', 'Athar', true, '2026-01-01'),
 ('a2000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000f1', 'f0000000-0000-4000-8000-0000000000f1', 'Papa Ji', false, '2026-01-02'),
 ('a1000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-0000000000f2', 'f0000000-0000-4000-8000-0000000000f2', 'Kiran', true, '2026-01-01'),
 ('a2000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-0000000000f2', 'f0000000-0000-4000-8000-0000000000f2', 'Nani', false, '2026-01-02'),
 ('a1000000-0000-4000-8000-0000000000f3', '00000000-0000-4000-8000-0000000000f3', 'f0000000-0000-4000-8000-0000000000f3', 'Sam', true, '2026-01-01');

update subscriptions set tier = 'free' where family_id = 'f0000000-0000-4000-8000-0000000000f2';

\echo --- price rule: 200 -> 230, 120 -> 150, 400 -> 460, 0 -> 30
select fitness_price(200) as p200, fitness_price(120) as p120, fitness_price(400) as p400, fitness_price(0) as p0;

set role authenticated;

-- F1
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000f1', false);
\echo --- F1 books yoga for themselves (expect a uuid)
select create_fitness_booking('a1000000-0000-4000-8000-0000000000f1', 'preview', 'PV-AAAA1111', 's_1', 'Prana Yoga Studio', 'Sample', 12.97, 77.59,
  'yoga', 'Yoga for beginners', date_trunc('hour', now()) + interval '1 day 2 hours', 60, 200, 'abc123', 'Slow, calm and steady') is not null as booked_self;
\echo --- F1 books aqua for Papa (expect a uuid)
select create_fitness_booking('a2000000-0000-4000-8000-0000000000f1', 'preview', 'PV-BBBB2222', 's_2', 'Aqua Ease Pool Studio', 'Sample', 12.98, 77.6,
  'aqua', 'Aqua aerobics', date_trunc('hour', now()) + interval '2 days', 45, 300, 'XYZ789', 'Low impact, kind to knees') is not null as booked_papa;
\echo --- F1 double-books Papa 15 minutes into that class (expect: already booked)
select create_fitness_booking('a2000000-0000-4000-8000-0000000000f1', 'preview', 'PV-CCCC3333', 's_3', 'Lotus Yoga Shala', 'Sample', 12.98, 77.6,
  'yoga', 'Yoga', date_trunc('hour', now()) + interval '2 days 15 minutes', 60, 200, 'QQQ111', null);
\echo --- F1 books a class starting in 5 minutes (expect: next two weeks)
select create_fitness_booking('a1000000-0000-4000-8000-0000000000f1', 'preview', 'PV-DDDD4444', 's_1', 'Prana Yoga Studio', 'Sample', 12.97, 77.59,
  'yoga', 'Yoga', now() + interval '5 minutes', 60, 200, 'abc124', null);
\echo --- F1 invents an activity (expect: check constraint)
select create_fitness_booking('a1000000-0000-4000-8000-0000000000f1', 'preview', 'PV-EEEE5555', 's_1', 'Prana Yoga Studio', 'Sample', 12.97, 77.59,
  'skydiving', 'Skydiving', now() + interval '3 days', 60, 200, 'abc125', null);
\echo --- F1 sees two bookings, priced by the server
select session_title, base_price, markup, price, checkin_code, status from fitness_bookings order by starts_at;
\echo --- F1 cannot insert directly (expect: permission or policy error)
insert into fitness_bookings (user_id, profile_id, provider_ref, studio_id, studio_name, activity, session_title, starts_at, duration_min, base_price, markup, price, checkin_code)
values ('00000000-0000-4000-8000-0000000000f1', 'a1000000-0000-4000-8000-0000000000f1', 'PV-X', 's', 'Studio', 'yoga', 'Yoga', now() + interval '3 days', 60, 1, 0, 1, 'AAAA');
\echo --- F1 cancels the class for Papa (expect t), then again (expect f)
select cancel_fitness_booking((select id from fitness_bookings where activity = 'aqua'));
select cancel_fitness_booking((select id from fitness_bookings where activity = 'aqua'));

-- F2
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000f2', false);
\echo --- F2 sees none of the F1 bookings (expect 0)
select count(*) from fitness_bookings;
\echo --- F2 books for paused Nani (expect: not covered)
select create_fitness_booking('a2000000-0000-4000-8000-0000000000f2', 'preview', 'PV-FFFF6666', 's_1', 'Prana Yoga Studio', 'Sample', 12.97, 77.59,
  'yoga', 'Yoga', now() + interval '3 days', 60, 200, 'abc126', null);
\echo --- F2 cannot cancel an F1 booking (expect f)
reset role;
select id as f1_booking from fitness_bookings where activity = 'yoga' and user_id = '00000000-0000-4000-8000-0000000000f1' \gset
set role authenticated;
select cancel_fitness_booking(:'f1_booking');

-- F3
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000f3', false);
\echo --- F3 has not agreed (expect: agree to the required uses first)
select create_fitness_booking('a1000000-0000-4000-8000-0000000000f3', 'preview', 'PV-GGGG7777', 's_1', 'Prana Yoga Studio', 'Sample', 12.97, 77.59,
  'yoga', 'Yoga', now() + interval '3 days', 60, 200, 'abc127', null);

reset role;

\echo --- the inbox: titles within 40, bodies within 90, on the appointments shelf
select kind, category, title, length(title) as tl, body, length(body) as bl, route is not null as routed
from notifications where kind like 'fitness%' order by created_at, kind;
