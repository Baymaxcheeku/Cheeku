import { AvatarFamily, AvatarSolo } from "@/components/illustrations/avatar-cluster";
import { WhoForm } from "./who-form";

/*
 * A4's shell. It exists only to generate the two avatar clusters server-side
 * and hand them to the client form, which owns the radio state.
 */
export default function WhoPage() {
  return (
    <WhoForm
      solo={<AvatarSolo className="h-[68px] w-[68px]" />}
      family={<AvatarFamily className="h-[68px] w-[88px]" />}
    />
  );
}
