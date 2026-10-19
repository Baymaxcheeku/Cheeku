-- 0036 step 2 of 5. Run the steps in order, each in a new query. Safe to run again.
begin;

create or replace function notify_profile_removed () returns trigger
security definer
set
  search_path = public as $$
begin
  if old.is_primary or not exists (select 1 from families where id = old.family_id) then
    return null;
  end if;

  perform notify_user(
    old.user_id, null, null, 'family_removed',
    old.name || '''s file was removed',
    'Their reports and chats are gone for good. Not you? Change your password in Security.',
    '/settings/security',
    'removed:' || old.id
  );
  return null;
end;
$$ language plpgsql;

create or replace function notify_plan_change () returns trigger
security definer
set
  search_path = public as $$
declare
  v_owner uuid;
  v_members int;
  v_paused int;
  v_note text := '';
begin
  if tg_op = 'UPDATE' and new.tier is not distinct from old.tier then
    return null;
  end if;

  select owner_id into v_owner from families where id = new.family_id;
  if v_owner is null then
    return null;
  end if;

  select count(*) into v_members from profiles where user_id = v_owner;
  v_paused := greatest(0, v_members - entitlement_seats(new.tier));
  if v_paused = 1 then
    v_note := ' 1 member is paused, not deleted.';
  elsif v_paused > 1 then
    v_note := ' ' || v_paused || ' members are paused, not deleted.';
  end if;

  if new.tier = 'free' then
    if tg_op = 'UPDATE' then
      perform notify_user(
        v_owner, null, null, 'plan_ended',
        'You''re on the Free plan',
        'Your records stay put. You get ' || (chat_limits() ->> 'free_daily') || ' chats a day.' || v_note,
        '/settings/subscription',
        null
      );
    end if;
  else
    perform notify_user(
      v_owner, null, null, 'plan_changed',
      case new.tier
        when 'family' then 'Family plan is on 🎉'
        when 'solo' then 'Solo plan is on 🎉'
        else 'Your Daily pass is on 🎉'
      end,
      case new.tier
        when 'family' then 'Up to 4 people, unlimited chats. Add your family from Home.'
        when 'solo' then 'Unlimited chats, just for you.'
        else 'Unlimited chats for 24 hours. Make them count.'
      end || v_note,
      '/settings/subscription',
      null,
      jsonb_build_object('tier', new.tier, 'paused', v_paused)
    );
  end if;
  return null;
end;
$$ language plpgsql;

commit;
