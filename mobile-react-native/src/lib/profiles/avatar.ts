import { createAvatar } from "@dicebear/core";
import { micah } from "@dicebear/collection";

/*
 * Generated profile pictures.
 *
 * The frames give every family member a distinct illustrated face. Shipping
 * initials instead looked fine in a mockup and fell apart on the real seed
 * family — Athar, Ananya and Amma all render as "A", so the switcher became
 * three identical circles and the one question the row has to answer, "whose
 * health am I looking at", could not be answered at a glance.
 *
 * Properties that matter here:
 *
 *  - DETERMINISTIC from the profile id. The same person keeps the same face
 *    across devices, sessions and screenshots, with nothing stored.
 *  - GENERATED ON DEVICE. No request leaves the device to fetch a face, so
 *    nobody's family composition is inferable from an avatar CDN's logs.
 *  - Seeded on the id, never the name. Seeding on the name would leak a
 *    person's name into the rendered output's identity and change their face
 *    if a typo were corrected.
 *
 * `micah` was chosen over the warmer 3D-looking styles because it is the one
 * that still frames a whole head at 48px, which is the size this actually
 * renders at. The frames' avatars are 3D renders of specific people; no
 * generator reproduces those, and this is the honest approximation.
 */

/** Soft backgrounds, cycled by position. Deliberately not the semantic hues. */
const BACKGROUNDS = ["d1d4f9", "ffd5dc", "c0aede", "b6e3f4", "ffdfbf", "d7f0e0"] as const;

export type GeneratedAvatar = { svg: string; background: string };

/**
 * THE avatar renderer. Every face in the app comes through here.
 *
 * It is exported so nothing else re-implements `createAvatar` with its own
 * style or sizing — that happened once (the onboarding cluster had its own
 * copy) and the two drifted, which is exactly how an app ends up with two
 * different-looking sets of people in it.
 */
export function faceSvg(seed: string, background: string): string {
  return createAvatar(micah, {
    seed,
    size: 96,
    scale: 88,
    radius: 50,
    backgroundColor: [background],
  }).toString();
}

/*
 * PORT NOTE. The web build returned a base64 `data:` URI because an <img> src
 * needs one. React Native has no `Buffer` and no <img>; faces render through
 * `react-native-svg`'s SvgXml, which takes the markup directly. Returning raw
 * SVG also skips a base64 round trip per face, and the switcher draws several
 * at once.
 */

export function generatedAvatar(profileId: string, index: number): GeneratedAvatar {
  // `as const` makes the modulo index provably in range, so this needs no
  // fallback and no assertion — noUncheckedIndexedAccess is satisfied.
  const background = BACKGROUNDS[index % BACKGROUNDS.length] as (typeof BACKGROUNDS)[number];

  return { svg: faceSvg(profileId, background), background: `#${background}` };
}

/*
 * Faces that stand for nobody.
 *
 * Used where the app needs to *depict* a family rather than show one: the
 * onboarding illustration, the value carousel, and the locked slots in the
 * Family upsell. They must come from the same generator as real profiles or the
 * app ends up with two visual species of person in it — which is the bug this
 * whole module now exists to prevent.
 *
 * Fixed seeds, so the illustrated family is the same people on every screen and
 * every render. And deliberately NOT anyone's real avatar: blurring a genuine
 * member's face to advertise a plan would mean using their data as bait.
 */
const CAST = [
  { seed: "baymax-cast-parent-a", background: "d1d4f9" },
  { seed: "baymax-cast-parent-b", background: "ffd5dc" },
  { seed: "baymax-cast-child", background: "b6e3f4" },
  { seed: "baymax-cast-elder", background: "d7f0e0" },
  { seed: "baymax-cast-teen", background: "ffdfbf" },
  { seed: "baymax-cast-partner", background: "c0aede" },
] as const;

/** `count` stand-in faces, in a stable order. */
export function castFaces(count: number): string[] {
  return Array.from({ length: Math.min(count, CAST.length) }, (_, i) => {
    const member = CAST[i % CAST.length] as (typeof CAST)[number];
    return faceSvg(member.seed, member.background);
  });
}
