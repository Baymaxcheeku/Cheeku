import { SvgXml } from "react-native-svg";

import { faceSvg, generatedAvatar } from "@/lib/profiles/avatar";

/*
 * Every face in the app renders through here.
 *
 * The web build inlined a base64 data URI into an <img>. Here the generator
 * returns raw SVG and `SvgXml` takes the markup directly, which also skips a
 * base64 round trip per face — the family switcher draws several at once.
 */

export function Avatar({ profileId, index = 0, size = 48 }: {
  profileId: string;
  index?: number;
  size?: number;
}) {
  const { svg } = generatedAvatar(profileId, index);
  return <SvgXml xml={svg} width={size} height={size} />;
}

/** A stand-in face that depicts nobody. Same generator, fixed seeds. */
export function CastAvatar({ svg, size = 48 }: { svg: string; size?: number }) {
  return <SvgXml xml={svg} width={size} height={size} />;
}

export { faceSvg };
