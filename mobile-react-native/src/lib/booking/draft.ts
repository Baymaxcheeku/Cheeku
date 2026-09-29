import { create } from "zustand";

import type { Mode, SpecialtyId } from "@/lib/booking/catalog";

/*
 * The booking in progress, shared by the four booking screens.
 *
 * Client state only and never persisted: it holds what somebody said about
 * their health, and a half-finished intake has no business surviving an app
 * restart on a shared family phone. Leaving the flow and coming back starts a
 * fresh conversation, which is also what a person would expect.
 */

/** The pre-consultation note. Every field is in the reader's own words. */
export type Intake = {
  forName: string;
  concern: string;
  details: string;
  since: string;
  impact: string;
  tried: string;
  shareRecords: boolean;
};

export type Booking = {
  doctorId: string;
  mode: Mode;
  /** ISO date of the day, midnight local. */
  day: string;
  slotLabel: string;
  /** The saved appointment this booking created. */
  appointmentId?: string;
};

type Draft = {
  intake: Intake | null;
  specialty: SpecialtyId | null;
  mode: Mode | null;
  booking: Booking | null;
  setIntake: (intake: Intake) => void;
  choose: (specialty: SpecialtyId, mode: Mode) => void;
  setMode: (mode: Mode) => void;
  book: (booking: Booking) => void;
  reset: () => void;
};

export const useBookingDraft = create<Draft>((set) => ({
  intake: null,
  specialty: null,
  mode: null,
  booking: null,
  setIntake: (intake) => set({ intake }),
  choose: (specialty, mode) => set({ specialty, mode }),
  setMode: (mode) => set({ mode }),
  book: (booking) => set({ booking }),
  reset: () => set({ intake: null, specialty: null, mode: null, booking: null }),
}));
