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
 * TWO FACES, EACH WITH ONE JOB.
 *
 *   Nunito  — display only. Its rounded terminals are the mascot's shape
 *             language set in type, which is what makes a headline feel like
 *             Cheeku is speaking rather than a form. Never used below 18pt,
 *             where the rounding stops reading and starts looking soft.
 *   Inter   — everything a person reads to understand something: body, labels,
 *             buttons, fields. Tuned for screens, and it is what the rest of
 *             the app already uses, so onboarding does not hand over to a
 *             different-looking product at the first screen after it.
 */
export const font = {
  display: "Nunito_900Black",
  displaySoft: "Nunito_800ExtraBold",
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
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
  hero: { fontFamily: font.display, fontSize: 32, lineHeight: 36, letterSpacing: -0.8, color: ink[900] },
  title: { fontFamily: font.display, fontSize: 27, lineHeight: 31, letterSpacing: -0.5, color: ink[900] },
  heading: { fontFamily: font.displaySoft, fontSize: 19, lineHeight: 24, letterSpacing: -0.2, color: ink[900] },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: ink[500] },
  bodySmall: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: ink[500] },
  label: { fontFamily: font.semibold, fontSize: 14, lineHeight: 19, color: ink[900] },
  caption: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: ink[500] },
  eyebrow: { fontFamily: font.bold, fontSize: 11, lineHeight: 14, letterSpacing: 1.2, textTransform: "uppercase" },
  button: { fontFamily: font.bold, fontSize: 16, lineHeight: 20, color: "#ffffff" },
} satisfies Record<string, TextStyle>;
