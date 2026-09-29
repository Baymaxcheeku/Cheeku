import { useEffect } from "react";
import { create } from "zustand";

import type { Mode } from "@/lib/booking/catalog";
import { kv } from "@/lib/storage";

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
};

const KEY = "cheeku.appointments";
const CAP = 8;

type Store = {
  items: Appointment[];
  loaded: boolean;
  load: () => Promise<void>;
  add: (a: Omit<Appointment, "id" | "status" | "createdAt">) => Appointment;
  reschedule: (id: string, day: string, slotLabel: string) => void;
  cancel: (id: string) => void;
};

function persist(items: Appointment[]) {
  void kv.set(KEY, JSON.stringify(items.slice(0, CAP)));
}

export const useAppointments = create<Store>((set, get) => ({
  items: [],
  loaded: false,
  load: async () => {
    if (get().loaded) return;
    try {
      const raw = await kv.get(KEY);
      set({ items: raw ? (JSON.parse(raw) as Appointment[]) : [], loaded: true });
    } catch {
      set({ items: [], loaded: true });
    }
  },
  add: (a) => {
    const appt: Appointment = {
      ...a,
      id: `a${Date.now().toString(36)}`,
      status: "booked",
      createdAt: new Date().toISOString(),
    };
    const items = [appt, ...get().items].slice(0, CAP);
    set({ items });
    persist(items);
    return appt;
  },
  reschedule: (id, day, slotLabel) => {
    const items = get().items.map((x) => (x.id === id ? { ...x, day, slotLabel, status: "booked" as const } : x));
    set({ items });
    persist(items);
  },
  cancel: (id) => {
    const items = get().items.map((x) => (x.id === id ? { ...x, status: "cancelled" as const } : x));
    set({ items });
    persist(items);
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
