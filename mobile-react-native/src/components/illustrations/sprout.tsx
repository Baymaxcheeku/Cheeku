import { Cheeku, CheekuBust, type Mood, type Motion, type Pose } from "@/components/mascot/cheeku";

/*
 * The mascot's two framings, kept under their old names so every screen
 * picked up the new character at once.
 *
 * REPLACED 2026-10-05 by the Chikoo pebble from the Mascot Playbook
 * (components/mascot/cheeku.tsx): 3D clay shading, six expressions, seven
 * poses and a motion rig. Each screen now says which Cheeku it wants:
 *
 *   greet, welcome, sign in       happy + wave, bounce
 *   chat header, message marks    calm, still (there can be dozens)
 *   reading, typing, scanning     thinking (with a report while a scan reads)
 *   help, permission asks         listen, curious
 *   booked, bought, confirmed     heart, reassuring
 *   empty inbox / nothing due     curl, sleepy
 *   app lock                      calm, slow breathing
 */

export type { Mood, Motion, Pose };

type Props = { size?: number; mood?: Mood; pose?: Pose; motion?: Motion; glow?: boolean; interactive?: boolean; quiet?: boolean };

/** Head and shoulders, for avatars, card corners and speech bubbles. */
export function MascotBust({ size = 148, mood = "happy", pose = "stand", motion, glow, interactive, quiet }: Props) {
  // Small marks repeat down a thread: they stay still unless asked to move.
  return <CheekuBust size={size} mood={mood} pose={pose} motion={motion ?? (size >= 56 ? "idle" : "none")} glow={glow} interactive={interactive ?? size >= 72} quiet={quiet} />;
}

/** The whole character, standing on the ground with its shadow. */
export function MascotFigure({ size = 200, wave = false, mood = "happy", pose, motion, glow, interactive = true, quiet }: Props & { wave?: boolean }) {
  return <Cheeku size={size} mood={mood} pose={pose ?? (wave ? "wave" : "stand")} motion={motion ?? (wave ? "wave" : "idle")} glow={glow} interactive={interactive} quiet={quiet} />;
}
