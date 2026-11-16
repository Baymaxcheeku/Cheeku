import { supabase } from "@/lib/supabase/client";

import { preview } from "./preview";
import type { AddressParts } from "./validate";
import {
  PartnerError,
  type AppointmentType,
  type CartLine,
  type Consult,
  type ConsultInput,
  type Drug,
  type Estimate,
  type InstantStatus,
  type LabOrder,
  type LabOrderInput,
  type LabService,
  type LabSlots,
  type PharmaOrder,
  type PharmaOrderInput,
  type PharmaOrderType,
  type Pharmacy,
  type Provider,
  type ProviderSlots,
  type ShipmentSpeed,
  type Speciality,
} from "./types";

/*
 * THE ONE DOOR TO LABSTACK.
 *
 * Screens call these functions and nothing else. Live, each one is a single
 * call to our `labstack` Edge Function (supabase/functions/labstack), which
 * holds the API key, checks the input again with the same rules
 * (lib/partner/validate.ts), talks to LabStack, and keeps our own order rows.
 * The app never sees the key or a raw LabStack response.
 *
 * Until the keys are set, `EXPO_PUBLIC_LABSTACK` is not "live" and the same
 * functions answer from `preview.ts`: same shapes, sample data, nothing
 * booked with anyone. Flip the variable and nothing on screen changes.
 */

export const LIVE = process.env.EXPO_PUBLIC_LABSTACK === "live";

type Loc = { pincode?: string; latitude?: number | null; longitude?: number | null };

async function call<T>(op: string, input: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke("labstack", { body: { op, input } });
  if (error) {
    // The function's own message ("The pincode isn't served…") is in the response body.
    // Read it by shape, not `instanceof Response`: on a phone the class can differ.
    const res = (error as { context?: unknown }).context as { clone?: () => { json: () => Promise<unknown> }; json?: () => Promise<unknown> } | undefined;
    let body: { error?: string; code?: PartnerError["code"] } = {};
    try {
      const read = res?.clone ? res.clone().json() : res?.json ? res.json() : null;
      if (read) body = ((await read) ?? {}) as typeof body;
    } catch {
      // not JSON
    }
    throw new PartnerError(body.error ?? "That didn't go through. Check your connection and try again.", body.code ?? "failed");
  }
  return data as T;
}

export type LabStack = {
  labs: {
    serviceable: (q: Loc & { service?: LabService; tests: string[] }) => Promise<{ lsLabId: number; labName: string; services: LabService[] }[]>;
    slots: (q: Loc & { date: string; service: LabService; lsLabId?: number | null; tests: string[]; fastingHours: number }) => Promise<LabSlots>;
    place: (input: LabOrderInput) => Promise<{ bookingId: string }>;
    order: (bookingId: string) => Promise<LabOrder>;
    reschedule: (bookingId: string, appointment: string) => Promise<void>;
    cancel: (bookingId: string, reason: string) => Promise<void>;
    escalate: (bookingId: string, issue: string, details: string) => Promise<void>;
  };
  pharma: {
    search: (query: string) => Promise<Drug[]>;
    alternatives: (drugMasterId: string) => Promise<Drug[]>;
    pharmacies: (q: Loc & { orderType: PharmaOrderType }) => Promise<Pharmacy[]>;
    estimate: (q: Loc & { orderType: PharmaOrderType; lsPharmacyId: number; speed: ShipmentSpeed | null; lines: CartLine[]; address?: AddressParts }) => Promise<Estimate>;
    place: (input: PharmaOrderInput) => Promise<{ orderId: string }>;
    order: (orderId: string) => Promise<PharmaOrder>;
    orders: () => Promise<PharmaOrder[]>;
    cancel: (orderId: string, reason: string) => Promise<void>;
  };
  consult: {
    specialities: () => Promise<Speciality[]>;
    providers: (q: Loc & { type: AppointmentType; speciality: string | null }) => Promise<Provider[]>;
    slots: (q: Loc & { type: AppointmentType; date: string; lsProviderId: number }) => Promise<ProviderSlots>;
    book: (input: ConsultInput) => Promise<{ appointmentId: string }>;
    appointment: (appointmentId: string) => Promise<Consult>;
    meetingLink: (appointmentId: string) => Promise<{ link: string; opensAt: string | null; closesAt: string | null }>;
    reschedule: (appointmentId: string, appointment: string) => Promise<void>;
    cancel: (appointmentId: string, reason: string) => Promise<void>;
    escalate: (appointmentId: string, issue: string, details: string) => Promise<void>;
    instant: (input: { profileId: string; patient: ConsultInput["patient"]; speciality: string | null; notes: string; context: Record<string, string> }) => Promise<InstantStatus>;
    instantStatus: (requestId: string) => Promise<InstantStatus>;
    cancelInstant: (requestId: string) => Promise<void>;
  };
};

const live: LabStack = {
  labs: {
    serviceable: (q) => call("labs.serviceable", q),
    slots: (q) => call("labs.slots", q),
    place: (input) => call("labs.place", input),
    order: (bookingId) => call("labs.order", { bookingId }),
    reschedule: (bookingId, appointment) => call("labs.reschedule", { bookingId, appointment }),
    cancel: (bookingId, reason) => call("labs.cancel", { bookingId, reason }),
    escalate: (bookingId, issue, details) => call("labs.escalate", { bookingId, issue, details }),
  },
  pharma: {
    search: (query) => call("pharma.search", { query }),
    alternatives: (drugMasterId) => call("pharma.alternatives", { drugMasterId }),
    pharmacies: (q) => call("pharma.pharmacies", q),
    estimate: (q) => call("pharma.estimate", { ...q, lines: q.lines.map((l) => ({ drugMasterId: l.drug.drugMasterId, quantity: l.quantity })) }),
    place: (input) => call("pharma.place", input),
    order: (orderId) => call("pharma.order", { orderId }),
    orders: () => call("pharma.orders", {}),
    cancel: (orderId, reason) => call("pharma.cancel", { orderId, reason }),
  },
  consult: {
    specialities: () => call("consult.specialities", {}),
    providers: (q) => call("consult.providers", q),
    slots: (q) => call("consult.slots", q),
    book: (input) => call("consult.book", input),
    appointment: (appointmentId) => call("consult.appointment", { appointmentId }),
    meetingLink: (appointmentId) => call("consult.meetingLink", { appointmentId }),
    reschedule: (appointmentId, appointment) => call("consult.reschedule", { appointmentId, appointment }),
    cancel: (appointmentId, reason) => call("consult.cancel", { appointmentId, reason }),
    escalate: (appointmentId, issue, details) => call("consult.escalate", { appointmentId, issue, details }),
    instant: (input) => call("consult.instant", input),
    instantStatus: (requestId) => call("consult.instantStatus", { requestId }),
    cancelInstant: (requestId) => call("consult.cancelInstant", { requestId }),
  },
};

export function labstack(): LabStack {
  return LIVE ? live : preview;
}

/** "2026-11-20" + "08:15" as an IST ISO time, the way LabStack takes `appointment`. */
export function istIso(date: string, time: string): string {
  return `${date}T${time.length === 5 ? `${time}:00` : time}+05:30`;
}

/** "08:15" as "8:15 am". */
export function clock(time: string): string {
  const [h, m] = time.split(":").map(Number) as [number, number];
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}
