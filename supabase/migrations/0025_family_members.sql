-- Family members: removing one safely, and saying what a plan change does.
--
-- Until now a family member could be added and never removed, short of
-- deleting the whole account. The profiles table has always had a delete
-- policy, but nothing in the app used it and nothing protected the one
-- profile that must never go on its own: the account holder's.
--
-- 1. The account holder's own profile (is_primary) cannot be deleted by
--    itself, and no profile can be moved to another family or account, or
--    promoted to primary. Deleting the whole family still cascades as before.
-- 2. Removing a member leaves one line in the inbox, so a removal done on a
--    phone left unlocked is noticed.
-- 3. The plan-change notification now says how many members a smaller plan
--    pauses. Paused, never deleted: the seat trigger (0013) and the app's
--    selectable list already keep them, they just cannot be opened.
-- 4. A chosen face must be one the app ships.

-- ------------------------------------------------------ protect the primary --

create function protect_primary_profile () returns trigger
set
  search_path = public as $$
begin
  if tg_op = 'DELETE' then
    -- When the family itself is being deleted (account deletion), the parent
    -- row is already gone by the time this cascade reaches us, so this only
    -- refuses a direct delete of the account holder's own profile.
    if old.is_primary and exists (select 1 from families where id = old.family_id) then
      raise exception 'the account holder''s profile cannot be removed on its own'
        using errcode = 'check_violation';
    end if;
    return old;
  end if;

  if new.is_primary is distinct from old.is_primary
     or new.family_id is distinct from old.family_id
     or new.user_id is distinct from old.user_id then
    raise exception 'a profile cannot change owner, family or primary status'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger profiles_protect_primary_trigger
before delete or update on profiles for each row
execute function protect_primary_profile ();

-- ------------------------------------------------------- chosen faces only --
-- NOT VALID: checked on every new write, without failing on any row that
-- predates the picker.

alter table profiles
add constraint profiles_avatar_seed_check check (
  avatar_seed is null
  or avatar_seed ~ '^p[0-9]{1,2}$'
) not valid;

-- ------------------------------------------- the inbox learns "removed" --
-- Postgres 16 cannot change a generated column's expression in place, so the
-- category column is dropped and added back with the new kind in it.

alter table notifications drop constraint notifications_kind_check;

alter table notifications
add constraint notifications_kind_check check (
  kind in (
    'report_ready',
    'report_review',
    'report_flagged',
    'appointment_booked',
    'appointment_rescheduled',
    'appointment_cancelled',
    'family_added',
    'family_removed',
    'plan_changed',
    'plan_ended',
    'password_changed',
    'support_update',
    'service_live',
    'welcome'
  )
);

alter table notifications drop column category;

alter table notifications
add column category text generated always as (
  case
    when kind like 'report\_%' then 'reports'
    when kind like 'appointment\_%' then 'appointments'
    when kind in ('family_added', 'family_removed') then 'family'
    when kind in ('plan_changed', 'plan_ended', 'password_changed', 'support_update') then 'account'
    else 'updates'
  end
) stored;

create function notify_profile_removed () returns trigger
security definer
set
  search_path = public as $$
begin
  -- Account deletion removes the family first; nobody is left to tell.
  if old.is_primary or not exists (select 1 from families where id = old.family_id) then
    return null;
  end if;

  perform notify_user(
    old.user_id, null, null, 'family_removed',
    old.name || '''s health file was removed',
    'Their reports and chats are deleted for good. If this wasn''t you, change your password from Security.',
    '/settings/security',
    'removed:' || old.id
  );
  return null;
end;
$$ language plpgsql;

create trigger profiles_removed_notify_trigger
after delete on profiles for each row
execute function notify_profile_removed ();

-- ------------------------------------------ plan changes name the pause --

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
    v_note := ' 1 family member is paused, not deleted. Switch back to Family to open their file again.';
  elsif v_paused > 1 then
    v_note := ' ' || v_paused || ' family members are paused, not deleted. Switch back to Family to open their files again.';
  end if;

  if new.tier = 'free' then
    if tg_op = 'UPDATE' then
      perform notify_user(
        v_owner, null, null, 'plan_ended',
        'You''re back on the Free plan',
        'Your records stay exactly where they are. You get 5 chats a day.' || v_note,
        '/settings/subscription',
        null
      );
    end if;
  else
    perform notify_user(
      v_owner, null, null, 'plan_changed',
      case new.tier
        when 'family' then 'Family plan is on'
        when 'solo' then 'Solo plan is on'
        else 'Your Daily pass is on'
      end,
      case new.tier
        when 'family' then 'Up to 4 people and unlimited chats. Add your family from Home.'
        when 'solo' then 'Unlimited chats with Cheeku, just for you.'
        else 'Unlimited chats for the next 24 hours. Make them count.'
      end || v_note,
      '/settings/subscription',
      null,
      jsonb_build_object('tier', new.tier, 'paused', v_paused)
    );
  end if;
  return null;
end;
$$ language plpgsql;
