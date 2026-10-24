/*
 * Tokens as values, for the places NativeWind classes cannot reach.
 *
 * Needed by: react-native-svg (fills take colour props, not classes), shadow
 * objects, Reanimated interpolations, and status-bar config. Kept in sync with
 * `tailwind.config.js` by hand — same rule as the web app, same reason.
 */

export const brand = {
  50: "#f1f0fe",
  100: "#dcdafb",
  200: "#c6c6f6",
  300: "#aeaeea",
  400: "#8a82f5",
  500: "#5b4ef0",
  600: "#4a2ade",
  700: "#3b2bc9",
  800: "#2a1eba",
  900: "#14136b",
  950: "#0a0a3c",
} as const;

export const ink = {
  900: "#0f1030",
  700: "#3a3b57",
  500: "#6b6c8a",
  300: "#9696ae",
} as const;

export const surface = {
  canvas: "#fafafe",
  base: "#ffffff",
  tint: "#f6f6fe",
  line: "#e8e8f4",
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
 * Category accents (UI audit, October 2026). About 150 one-off hex values
 * collapsed onto these: a record type, a service, a notification kind or a
 * journey picks a hue so it is recognisable at a glance. fg is for icons and
 * small text on bg; wash is the faintest fill. NOT health meaning (that is
 * `semantic`), and never a button (that is brand).
 */
export const hue = {
  orange: { fg: "#c2650b", bg: "#ffe3d3", wash: "#fff5ee" },
  blue: { fg: "#1a6fc2", bg: "#dcecff", wash: "#e6f1fd" },
  rose: { fg: "#c22a6b", bg: "#fdeaf0" },
  plum: { fg: "#b0428a", bg: "#fbe9f5" },
  teal: { fg: "#0e8478", bg: "#e4f5f2" },
  ocean: { fg: "#155e75", bg: "#e0f2f6" },
  indigo: { fg: "#3835a0" },
  slate: { fg: "#5b5580", bg: "#efeff5" },
  lime: { fg: "#2f3d00", bg: "#e4ff7a" },
} as const;

/** The lavender gradient stops behind heroes and glass cards. */
export const lilac = {
  base: "#ece8ff",
  mist: "#f6f3ff",
  violet: "#e3dcff",
  deep: "#d8cffd",
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
  // Softened on 2026-09-29 to match the glass language: wide, faint and
  // violet-tinted rather than tight and grey. Every card in the app uses it.
  e1: {
    shadowColor: "#2a1f6b",
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  e2: {
    shadowColor: "#0f1030",
    shadowOpacity: 0.12,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
} as const;

/** The web app's `--ease-settle`, as Reanimated bezier args. */
export const EASE_SETTLE = [0.22, 1, 0.36, 1] as const;

export const duration = { tap: 150, sheet: 250, screen: 400 } as const;
