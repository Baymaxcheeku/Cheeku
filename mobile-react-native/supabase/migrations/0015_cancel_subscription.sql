-- Cancelling a plan, server-side.
--
-- The last write in `subscriptions` still missing from mobile. On web it runs
-- with the service-role key, which cannot exist in a bundle on a phone — that
-- key would let every installed copy grant itself any tier.
--
-- Unlike `activate_tier_demo`, THIS ONE IS NOT A DEMO. Cancelling is a right,
-- not a purchase: stores require in-app cancellation, and DPDP expects people
-- to be able to stop processing they have consented to. It stays after real
-- billing ships, and only gains a call out to the store's own subscription API
-- alongside it. So it is deliberately NOT gated behind `app_flags.demo_billing`
-- — a kill switch on the demo purchase path must never take the exit with it.

create function cancel_subscription () returns boolean
set
  search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_family uuid;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;

  select f.id into v_family from families f where f.owner_id = v_user limit 1;
  if v_family is null then
    return false;
  end if;

  /*
   * Back to free, and the expiry cleared.
   *
   * Leaving a stale `expires_at` behind would make the next Daily pass read as
   * already elapsed the moment it is bought, because the read path treats a
   * past expiry as lapsed whatever the tier says.
   *
   * `chats_used_this_month` is deliberately NOT reset. Cancelling is not a way
   * to refill the free allowance — otherwise the cheapest way to get unlimited
   * chats is to subscribe and cancel in a loop.
   */
  update subscriptions
  set tier = 'free',
      expires_at = null
  where family_id = v_family;

  return true;
end;
$$ language plpgsql security definer;

comment on function cancel_subscription () is 'Returns the caller''s family to the free tier. Not demo-gated: cancelling is a right, and stores require it in-app.';

revoke execute on function cancel_subscription () from public;
grant execute on function cancel_subscription () to authenticated;
