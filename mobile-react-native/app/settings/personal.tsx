import { ComingLater } from "@/components/app/coming-later";

export default function Screen() {
  return (
    <ComingLater
      back
      title="Personal information"
      phase="Phase 4"
      detail="Name, date of birth and contact details."
    />
  );
}
