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
 * Calm and still requests show a still frame: chat marks (one per message),
 * anything that should not compete with what's on screen.
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

const isStill = (mood?: Mood, motion?: Motion) => motion === "none" || motion === "breathe" || mood === "calm";

/** Head and shoulders, for avatars, card corners and speech bubbles. */
export function MascotBust({ size = 148, mood = "happy", pose = "stand", motion, moment, move }: Props) {
  return <CheekuMark size={size} moment={moment ?? momentFor(mood, pose, motion)} animate={!isStill(mood, motion)} move={move} />;
}

/** The whole character. `size` is its height on screen. */
export function MascotFigure({ size = 200, wave = false, mood = "happy", pose, motion, moment, move, flip, hop }: Props & { wave?: boolean }) {
  const m = moment ?? momentFor(mood, pose ?? (wave ? "wave" : "stand"), motion ?? (wave ? "wave" : undefined));
  return <Cheeku moment={m} size={size} animate={!isStill(mood, motion)} move={move} flip={flip} hop={hop} />;
}
