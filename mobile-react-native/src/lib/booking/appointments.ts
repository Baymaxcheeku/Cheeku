import { useEffect } from "react";
import { create } from "zustand";

import { doctorById, SPECIALTIES, type Mode } from "@/lib/booking/catalog";
import { cancelConsultationInvoice, fileConsultationInvoice, rescheduleConsultationInvoice } from "@/lib/records/record-actions";
import { recordDeviceEvent } from "@/lib/notifications/queries";
import { kv } from "@/lib/storage";
import { hydratePartnerDoctors } from "@/lib/booking/partner-doctors-store";

/*
 * Booked appointments, kept on this device.
 *
 * WHAT IS STORED, AND WHAT IS NOT. Only what the appointment screens need to
 * show and manage the booking: which doctor, when, how, and for whom. The
 * pre-consultation note — what somebody said about their symptoms — is NOT
 * kept: it went to the doctor with the booking, and a second copy on a shared
 * family phone is a disclosure waiting to happen. The area of concern ("Skin,
 * hair or nails") is kept, because an appointment list without it is a list of
 * names and times nobody can tell apart.
 *
 * `kv` is SecureStore on device. Each record is ~200 bytes and the list is
 * capped, which keeps it under SecureStore's 2 KB comfort limit.
 *
 * PREVIEW. These are bookings against sample doctors. When a real booking API
 * lands, this store becomes a query and the screens keep their shape.
 */

export type Appointment = {
  id: string;
  doctorId: string;
  mode: Mode;
  /** ISO string for the day, local midnight. */
  day: string;
  /** "6:30 pm" (online) or "7:00 pm – 7:30 pm" (clinic window). */
  slotLabel: string;
  forName: string;
  concern: string;
  status: "booked" | "cancelled";
  createdAt: string;
  /** The family member it is for, when known; the invoice is filed under them. */
  profileId?: string;
  /** The consultation invoice filed in their records (migration 0028). */
  invoiceId?: string;
};

const KEY = "cheeku.appointments";
const CAP = 8;

type Store = {
  items: Appointment[];
  loaded: boolean;
  load: () => Promise<void>;
  /** `id` given: a partner booking, kept under the gateway's id; no sample invoice is filed for it. */
  add: (a: Omit<Appointment, "id" | "status" | "createdAt" | "invoiceId"> & { id?: string }) => Appointment;
  reschedule: (id: string, day: string, slotLabel: string) => void;
  cancel: (id: string) => void;
};

function persist(items: Appointment[]) {
  void kv.set(KEY, JSON.stringify(items.slice(0, CAP)));
}

/*
 * Each change also leaves a row in the inbox, so "what did I book, and when
 * did I move it" has an answer after the fact. The row names the doctor and
 * the time and nothing about why; the phone reminders (notifications/push.ts)
 * are more careful still and name neither.
 */
function what(a: Appointment): string {
  return a.mode === "online" ? "video call" : "clinic visit";
}

function inbox(a: Appointment, change: "booked" | "rescheduled" | "cancelled") {
  const doctor = doctorById(a.doctorId)?.name ?? "your doctor";
  const when = whenLabel(a);
  const route = `/appointments/${a.id}`;
  if (change === "booked") {
    void recordDeviceEvent({
      kind: "appointment_booked",
      title: `You're booked with ${doctor}`,
      body: `${a.mode === "online" ? "Video call" : "Clinic visit"}, ${when}. I'll remind you before it starts.`,
      route,
      dedupeKey: `appt:${a.id}:booked`,
    });
  } else if (change === "rescheduled") {
    void recordDeviceEvent({
      kind: "appointment_rescheduled",
      title: `Moved to ${when}`,
      body: `Your ${what(a)} with ${doctor} has a new time. Reminders are updated too.`,
      route,
      dedupeKey: `appt:${a.id}:moved:${a.day.slice(0, 10)}:${a.slotLabel}`,
    });
  } else {
    void recordDeviceEvent({
      kind: "appointment_cancelled",
      title: "Appointment cancelled",
      body: `Your ${what(a)} with ${doctor}, ${when}, is off. Book again whenever you're ready.`,
      route,
      dedupeKey: `appt:${a.id}:cancelled`,
    });
  }
}

/*
 * The invoice goes into the member's records, where bills and receipts live,
 * so "what did that consultation cost" has an answer next to the
 * prescription it produced. Best effort: a booking never fails because its
 * invoice didn't file.
 */
async function fileInvoice(a: Appointment, done: (invoiceId: string) => void) {
  const doctor = doctorById(a.doctorId);
  if (!doctor || !a.profileId) return;
  const fee = doctor.fee[a.mode];
  if (fee === undefined) return;
  const id = await fileConsultationInvoice({
    profileId: a.profileId,
    doctor: doctor.name,
    specialty: SPECIALTIES[doctor.specialty]?.label ?? null,
    clinic: a.mode === "clinic" ? `${doctor.clinic.name}, ${doctor.clinic.area}` : null,
    mode: a.mode,
    day: localDay(a.day),
    slot: a.slotLabel,
    fee,
    appointmentId: a.id,
  }).catch(() => null);
  if (id) done(id);
}

