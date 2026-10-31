import { ScreenNotFound } from "@/components/app/screen-states";

/*
 * Reached when getRecord returns null — which happens both for an id that does
 * not exist and for one belonging to another account, because RLS filters the
 * row rather than refusing it. The copy covers both without confirming which,
 * since telling someone a record exists but is not theirs is itself a leak.
 */
export default function RecordNotFound() {
  return (
    <ScreenNotFound
      title="That record isn't here"
      body="It may have been deleted, or the link may belong to a different account."
    />
  );
}
