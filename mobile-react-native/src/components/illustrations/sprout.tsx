import { Cheeku, CheekuMark, type Moment } from "@/components/mascot/lottie";

/*
 * The mascot's two framings, kept under their old names so every screen
 * picked up the animated Cheeku at once.
 *
 * REPLACED 2026-10-05 by the Lottie character (components/mascot/lottie.tsx),
 * recoloured into the brand lilac. Screens still describe what they want in
 * words (a mood, a pose, a motion), and this file turns that into one of the
 * four animations:
 *
 *   wave       greet, welcome, sign in, chat start, Home, About
 *   working    thinking, typing, reading a report, scanning
 *   celebrate  booked, bought, sent, confirmed
 *   shrug      empty states, "not sure", Help, permission asks
 *
 * Calm and still requests show a still frame: chat marks (one per message),
 * the app lock, anything that should not compete with what's on screen.
 */

export type Mood = "happy" | "calm" | "curious" | "reassuring" | "thinking" | "sleepy";
export type Pose = "stand" | "wave" | "sit" | "heart" | "listen" | "curl" | "phone";
export type Motion = "idle" | "bounce" | "hop" | "wave" | "breathe" | "none";

type Props = { size?: number; mood?: Mood; pose?: Pose; motion?: Motion; glow?: boolean; interactive?: boolean; quiet?: boolean };

export function momentFor(mood: Mood = "happy", pose: Pose = "stand", motion?: Motion): Moment {
  if (pose === "heart" || motion === "hop") return "celebrate";
  if (pose === "phone" || mood === "thinking") return "working";
  if (pose === "wave" || motion === "wave") return "wave";
  if (pose === "listen" || pose === "curl" || mood === "curious" || mood === "sleepy") return "shrug";
  return "wave";
}

const isStill = (mood?: Mood, motion?: Motion) => motion === "none" || motion === "breathe" || mood === "calm";

/** Head and shoulders, for avatars, card corners and speech bubbles. */
export function MascotBust({ size = 148, mood = "happy", pose = "stand", motion }: Props) {
  return <CheekuMark size={size} moment={momentFor(mood, pose, motion)} animate={!isStill(mood, motion)} />;
}

/** The whole character. `size` is its height on screen. */
export function MascotFigure({ size = 200, wave = false, mood = "happy", pose, motion }: Props & { wave?: boolean }) {
  const moment = momentFor(mood, pose ?? (wave ? "wave" : "stand"), motion ?? (wave ? "wave" : undefined));
  return <Cheeku moment={moment} size={size} animate={!isStill(mood, motion)} />;
}
