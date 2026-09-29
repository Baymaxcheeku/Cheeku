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
} as const;

export const radius = { card: 24, tile: 16, sheet: 28, pill: 999 } as const;

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
