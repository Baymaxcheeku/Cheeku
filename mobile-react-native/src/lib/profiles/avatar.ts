import { createAvatar } from "@dicebear/core";
import { micah } from "@dicebear/collection";

import { allFaceIds, catalogFace, derivedFace } from "./faces";

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
/**
 * Traits, when a face must depict a specific KIND of person.
 *
 * Real profiles never pass this — their faces are derived from an id and
 * nothing else, because choosing features for a person the app has never met
 * would be the app deciding what they look like. The illustrated cast is the
 * one place where the choice is ours to make, and it has to be made: left to
 * the seed alone, three of the six came back as bald men, which is not a
 * picture of "everyone you look after".
 */
export type FaceTraits = {
  hair?: readonly string[];
  hairColor?: readonly string[];
  baseColor?: readonly string[];
  facialHairProbability?: number;
  facialHair?: readonly string[];
  glassesProbability?: number;
  glasses?: readonly string[];
  earringsProbability?: number;
  mouth?: readonly string[];
  eyes?: readonly string[];
  shirt?: readonly string[];
  shirtColor?: readonly string[];
};

export function faceSvg(seed: string, background: string, traits: FaceTraits = {}): string {
  return createAvatar(micah, {
    seed,
    size: 96,
    scale: 88,
    ...(traits as Record<string, never>),
    /*
     * NO `radius`. DiceBear's radius rounds the BACKGROUND inside a square
     * viewBox, so the corners come back transparent — and every caller clips
     * the face to a circle anyway, which let the container's white show
     * through as crescents around the edge. A full-bleed square background
     * plus our own circular clip produces a clean disc with nothing behind it.
     */
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

/*
 * THE PICKER'S CATALOGUE.
 *
 * A face derived from a uuid is a coin toss, so a man setting up his own
 * profile could be handed a woman's face and no way out of it. These are the
 * faces somebody can choose instead, and each one's traits are pinned rather
 * than left to the seed for exactly the reason the picker exists.
 *
 * WHAT THIS IS NOT. Not a gender question, and never labelled as one. Nothing
 * here is called "male" or "female", nothing is grouped, and the order is
 * arbitrary — a person picks the drawing that looks like them and the app
 * learns nothing from it beyond which PNG-equivalent to draw. `profiles.sex`
 * is asked once, plainly, on the profile form where it is a health field.
 *
 * The id is what gets stored, so a face survives the catalogue being extended.
 * Reordering this array is safe; renaming an id is not.
 */

export type AvatarPick = { id: string; svg: string; background: string };

/**
 * Every choosable face, in catalogue order (life stage by life stage). The
 * catalogue itself lives in faces.ts; a face stored before 2026-09-30 (the old
 * "p" ids) still resolves through faces.ts LEGACY.
 */
export function avatarPicks(): AvatarPick[] {
  return allFaceIds().map((id) => {
    const f = catalogFace(id) as NonNullable<ReturnType<typeof catalogFace>>;
    return { id: f.id, svg: f.svg, background: f.background };
  });
}

export function generatedAvatar(profileId: string, index: number): GeneratedAvatar {
  /*
   * A chosen face wins over a derived one. `profileId` here is whatever the
   * caller had: a stored `avatar_seed` if the person picked (old "p" ids
   * included), otherwise the profile id.
   */
  const picked = catalogFace(profileId);
  if (picked) return { svg: picked.svg, background: picked.background };

  const background = BACKGROUNDS[index % BACKGROUNDS.length] as (typeof BACKGROUNDS)[number];
  return derivedFace(profileId, background);
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
/*
 * Six people, and each one's traits are pinned.
 *
 * The order matters: the carousel shows the first three, so those three carry
 * the diversity on their own — a woman, a man and a girl, across three skin
 * tones — rather than relying on a viewer scrolling to find themselves. The
 * app ships worldwide; a row of interchangeable faces tells a reader in Lagos,
 * São Paulo or Kochi that it was drawn for somebody else.
 */
const CAST = [
  {
    seed: "baymax-cast-mother",
    background: "d1d4f9",
    traits: {
      hair: ["full"],
      hairColor: ["2c1b18"],
      baseColor: ["ac6651"],
      facialHairProbability: 0,
      earringsProbability: 100,
      glassesProbability: 0,
    },
  },
  {
    seed: "baymax-cast-father",
    background: "ffd5dc",
    traits: {
      hair: ["fonze"],
      hairColor: ["000000"],
      baseColor: ["77311d"],
      facialHair: ["beard"],
      facialHairProbability: 100,
      earringsProbability: 0,
      glassesProbability: 0,
    },
  },
  {
    seed: "baymax-cast-daughter",
    background: "b6e3f4",
    traits: {
      hair: ["pixie"],
      hairColor: ["6a4e35"],
      baseColor: ["f9c9b6"],
      facialHairProbability: 0,
      earringsProbability: 0,
      glassesProbability: 0,
    },
  },
  {
    seed: "baymax-cast-grandmother",
    background: "d7f0e0",
    traits: {
      hair: ["dannyPhantom"],
      hairColor: ["b0b0b0"],
      baseColor: ["f9c9b6"],
      facialHairProbability: 0,
      earringsProbability: 100,
      glasses: ["round"],
      glassesProbability: 100,
    },
  },
  {
    seed: "baymax-cast-son",
    background: "ffdfbf",
    traits: {
      hair: ["dougFunny"],
      hairColor: ["2c1b18"],
      baseColor: ["ac6651"],
      facialHairProbability: 0,
      earringsProbability: 0,
      glassesProbability: 0,
    },
  },
  {
    seed: "baymax-cast-partner",
    background: "c0aede",
    traits: {
      hair: ["turban"],
      hairColor: ["000000"],
      baseColor: ["77311d"],
      facialHair: ["beard"],
      facialHairProbability: 100,
      earringsProbability: 0,
      glassesProbability: 0,
    },
  },
] as const;

/** `count` stand-in faces, in a stable order. */
export function castFaces(count: number): string[] {
  return Array.from({ length: Math.min(count, CAST.length) }, (_, i) => {
    const member = CAST[i % CAST.length] as (typeof CAST)[number];
    return faceSvg(member.seed, member.background, member.traits);
  });
}
