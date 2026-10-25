-- AFTER A LOAD RUN ON STAGING: did any memory cross over?
--
-- Read-only. Run in the SQL editor of the STAGING project after a gateway run
-- (or any run that saved messages). Every query should return zero rows.
--
-- The canaries are the CNRY-xxxxxx codes loadtest/seed/staging.ts wrote into
-- each member's record facilities. A canary in an answer saved to someone
-- else's thread means that member's records reached the wrong context.

-- 1. Answers carrying another member's canary, with how bad it is.
--    CROSS_ACCOUNT is another family's memory: stop everything.
--    SAME_FAMILY_MISFILE is the right family, wrong person: a switching bug.
with canaries as (
  select distinct d.profile_id, substring(d.facility from 'CNRY-[0-9a-f]{6}') as canary
  from documents d
  where d.facility ~ 'CNRY-[0-9a-f]{6}'
),
found as (
  select m.id as message_id, m.created_at, c.profile_id as thread_profile, c.user_id as thread_user,
         (regexp_matches(m.content, 'CNRY-[0-9a-f]{6}', 'g'))[1] as canary
  from messages m
  join conversations c on c.id = m.conversation_id
  where m.role = 'assistant' and m.content like '%CNRY-%'
)
select f.message_id, f.created_at, f.canary,
       case when p.user_id <> f.thread_user then 'CROSS_ACCOUNT' else 'SAME_FAMILY_MISFILE' end as severity
from found f
join canaries k on k.canary = f.canary
join profiles p on p.id = k.profile_id
where k.profile_id <> f.thread_profile
order by severity, f.created_at;

-- 2. Readings said in a chat, filed against a different member than the thread.
select f.id, f.profile_id as fact_profile, c.profile_id as thread_profile
from memory_facts f
join messages m on m.id = f.message_id
join conversations c on c.id = m.conversation_id
where f.profile_id <> c.profile_id;

-- 3. Messages whose account is not the thread's account.
select m.id, m.user_id, c.user_id as thread_user
from messages m
join conversations c on c.id = m.conversation_id
where m.user_id <> c.user_id;

-- 4. Booked entries (the chat's "Booked" cards) in a thread whose member the
--    booking was not for. Needs the gateway to record profile ids on events.
select m.id, c.profile_id as thread_profile, m.memory -> 'event' ->> 'profileId' as booked_for
from messages m
join conversations c on c.id = m.conversation_id
where m.memory ? 'event'
  and m.memory -> 'event' ->> 'profileId' is not null
  and (m.memory -> 'event' ->> 'profileId')::uuid <> c.profile_id;
