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
  /*
   * "class", not the default "media".
   *
   * This app is light-only: `app.json` pins `userInterfaceStyle: "light"`
   * because every screen is composed against the sampled light palette and a
   * medical record rendered in an unreviewed dark theme is worse than no dark
   * theme. Leaving NativeWind on "media" makes it follow the OS and then throw
   * "Cannot manually set color scheme, as dark mode is type 'media'" when
   * anything pins the scheme. With "class" the dark variants simply never fire.
   */
  darkMode: "class",
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
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
        },
        canvas: "#f2f2f4",
        surface: "#ffffff",
        "surface-tint": "#f5f5f7",
        ink: {
          900: "#111114",
          700: "#3a3a41",
          500: "#6d6d78",
          300: "#a1a1ab",
        },
        line: "#e6e6ea",

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
        attention: "#e8590c",
        "attention-bg": "#fff0e6",
        "attention-text": "#a63a08",
      },
      /*
       * The radius scale (UI audit, October 2026): 42 values became five plus
       * a pill. Card 24 since the 2026-09-29 redesign; sheets moved 28 to 32
       * to land on the scale. Six and under stays free for hairline geometry
       * (bars, dots). Mirrors `radius` in tokens.ts.
       */
      borderRadius: {
        sm: 8,
        md: 12,
        lg: 16,
        xl: 24,
        "2xl": 32,
        card: 24,
        tile: 16,
        sheet: 32,
        pill: 999,
      },
      /*
       * The type scale (UI audit, October 2026): 56 sizes became ten.
       * 3xs is for counters and chart ticks only; display sizes (36 and up)
       * stay inline. Plain sizes, no line height, so a class never changes
       * the leading a screen already set. Mirrors `type` in tokens.ts.
       */
      fontSize: {
        "3xs": "10px",
        "2xs": "11px",
        xs: "12px",
        sm: "13px",
        base: "15px",
        lg: "17px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "28px",
        "4xl": "34px",
      },
      fontFamily: {
        sans: ["Inter_400Regular"],
      },
    },
  },
  plugins: [],
};
