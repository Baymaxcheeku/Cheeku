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
 *  - GENERATED ON THE SERVER and inlined as a data URI. No request leaves the
 *    device to fetch a face, so nobody's family composition is inferable from
 *    an avatar CDN's logs.
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

export type GeneratedAvatar = { dataUri: string; background: string };

export function generatedAvatar(profileId: string, index: number): GeneratedAvatar {
  // `as const` makes the modulo index provably in range, so this needs no
  // fallback and no assertion — noUncheckedIndexedAccess is satisfied.
  const background = BACKGROUNDS[index % BACKGROUNDS.length] as (typeof BACKGROUNDS)[number];

  const svg = createAvatar(micah, {
    seed: profileId,
    size: 96,
    scale: 88,
    radius: 50,
    backgroundColor: [background],
  }).toString();

  /*
   * base64 rather than a raw `data:image/svg+xml,` URI: the SVG contains `#`
   * and `<`, which have to be percent-encoded, and getting that subtly wrong
   * fails silently as a broken image in exactly one browser.
   */
  return {
    dataUri: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
    background: `#${background}`,
  };
}
