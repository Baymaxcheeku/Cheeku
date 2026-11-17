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
export type Tone = { bg: string; deep: string; accent: string; track: string; glass: string };

export const PILLAR_TONE: Record<Pillar, Tone> = {
  // No yellows or browns (owner, 17 Nov): Eat is the ring app's coral.
  move: { bg: "#e4f5ec", deep: "#17633f", accent: "#34b37a", track: "#cdebdc", glass: "rgba(214,241,227,0.72)" },
  eat: { bg: "#ffebe5", deep: "#b4361d", accent: "#f36a4b", track: "#fbd0c4", glass: "rgba(255,224,215,0.72)" },
  sleep: { bg: "#ecebff", deep: "#3b2bc9", accent: "#6d61f2", track: "#d9d6ff", glass: "rgba(226,224,255,0.72)" },
  mind: { bg: "#f8eafb", deep: "#86277a", accent: "#c95dbd", track: "#efd3f0", glass: "rgba(244,222,248,0.72)" },
  check: { bg: "#e5f0fd", deep: "#1b5596", accent: "#4a90e2", track: "#cde0f8", glass: "rgba(216,232,252,0.72)" },
};

export const PILLAR_3D: Record<Pillar, Icon3DName> = { move: "shoe", eat: "food", sleep: "moon", mind: "lotus", check: "stethoscope" };

const KIND_3D: Partial<Record<PlanTask["kind"], Icon3DName>> = { steps: "shoe", meal: "food", reading: "heart", rating: "moon", timer: "lotus", dose: "blister" };

export function taskIcon3d(t: PlanTask): Icon3DName {
  if (t.due) return /follow|doctor|dr\.|consult/i.test(t.title) ? "doctor" : /vaccin/i.test(t.title) ? "calendar" : "test-tube";
  return KIND_3D[t.kind] ?? PILLAR_3D[t.pillar];
}

/**
 * A light Apple-style glass card: a see-through tint, a bright white rim
 * catching the light, and a soft coloured shadow. Flat, never a gradient.
 */
export function glassCard(tint: string, shadow = "#3b2bc9") {
  return {
    backgroundColor: tint,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    shadowColor: shadow,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  } as const;
}

/** The thin highlight along a glass card's top edge. */
export const GLASS_SHEEN = { position: "absolute", top: 0, left: 18, right: 18, height: 1.5, borderRadius: 1, backgroundColor: "rgba(255,255,255,0.95)" } as const;
