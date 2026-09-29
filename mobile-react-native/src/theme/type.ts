import type { TextStyle } from "react-native";

import { ink } from "@/theme/tokens";

/*
 * Type, by family name rather than by weight.
 *
 * WHY EVERY STYLE NAMES A FAMILY. A custom font on iOS is registered under its
 * own name ("Inter_700Bold"), not as a weight of a family called "Inter". So
 * `fontFamily: "Inter_400Regular"` plus `fontWeight: "700"` does not pick the
 * bold file on device: React Native looks for a bold variant of a family that
 * has none, and either fakes it or ignores the weight. The web preview hides
 * this, because browsers synthesise weights. Naming the exact file is the only
 * form that renders the same everywhere.
 *
 * ONE FACE. Inter throughout, headlines included, so onboarding looks like the
 * product it leads into. Headlines are SemiBold (600), not Bold: a rounded
 * Nunito Black was tried on 2026-09-29 and read as shouting, and Bold at 32pt
 * does the same thing more quietly. The weight step from body (400) to headline
 * (600) plus tight tracking is enough hierarchy on its own.
 */
export const font = {
  display: "Inter_600SemiBold",
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  /** Only for Home's editorial accent line. */
  italic: "Inter_500Medium_Italic",
} as const;

/*
 * The scale. Line heights are set per size rather than as a ratio: display type
 * wants to be tight (1.12) and body wants air (1.5), and one multiplier cannot
 * serve both.
 *
 * Negative tracking only on display sizes. Large type reads loose at the
 * default; the same value on 14pt body costs legibility.
 */
export const type = {
  hero: { fontFamily: font.display, fontSize: 31, lineHeight: 37, letterSpacing: -0.9, color: ink[900] },
  title: { fontFamily: font.display, fontSize: 27, lineHeight: 32, letterSpacing: -0.7, color: ink[900] },
  heading: { fontFamily: font.display, fontSize: 19, lineHeight: 24, letterSpacing: -0.3, color: ink[900] },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: ink[500] },
  bodySmall: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: ink[500] },
  label: { fontFamily: font.semibold, fontSize: 14, lineHeight: 19, color: ink[900] },
  caption: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: ink[500] },
  eyebrow: { fontFamily: font.bold, fontSize: 11, lineHeight: 14, letterSpacing: 1.2, textTransform: "uppercase" },
  button: { fontFamily: font.bold, fontSize: 16, lineHeight: 20, color: "#ffffff" },
} satisfies Record<string, TextStyle>;
