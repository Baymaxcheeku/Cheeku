import type { VisitMode } from "./catalog";

/*
 * THE MARKETPLACE ACCESS POINT.
 *
 * Every service request goes through one adapter. Today it is the preview
 * provider below, which answers instantly and books nothing. When the partner
 * API documentation arrives, a second implementation of `MarketplaceProvider`
 * goes in this file (or beside it), `marketplace()` returns it, and no screen
 * changes: they only ever talk to this interface.
 *
 * The shape follows what any provider network has to expose for a booking to
 * be honest end to end:
 *
 *   availability   windows that can actually be served, for a place and day
 *   quote          the price, before anyone confirms
 *   book           a request, answered with the provider's own reference
 *   status         where it is now (confirmed, assigned, on the way, done)
 *   cancel
 *
 * WHAT NEVER CROSSES THIS LINE: records, lab values, chat. A booking carries
 * who (first name, age band), where, when, and the person's own note. If they
 * chose to share reports with a clinician, that goes as a separate, explicit
 * step, never as a side effect of booking.
 */

export type RequestStatus = "requested" | "confirmed" | "assigned" | "on_the_way" | "done" | "cancelled";

export type ServiceRequestInput = {
  serviceId: string;
  offeringId: string;
  mode: VisitMode;
  /** ISO date, local midnight. */
  date: string;
  window: string;
  /** Home visits only. */
  address: string | null;
  /** Their own words, gated by the safety check before it gets here. */
  note: string;
  forName: string;
  ageBand: string | null;
};

export type Quote = { amount: number | null; currency: "INR"; note: string };

export type BookResult = { ok: true; reference: string; status: RequestStatus; provider: string } | { ok: false; message: string };

export interface MarketplaceProvider {
  readonly id: string;
  /** Shown on screens while the network is a preview. */
  readonly preview: boolean;
  availability(input: { serviceId: string; offeringId: string; mode: VisitMode; date: Date; now: Date }): Promise<string[]>;
  quote(input: ServiceRequestInput): Promise<Quote>;
  book(input: ServiceRequestInput): Promise<BookResult>;
  status(reference: string): Promise<RequestStatus | null>;
  cancel(reference: string): Promise<boolean>;
}

/** Each window with the hour it starts, so "can this still be served today" is arithmetic. */
const HOME_WINDOWS: readonly [string, number][] = [
  ["8-10 am", 8],
  ["10-12 pm", 10],
  ["12-2 pm", 12],
  ["4-6 pm", 16],
  ["6-8 pm", 18],
];
const ONLINE_SLOTS: readonly [string, number][] = [
  ["9:00 am", 9],
  ["10:30 am", 10.5],
  ["12:00 pm", 12],
  ["3:00 pm", 15],
  ["5:30 pm", 17.5],
  ["7:00 pm", 19],
  ["8:30 pm", 20.5],
];

/**
 * Windows still bookable on a day. Today needs three hours' notice for a home
 * or centre visit (someone has to get there) and one hour for online.
 */
export function windowsFor(mode: VisitMode, day: Date, now: Date): string[] {
  const list = mode === "online" ? ONLINE_SLOTS : HOME_WINDOWS;
  const lead = mode === "online" ? 1 : 3;
  const sameDay = day.toDateString() === now.toDateString();
  const hour = now.getHours() + now.getMinutes() / 60;
  return list.filter(([, start]) => !sameDay || start >= hour + lead).map(([label]) => label);
}

/** A short, readable reference: "CHK-7Q4M2D". */
export function newReference(seed = Math.random()): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let n = Math.floor(seed * 1e12);
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += chars[n % chars.length];
    n = Math.floor(n / chars.length);
  }
  return `CHK-${out}`;
}

/**
 * The stand-in until the partner API is connected. It accepts every request
 * and confirms it, so the full flow, the status page and the memory entry can
 * be built and tested now. Screens label it "Preview".
 */
export const previewProvider: MarketplaceProvider = {
  id: "preview",
  preview: true,
  async availability({ mode, date, now }) {
    return windowsFor(mode, date, now);
  },
  async quote() {
    return { amount: null, currency: "INR", note: "The provider confirms the price before the visit." };
  },
  async book() {
    return { ok: true, reference: newReference(), status: "confirmed", provider: "Partner network" };
  },
  async status() {
    return null;
  },
  async cancel() {
    return true;
  },
};

/** The one place a screen gets the marketplace from. */
export function marketplace(): MarketplaceProvider {
  return previewProvider;
}

export const STATUS_STEPS: { status: Exclude<RequestStatus, "cancelled">; label: string; line: string }[] = [
  { status: "requested", label: "Requested", line: "Sent to the provider." },
  { status: "confirmed", label: "Confirmed", line: "Your slot is held." },
  { status: "assigned", label: "Assigned", line: "Someone's been assigned to you." },
  { status: "on_the_way", label: "On the way", line: "They're coming to you, or the call is about to start." },
  { status: "done", label: "Done", line: "Notes filed in their memory." },
];

export function statusIndex(s: RequestStatus): number {
  return STATUS_STEPS.findIndex((x) => x.status === s);
}
