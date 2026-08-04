/*
 * Design tokens, ported 1:1 from the web app's `src/app/globals.css`.
 *
 * The values there were SAMPLED from the approved design frames, not invented,
 * so they are the source of truth for both apps. If a token changes on one
 * side it must change on the other; there is no shared build step to enforce
 * that, so the mapping is kept literal and alphabetical to make a diff obvious.
 *
 * SEMANTIC COLOUR IS RESERVED. `safe`, `caution` and `danger` carry HEALTH
 * MEANING only. They are never a button, never a category tint, never
 * decoration. This rule was broken twice in the web app and caught both times.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
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
        },
        canvas: "#fafafe",
        surface: "#ffffff",
        "surface-tint": "#f6f6fe",
        ink: {
          900: "#0f1030",
          700: "#3a3b57",
          500: "#6b6c8a",
          300: "#9696ae",
        },
        line: "#e8e8f4",

        /* Health status only. Never decorative. */
        safe: "#23af5f",
        "safe-bg": "#e7f7ee",
        "safe-text": "#0f7538",
        caution: "#ffaf23",
        "caution-bg": "#fff4e0",
        "caution-text": "#8f5400",
        danger: "#ea2a36",
        "danger-strong": "#e10a1e",
        "danger-bg": "#fef1f3",
        "danger-text": "#c00a1c",
      },
      borderRadius: {
        card: 20,
        tile: 16,
        sheet: 28,
        pill: 999,
      },
      fontFamily: {
        sans: ["Inter_400Regular"],
        semibold: ["Inter_600SemiBold"],
        bold: ["Inter_700Bold"],
      },
    },
  },
  plugins: [],
};
