import type { LabService, LabStatus } from "./types";

/*
 * LabStack's ten lab statuses, told as five or six steps a person cares about.
 * Home collection: booked, collector assigned, on the way, collected, in the
 * lab, report ready. A lab visit drops the collector steps. Problems
 * (collector didn't come, sample rejected, missed) are a banner with the way
 * forward, not a step.
 */

export type Stage = { key: string; label: string; line: string };

const HOME: (Stage & { statuses: LabStatus[] })[] = [
  { key: "booked", label: "Booked", line: "Your slot is held.", statuses: ["PENDING", "CREATED", "ORDER_SCHEDULED", "RESCHEDULED"] },
  { key: "assigned", label: "Collector assigned", line: "They'll call before they come.", statuses: ["PHLEBO_ASSIGNED"] },
  { key: "coming", label: "On the way", line: "The collector has set out.", statuses: ["PHLEBO_STARTED"] },
  { key: "collected", label: "Sample collected", line: "It's heading to the lab.", statuses: ["PATIENT_VISITED", "SAMPLE_COLLECTED", "SAMPLE_IN_TRANSIT", "SAMPLE_DELIVERED"] },
  { key: "lab", label: "In the lab", line: "Tests are running.", statuses: ["SAMPLE_PROCESSED"] },
  { key: "ready", label: "Report ready", line: "Filed in their health file.", statuses: ["REPORT_DELIVERED", "PARTIAL_DELIVERED"] },
];

const VISIT: (Stage & { statuses: LabStatus[] })[] = [
  { key: "booked", label: "Booked", line: "Your slot is held. Take an ID.", statuses: ["PENDING", "CREATED", "ORDER_SCHEDULED", "RESCHEDULED", "PHLEBO_ASSIGNED", "PHLEBO_STARTED"] },
  { key: "visited", label: "At the lab", line: "Sample given.", statuses: ["PATIENT_VISITED", "SAMPLE_COLLECTED", "SAMPLE_IN_TRANSIT", "SAMPLE_DELIVERED"] },
  { key: "lab", label: "In the lab", line: "Tests are running.", statuses: ["SAMPLE_PROCESSED"] },
  { key: "ready", label: "Report ready", line: "Filed in their health file.", statuses: ["REPORT_DELIVERED", "PARTIAL_DELIVERED"] },
];

export function stagesFor(type: LabService): Stage[] {
  return (type === "CENTER_VISIT" ? VISIT : HOME).map(({ key, label, line }) => ({ key, label, line }));
}

/** Which step the order is on; problem statuses sit on the step before them. */
export function stageAt(type: LabService, status: LabStatus): number {
  const list = type === "CENTER_VISIT" ? VISIT : HOME;
  if (status === "PHLEBO_NO_SHOW") return list.findIndex((s) => s.key === "assigned" || s.key === "booked");
  if (status === "PATIENT_MISSED") return 0;
  if (status === "SAMPLE_REJECTED") return list.findIndex((s) => s.key === "collected" || s.key === "visited");
  const i = list.findIndex((s) => s.statuses.includes(status));
  return i < 0 ? 0 : i;
}

export type Problem = { title: string; line: string; action: "reschedule" | "rebook" | null };

/** What went wrong, said plainly, with the next step. Null when all is well. */
export function problemOf(status: LabStatus): Problem | null {
  if (status === "PHLEBO_NO_SHOW") return { title: "The collector didn't come", line: "Sorry about that. Pick a new time and it's on the lab, or report it so they follow up.", action: "reschedule" };
  if (status === "PATIENT_MISSED") return { title: "The collector missed you", line: "Pick a new time that works.", action: "reschedule" };
  if (status === "SAMPLE_REJECTED") return { title: "The sample couldn't be used", line: "This happens sometimes. The lab will arrange a fresh collection; pick a time.", action: "reschedule" };
  if (status === "PARTIAL_DELIVERED") return { title: "Part of the report is in", line: "The rest follows as the lab finishes. I'll file it when it lands.", action: null };
  return null;
}

/** Until the sample is taken, the time can move and the booking can be cancelled. */
export function canChange(status: LabStatus): boolean {
  return ["PENDING", "CREATED", "ORDER_SCHEDULED", "RESCHEDULED", "PHLEBO_ASSIGNED", "PHLEBO_NO_SHOW", "PATIENT_MISSED"].includes(status);
}
