import { useState } from "react";
import { Image, View, type ImageSourcePropType } from "react-native";
import { SvgXml } from "react-native-svg";

import { faceSvg, generatedAvatar } from "@/lib/profiles/avatar";

/*
 * Every face in the app renders through here.
 *
 * ┌─ WHY THIS OWNS THE FRAME AND NOT JUST THE IMAGE ─────────────────────────┐
 * │                                                                          │
 * │ Call sites used to build their own circle: a View at `size` with a 2pt   │
 * │ border, `overflow: hidden`, and an SvgXml also at `size`. React Native   │
 * │ borders are inside the box, so the content area is `size - 4` — and the  │
 * │ SVG came out 48 WIDE BY 44 TALL. Measured, not guessed. Every ringed     │
 * │ face in the app was non-uniformly squashed and clipped at the chin,      │
 * │ which is what read as "misaligned, with white space in the circle".      │
 * │                                                                          │
 * │ The fix has to live in one place or it comes back the next time somebody │
 * │ adds a ring. The SVG is sized to the CONTENT box, and the container      │
 * │ carries the face's own generated background so a rounding gap can never  │
 * │ show white through the corner.                                           │
 * │                                                                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

const RING_WIDTH = 2;

export function Avatar({
  /** Pre-rendered markup, when the caller already has it on an ActiveProfile. */
  svg,
  /** Or generate from a profile id. */
  profileId,
  index = 0,
  size = 48,
  /** The face's own generated background, so nothing white shows behind it. */
  background,
  /** Omit for no ring. */
  ring,
  /** A signed URL for a real photo. Falls back to the drawn face if it fails to load (an expired link, no signal). */
  photo,
  image,
}: {
  photo?: string | null;
  /** A face from the illustrated set (faces.ts). Drawn when there is no photo. */
  image?: ImageSourcePropType | null;
  svg?: string;
  profileId?: string;
  index?: number;
  size?: number;
  background?: string;
  ring?: string;
}) {
  // Remembers WHICH link failed, not just that one did: a flag alone stuck
  // forever, so after one expired link a newly saved photo never showed.
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  const broken = Boolean(photo) && brokenUrl === photo;
  const generated = svg ? null : generatedAvatar(profileId ?? "", index);
  const markup = svg ?? generated?.svg ?? "";
  const art = image ?? generated?.image ?? null;
  const fill = background ?? generated?.background ?? "transparent";

  // Border-box: a ring eats into the content area, so the face must be drawn
  // at the inside measurement or it distorts to fit.
  const inner = ring ? size - RING_WIDTH * 2 : size;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        overflow: "hidden",
        backgroundColor: fill,
        ...(ring ? { borderWidth: RING_WIDTH, borderColor: ring } : null),
      }}
    >
      {/*
       * The drawn face is always there, and a photo, when there is one, sits on
       * top of it. On iPhone (2026-11-01) the Profile card and its family row
       * showed bare coloured circles: a photo link that never loaded and never
       * errored either left nothing to fall back to. Now the worst case is the
       * person's face from the set instead of an empty circle.
       */}
      {art ? (
        <Image alt="" source={art} style={{ width: inner, height: inner }} accessibilityIgnoresInvertColors />
      ) : markup ? (
        <SvgXml xml={markup} width={inner} height={inner} />
      ) : null}
      {photo && !broken ? (
        <Image
          alt=""
          source={{ uri: photo }}
          style={{ position: "absolute", top: 0, left: 0, width: inner, height: inner, borderRadius: inner / 2 }}
          onError={() => setBrokenUrl(photo ?? null)}
          accessibilityIgnoresInvertColors
        />
      ) : null}
    </View>
  );
}

/** A stand-in face that depicts nobody. Same generator, fixed seeds. */
export function CastAvatar({
  svg,
  size = 48,
  background,
}: {
  svg: string;
  size?: number;
  background?: string;
}) {
  return <Avatar svg={svg} size={size} background={background} />;
}

export { faceSvg };
