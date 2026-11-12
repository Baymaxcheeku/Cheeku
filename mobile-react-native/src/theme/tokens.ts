/*
 * Tokens as values, for the places NativeWind classes cannot reach.
 *
 * Needed by: react-native-svg (fills take colour props, not classes), shadow
 * objects, Reanimated interpolations, and status-bar config. Kept in sync with
 * `tailwind.config.js` by hand — same rule as the web app, same reason.
 */

export const brand = {
  50: "#f5f5f7",
  100: "#ebebef",
  200: "#dcdce2",
  300: "#c4c4cc",
  400: "#8a82f5",
  500: "#5b4ef0",
  600: "#4a2ade",
  700: "#3b2bc9",
  800: "#2a1eba",
  900: "#14136b",
  950: "#0a0a3c",
} as const;

export const ink = {
  900: "#111114",
  700: "#3a3a41",
  500: "#6d6d78",
  300: "#a1a1ab",
} as const;

export const surface = {
  canvas: "#f2f2f4",
  base: "#ffffff",
  tint: "#f5f5f7",
  line: "#e6e6ea",
} as const;

/** HEALTH MEANING ONLY. Never a button, never a category tint. */
export const semantic = {
  safe: "#23af5f",
  safeBg: "#e7f7ee",
  safeText: "#0f7538",
  caution: "#ffaf23",
  cautionBg: "#fff4e0",
  cautionText: "#8f5400",
  danger: "#ea2a36",
  dangerStrong: "#e10a1e",
  dangerBg: "#fef1f3",
  dangerText: "#c00a1c",
  // "Ask your doctor": firmer than caution, calmer than danger. Red is kept
  // for "go now" (UI audit, October 2026).
  attention: "#e8590c",
  attentionBg: "#fff0e6",
  attentionText: "#a63a08",
} as const;

/*
 * NEUTRAL REDESIGN (November 2026). The app is a grey-white canvas, flat
 * white cards, ink for actions and brand violet as the ONE accent (selection,
 * progress, links, ticks). So the category accents below no longer carry a
 * colour: every hue resolves to the same quiet neutral, and a category is told
 * apart by its icon and its words. The keys stay so call sites need no change.
 */
const N = { fg: "#3a3a41", bg: "#ededf0", wash: "#f5f5f7" } as const;

/*
 * Category accents (UI audit, October 2026). About 150 one-off hex values
 * collapsed onto these: a record type, a service, a notification kind or a
 * journey picks a hue so it is recognisable at a glance. fg is for icons and
 * small text on bg; wash is the faintest fill. NOT health meaning (that is
 * `semantic`), and never a button (that is brand).
 */
export const hue = {
  orange: { fg: N.fg, bg: N.bg, wash: N.wash },
  blue: { fg: N.fg, bg: N.bg, wash: N.wash },
  rose: { fg: N.fg, bg: N.bg },
  plum: { fg: N.fg, bg: N.bg },
  teal: { fg: N.fg, bg: N.bg },
  // The insurance card: ink to a lifted ink, the one dark card in the app.
  ocean: { fg: "#17171b", bg: N.bg, mid: "#2c2c33" },
  indigo: { fg: N.fg },
  slate: { fg: N.fg, bg: N.bg },
  lime: { fg: N.fg, bg: N.bg },
} as const;

/** Once lavender gradient stops. Neutral now, so a gradient built from them reads as a flat fill. */
export const lilac = {
  base: "#f2f2f4",
  mist: "#f7f7f9",
  violet: "#ececef",
  deep: "#e3e3e8",
} as const;

/*
 * The type scale (UI audit, October 2026). Every fontSize in the app is one
 * of these, or 36 and up for a display number. `tiny` is for counters inside
 * badges and chart ticks only. Ties went up at body sizes (easier to read) and
 * down at title sizes (no new wrapping). ESLint warns on anything else.
 */
export const type = {
  tiny: 10,
  micro: 11,
  caption: 12,
  footnote: 13,
  body: 15,
  callout: 17,
  title3: 20,
  title2: 24,
  title1: 28,
  large: 34,
} as const;

/** The radius scale. Six and under is free for hairline geometry. */
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, card: 24, tile: 16, sheet: 32, pill: 999 } as const;

/*
 * Elevation. iOS reads the shadow* fields, Android only reads `elevation`, so
 * both are set. The web app's e1/e2 are the reference values.
 */
export const shadow = {
  // Flat since the neutral redesign: a card is white on a grey canvas and
  // needs no lift. e1 is a whisper so white still separates from white.
  e1: {
    shadowColor: "#000000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 0,
  },
  // Only for things that really float: sheets, the tab bar, toasts.
  e2: {
    shadowColor: "#000000",
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

/** The web app's `--ease-settle`, as Reanimated bezier args. */
export const EASE_SETTLE = [0.22, 1, 0.36, 1] as const;

export const duration = { tap: 150, sheet: 250, screen: 400 } as const;
