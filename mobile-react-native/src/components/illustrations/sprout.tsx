import { Cheeku, CheekuMark, type Move, type Moment } from "@/components/mascot/lottie";

/*
 * The mascot's two framings, kept under their old names so every screen
 * picked up the animated Cheeku at once.
 *
 * The Lottie character (components/mascot/lottie.tsx) has eleven moments.
 * Screens can name one directly (`moment`) and add whole-body motion
 * (`move`, `flip`, `hop`), or keep describing what they want in words (a
 * mood, a pose, a motion), which this file turns into a moment:
 *
 *   hello      greet: waves once, then glances about (the default)
 *   idle       calm, waiting, the app lock
 *   present    "here you go", "just tell me", help
 *   shrug      nothing here yet, not sure
 *   celebrate  booked, bought, sent (jumps once, then arms up)
 *   cheer      a quieter celebration, arms up
 *   working    reading a report, typing, scanning
 *   think      mulling it over, deciding
 *   worried    something failed
 *   joy        filed, done, all good
 *   wave       waving on a loop (the welcome carousel only)
 *
 * Nothing is ever frozen: calm requests get idle with a slow float, and small
 * marks (chat, bubbles) are a moving face. Only Reduce motion shows stills.
 */

export type Mood = "happy" | "calm" | "curious" | "reassuring" | "thinking" | "sleepy";
export type Pose = "stand" | "wave" | "sit" | "heart" | "listen" | "curl" | "phone";
export type Motion = "idle" | "bounce" | "hop" | "wave" | "breathe" | "none";

type Props = {
  size?: number;
  mood?: Mood;
  pose?: Pose;
  motion?: Motion;
  glow?: boolean;
  interactive?: boolean;
  quiet?: boolean;
  /** Name the moment directly; wins over mood, pose and motion. */
  moment?: Moment;
  move?: Move;
  flip?: boolean;
  /** Hop when tapped. */
  hop?: boolean;
};

export function momentFor(mood: Mood = "happy", pose: Pose = "stand", motion?: Motion): Moment {
  if (pose === "heart" || motion === "hop") return "celebrate";
  if (pose === "phone") return "working";
  if (mood === "thinking") return "think";
  if (pose === "wave" || motion === "wave") return "hello";
  if (pose === "curl" || mood === "sleepy") return "idle";
  if (pose === "listen" || mood === "curious") return "shrug";
  if (mood === "reassuring") return "present";
  return "hello";
}

/*
 * NOTHING STANDS STILL. A "calm" or "breathe" request used to show a frozen
 * frame; now it gets the quiet version instead: idle, floating slowly. Only
 * Reduce motion (handled inside the mascot) ever sees a still.
 */
const isCalm = (mood?: Mood, motion?: Motion) => motion === "none" || motion === "breathe" || mood === "calm";

/** Head and shoulders, for avatars, card corners and speech bubbles. */
export function MascotBust({ size = 148, mood = "happy", pose = "stand", motion, moment, move }: Props) {
  const calm = isCalm(mood, motion);
  return <CheekuMark size={size} moment={moment ?? (calm ? "idle" : momentFor(mood, pose, motion))} move={move ?? (calm ? "float" : undefined)} />;
}

/** The whole character. `size` is its height on screen. */
export function MascotFigure({ size = 200, wave = false, mood = "happy", pose, motion, moment, move, flip, hop }: Props & { wave?: boolean }) {
  const calm = isCalm(mood, motion);
  const m = moment ?? (calm ? "idle" : momentFor(mood, pose ?? (wave ? "wave" : "stand"), motion ?? (wave ? "wave" : undefined)));
  return <Cheeku moment={m} size={size} move={move ?? (calm ? "float" : undefined)} flip={flip} hop={hop} />;
}
