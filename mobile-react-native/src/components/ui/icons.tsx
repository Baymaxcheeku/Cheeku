import { Butterfly } from "phosphor-react-native/src/icons/Butterfly";
import { FlowerLotus } from "phosphor-react-native/src/icons/FlowerLotus";
import { ListMagnifyingGlass } from "phosphor-react-native/src/icons/ListMagnifyingGlass";
import { Notebook } from "phosphor-react-native/src/icons/Notebook";
import { Waveform } from "phosphor-react-native/src/icons/Waveform";
import { Wind } from "phosphor-react-native/src/icons/Wind";
import type { ComponentType } from "react";
import type { StyleProp, ViewStyle } from "react-native";

/*
 * ICONS FROM A SECOND FAMILY, ON PURPOSE.
 *
 * Most of the app draws with Lucide. A few ideas looked wrong in it: the
 * brain in particular, which on a health app reads as "AI" before it reads as
 * anything about the person. These come from Phosphor instead, whose softer,
 * rounder drawing suits calm and care, and each one says what it means:
 *
 *   MindIcon       a lotus: calm, the Mind pillar, not a brain
 *   BreathIcon     wind: the breathing timer
 *   MemoryIcon     a notebook: what Cheeku has written down about someone
 *   ReadsIcon      a list under a lens: reading against their own records
 *   WellbeingIcon  a butterfly, the old symbol of the psyche: mental health
 *   NerveIcon      a waveform: nerves and the brain's signals, for neurology
 *
 * Each icon is imported from its own file. Importing the package root would
 * put every Phosphor icon, in six weights, into the bundle.
 *
 * They take Lucide's props (size, color, strokeWidth), so they drop into any
 * place a Lucide icon goes. Phosphor's regular weight draws at about 1.5 px
 * where Lucide's default is 2, so Lucide's normal stroke maps to Phosphor's
 * bold and only a deliberately thin one (under 1.6) to regular. Side by
 * side, the two families then carry the same weight.
 */

type Props = { size?: number; color?: string; strokeWidth?: number; style?: StyleProp<ViewStyle> };

/** Any icon the app draws, Lucide or Phosphor: what a screen may pass to one. */
export type AppIcon = ComponentType<Props>;
type PhosphorIcon = typeof FlowerLotus;

function wrap(Icon: PhosphorIcon, name: string) {
  function Wrapped({ size = 24, color, strokeWidth = 2, style }: Props) {
    return <Icon size={size} color={color} weight={strokeWidth >= 1.6 ? "bold" : "regular"} style={style} />;
  }
  Wrapped.displayName = name;
  return Wrapped;
}

export const MindIcon = wrap(FlowerLotus, "MindIcon");
export const BreathIcon = wrap(Wind, "BreathIcon");
export const MemoryIcon = wrap(Notebook, "MemoryIcon");
export const ReadsIcon = wrap(ListMagnifyingGlass, "ReadsIcon");
export const WellbeingIcon = wrap(Butterfly, "WellbeingIcon");
export const NerveIcon = wrap(Waveform, "NerveIcon");
