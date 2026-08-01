import { AvatarFamily, AvatarSolo } from "@/components/illustrations/avatar-cluster";
import { WhoForm } from "./who-form";

/*
 * A4's shell. It exists only to generate the two avatar clusters server-side
 * and hand them to the client form, which owns the radio state.
 */
export default function WhoPage() {
  return (
    <WhoForm
      // Both fit the form's fixed 92px art column, so the two cards' titles
      // start at the same x. The family cluster is wider than it is tall
      // because three overlapped faces are; its height matches the solo
      // portrait so the two cards stay the same height too.
      solo={<AvatarSolo className="h-[72px] w-[72px]" />}
      family={<AvatarFamily className="h-[72px] w-[92px]" />}
    />
  );
}