/** The appointment's calendar day where the person is, as YYYY-MM-DD. */
function localDay(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const useAppointments = create<Store>((set, get) => ({
  items: [],
  loaded: false,
  load: async () => {
    if (get().loaded) return;
    try {
      // Partner doctors first, so a live appointment shows its doctor straight away.
      await hydratePartnerDoctors();
      const raw = await kv.get(KEY);
      set({ items: raw ? (JSON.parse(raw) as Appointment[]) : [], loaded: true });
    } catch {
      set({ items: [], loaded: true });
    }
  },
  add: (a) => {
    const { id: partnerId, ...rest } = a;
    const appt: Appointment = {
      ...rest,
      id: partnerId ?? `a${Date.now().toString(36)}`,
      status: "booked",
      createdAt: new Date().toISOString(),
    };
    const items = [appt, ...get().items].slice(0, CAP);
    set({ items });
    persist(items);
    inbox(appt, "booked");
    if (partnerId) return appt;
    void fileInvoice(appt, (invoiceId) => {
      const next = get().items.map((x) => (x.id === appt.id ? { ...x, invoiceId } : x));
      set({ items: next });
      persist(next);
    });
    return appt;
  },
  reschedule: (id, day, slotLabel) => {
    const items = get().items.map((x) => (x.id === id ? { ...x, day, slotLabel, status: "booked" as const } : x));
    set({ items });
    persist(items);
    const moved = items.find((x) => x.id === id);
    if (moved) inbox(moved, "rescheduled");
    if (moved?.invoiceId) void rescheduleConsultationInvoice(moved.invoiceId, day, slotLabel);
  },
  cancel: (id) => {
    const before = get().items.find((x) => x.id === id);
    const items = get().items.map((x) => (x.id === id ? { ...x, status: "cancelled" as const } : x));
    set({ items });
    persist(items);
    if (before && before.status !== "cancelled") {
      inbox(before, "cancelled");
      // Refunded if it was paid in the app, otherwise just cancelled.
      if (before.invoiceId) void cancelConsultationInvoice(before.invoiceId);
    }
  },
}));

/** Loads once per app session, on first use. */
export function useAppointmentList() {
  const store = useAppointments();
  useEffect(() => {
    void store.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return store;
}

/** When the appointment starts, from the day plus the slot's start time. */
export function startsAt(a: Pick<Appointment, "day" | "slotLabel">): Date {
  const d = new Date(a.day);
  const match = /(\d{1,2}):(\d{2})\s*(am|pm)/i.exec(a.slotLabel);
  if (match) {
    let h = Number(match[1]) % 12;
    if ((match[3] ?? "").toLowerCase() === "pm") h += 12;
    d.setHours(h, Number(match[2]), 0, 0);
  }
  return d;
}

/** Still ahead, or started within the last 45 minutes. */
export function isUpcoming(a: Appointment, now = new Date()): boolean {
  return a.status === "booked" && startsAt(a).getTime() > now.getTime() - 45 * 60 * 1000;
}

/**
 * The video room opens 15 minutes before and stays open for 45 after. Outside
 * that window the join button is shown but says when it opens, so nobody has
 * to guess.
 */
export function joinWindow(a: Appointment, now = new Date()): "early" | "open" | "closed" {
  const start = startsAt(a).getTime();
  const t = now.getTime();
  if (t < start - 15 * 60 * 1000) return "early";
  if (t <= start + 45 * 60 * 1000) return "open";
  return "closed";
}

/** "Today, 6:30 pm" / "Tomorrow, 7:00 pm" / "Fri 3 Oct, 10:00 am". */
export function whenLabel(a: Pick<Appointment, "day" | "slotLabel">, now = new Date()): string {
  const d = new Date(a.day);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  const time = a.slotLabel.split(" – ")[0] ?? a.slotLabel;
  const day =
    diff === 0
      ? "Today"
      : diff === 1
        ? "Tomorrow"
        : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  return `${day}, ${time}`;
}

/** "in 2 h 10 min" / "in 25 min" / "now". */
export function countdown(a: Appointment, now = new Date()): string {
  const mins = Math.round((startsAt(a).getTime() - now.getTime()) / 60000);
  if (mins <= 0) return "now";
  if (mins < 60) return `in ${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `in ${h} h${mins % 60 ? ` ${mins % 60} min` : ""}`;
  const days = Math.round(h / 24);
  return `in ${days} ${days === 1 ? "day" : "days"}`;
}
