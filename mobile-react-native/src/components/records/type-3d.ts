import type { Icon3DName } from "@/components/ui/icon3d";
import type { DocType } from "@/lib/records/types";

/** Each kind of record as one of Cheeku's 3D objects, the same on every screen. */
export const TYPE_3D: Record<DocType, Icon3DName> = {
  lab_report: "test-tube",
  prescription: "blister",
  medication: "capsule",
  scan: "monitor",
  discharge: "hospital",
  vaccination: "syringe",
  bill: "report",
  consultation_invoice: "doctor",
  booking_invoice: "calendar-check",
  insurance: "shield",
  other: "folder",
};
