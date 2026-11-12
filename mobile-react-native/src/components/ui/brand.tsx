import { Children, Fragment, isValidElement, type ReactNode } from "react";
import { Text, type TextStyle } from "react-native";

import { lilac } from "@/theme/tokens";

/*
 * THE WORDMARK.
 *
 * Wherever the product names itself, "Cheeku" or "Cheeku AI" is set in
 * Instrument Serif Italic and brand violet. A single classic italic among
 * all the Inter reads like a logotype: it is how the name gets remembered
 * across a hundred screens without a logo on any of them.
 *
 * Nested inside the surrounding <Text>, so it inherits the size and flows
 * with the sentence. The serif sits a touch small beside Inter at the same
 * point size, so a `size` can be given where the line is set large.
 *
 * `onDark` swaps to a light violet for text on the ink and violet buttons,
 * where brand violet would vanish.
 *
 * NEUTRAL REDESIGN (November 2026): inside a sentence the name is now set in
 * the sentence's own face and colour. A violet serif italic in the middle of
 * every other line was one more thing competing for the eye. The serif
 * wordmark lives where the product signs itself: onboarding and About.
 */
export const BRAND_ON_DARK = lilac.deep;

export function Brand({ ai = false, onDark = false, size, style }: { ai?: boolean; onDark?: boolean; size?: number; style?: TextStyle }) {
  return (
    <Text style={[size ? { fontSize: size } : null, style]}>
      {ai ? "Cheeku AI" : "Cheeku"}
    </Text>
  );
}

const PATTERN = /(Cheeku(?:\.| )?AI|Cheeku)/g;

/**
 * Wordmarks every "Cheeku" / "Cheeku AI" inside a string (or an array of
 * strings and elements). For shared components whose text arrives as a prop.
 */
export function brandify(node: ReactNode, opts: { onDark?: boolean; size?: number } = {}): ReactNode {
  if (typeof node === "string") {
    if (!node.includes("Cheeku")) return node;
    return node.split(PATTERN).map((part, i) =>
      part === "Cheeku" ? (
        <Brand key={i} onDark={opts.onDark} size={opts.size} />
      ) : /^Cheeku(?:\.| )?AI$/.test(part) ? (
        <Brand key={i} ai onDark={opts.onDark} size={opts.size} />
      ) : (
        <Fragment key={i}>{part}</Fragment>
      ),
    );
  }
  if (Array.isArray(node)) return Children.map(node, (n) => (isValidElement(n) ? n : brandify(n, opts)));
  return node;
}
