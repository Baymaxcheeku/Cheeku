import type { Icon3DName } from "@/components/ui/icon3d";
import type { Pillar } from "@/lib/home/content";
import type { PlanTask } from "@/lib/home/plan";

/*
 * TODAY'S COLOURS (redesign, 17 Nov 2026).
 *
 * One flat pastel per pillar, never a gradient: a soft fill for the card, a
 * deep tone for text and buttons on it (white text on `deep` passes AA), and
 * a bright accent for bars and progress. Paired with Cheeku's 3D objects so
 * each part of the day reads at a glance.
 */
export type Tone = { bg: string; deep: string; accent: string; track: string };

export const PILLAR_TONE: Record<Pillar, Tone> = {
  move: { bg: "#e4f5ec", deep: "#17633f", accent: "#34b37a", track: "#cdebdc" },
  eat: { bg: "#fff0e2", deep: "#9a4a0c", accent: "#f2933f", track: "#fbdcc0" },
  sleep: { bg: "#ecebff", deep: "#3b2bc9", accent: "#6d61f2", track: "#d9d6ff" },
  mind: { bg: "#fdebf3", deep: "#9c2357", accent: "#e46a9f", track: "#f8d2e3" },
  check: { bg: "#e5f0fd", deep: "#1b5596", accent: "#4a90e2", track: "#cde0f8" },
};

export const PILLAR_3D: Record<Pillar, Icon3DName> = { move: "shoe", eat: "food", sleep: "moon", mind: "lotus", check: "stethoscope" };

const KIND_3D: Partial<Record<PlanTask["kind"], Icon3DName>> = { steps: "shoe", meal: "food", reading: "heart", rating: "moon", timer: "lotus", dose: "blister" };

export function taskIcon3d(t: PlanTask): Icon3DName {
  if (t.due) return /follow|doctor|dr\.|consult/i.test(t.title) ? "doctor" : /vaccin/i.test(t.title) ? "calendar" : "test-tube";
  return KIND_3D[t.kind] ?? PILLAR_3D[t.pillar];
}
