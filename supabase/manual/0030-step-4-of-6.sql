-- 0030 step 4 of 6. Run the steps in order, each in a new query. Safe to run again.
begin;

alter table messages add column if not exists tier text;
alter table messages drop constraint if exists messages_tier_check;
alter table messages add constraint messages_tier_check check (tier is null or tier in ('reassure', 'monitor', 'contact_today', 'go_now'));
alter table messages add column if not exists memory jsonb;
alter table messages add column if not exists model_id text;

alter table conversations add column if not exists last_message_at timestamptz;

update conversations c
set last_message_at = coalesce((select max(m.created_at) from messages m where m.conversation_id = c.id), c.created_at)
where c.last_message_at is null;

create index if not exists conversations_profile_last_idx on conversations (profile_id, last_message_at desc);

create or replace function touch_conversation () returns trigger
set
  search_path = public as $$
begin
  update conversations set last_message_at = new.created_at where id = new.conversation_id and (last_message_at is null or last_message_at < new.created_at);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists messages_touch_conversation_trigger on messages;
create trigger messages_touch_conversation_trigger after insert on messages for each row
execute function touch_conversation ();

create or replace function chat_thread (p_profile uuid, p_before timestamptz default null, p_limit int default 40) returns setof jsonb
security definer
set
  search_path = public as $$
  select to_jsonb(x) from (
    select m.id, m.conversation_id, m.role, m.content, m.citations, m.safety_status, m.tier, m.memory,
           m.attachment, m.product_assessment, m.created_at
    from messages m
    join conversations c on c.id = m.conversation_id
    where c.profile_id = p_profile
      and c.user_id = auth.uid()
      and m.user_id = auth.uid()
      and p_profile in (select covered_profile_ids(auth.uid()))
      and (p_before is null or m.created_at < p_before)
    order by m.created_at desc, m.role asc
    limit least(greatest(coalesce(p_limit, 40), 1), 200)
  ) x;
$$ language sql stable;

revoke execute on function chat_thread (uuid, timestamptz, int) from public, anon;
grant execute on function chat_thread (uuid, timestamptz, int) to authenticated;

commit;
