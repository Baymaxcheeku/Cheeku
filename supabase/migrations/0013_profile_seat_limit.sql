-- The third and last entitlement write to move off the device.
--
-- Migration 0011 closed uploads and chats. This closes the one it left: adding
-- a family member. The check lived in lib/settings/actions.ts, which runs on
-- the phone, so a patched client could create profiles its plan does not cover.
--
-- The exposure was always small — `selectableProfiles()` slices by seats on
-- every READ, so those extra profiles were invisible and unopenable the moment
-- they existed. Somebody would have been paying nothing for rows they could not
-- see. Small is not the same as closed, and leaving one of three gates on the
-- client is how the next person assumes all three are handled.
--
-- The 6-profile cap from migration 0001 stays exactly as it was. That is a
-- structural limit on any family; this is a commercial one that moves with the
-- plan, and they fail for different reasons.

create function enforce_profile_seat_limit () returns trigger
set
  search_path = public as $$
declare
  v_seats int;
  v_count int;
begin
  /*
   * The FIRST profile is always allowed, whatever the plan says.
   *
   * Onboarding creates it before any subscription row exists, and every tier
   * including free covers one seat — but a reader who somehow reached zero
   * seats must never be locked out of creating their own profile, because
   * that is an account with no way forward and no way to ask for help.
   */
  select count(*) into v_count from profiles where user_id = new.user_id;
  if v_count = 0 then
    return new;
  end if;

  select entitlement_seats(effective_tier(new.user_id)) into v_seats;

  if v_count >= v_seats then
    raise exception 'plan covers % profile(s)', v_seats
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$ language plpgsql security definer;

/*
 * Ordering against migration 0001's `profiles_limit_trigger` does not matter:
 * both are BEFORE INSERT and either raising is a refusal. Named to sort after
 * it so `\d profiles` reads in the order a person would explain them.
 */
create trigger profiles_seat_limit_trigger before insert on profiles for each row
execute function enforce_profile_seat_limit ();

comment on function enforce_profile_seat_limit () is 'Refuses a profile beyond what the plan covers. Commercial limit; migration 0001 holds the structural 6-profile cap.';
