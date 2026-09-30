import { createAvatar } from "@dicebear/core";
import { personas } from "@dicebear/collection";

/*
 * The faces people choose from, drawn for the families this app is for.
 *
 * WHY A NEW SET. The first catalogue was ten adults in the `micah` style, which
 * cannot draw a baby, a grandparent or a child at all. The people Cheeku is
 * built around (PROGRESS.md, the ICP) are exactly those: expecting and new
 * parents with a newborn, couples on a fertility journey, grown children
 * caring for a diabetic father, diaspora kids looking after parents in India,
 * urban health optimisers. So the set now runs the whole life course, in the
 * `personas` style, which can: a baby with a pacifier, a toddler in pigtails,
 * a dadi with her grey bun and glasses, a dada going bald.
 *
 * GROUPED BY LIFE STAGE, never by gender. Four groups, because "find someone
 * who looks like Amma" is a question about age first. Nothing is labelled male
 * or female and the app learns nothing from a pick beyond which drawing to
 * show. Skin tones sit in the South Asian range on purpose, and vary.
 *
 * IDS ARE FOREVER. The id is what gets stored in `profiles.avatar_seed`, so a
 * face survives this list being reordered or extended. Never rename one.
 * The old `p1`–`p10` ids still resolve (LEGACY below) to their nearest match
 * here, so nobody's chosen face disappears.
 */

const SKIN = { fair: "e5a07e", wheat: "d78774", brown: "b16a5b", deep: "92594b", dark: "623d36" } as const;
const HAIR = { black: "362c47", brown: "6c4545", grey: "dee1f5" } as const;

type Look = {
  hair: string;
  hairColor: string;
  skin: string;
  eyes: string;
  mouth: string;
  nose: string;
  body: string;
  clothing: string;
  facialHair?: string;
  background: string;
};

export type FaceGroup = "little" | "kids" | "grown" | "elders";

export const FACE_GROUPS: { id: FaceGroup; label: string }[] = [
  { id: "little", label: "Little ones" },
  { id: "kids", label: "Kids" },
  { id: "grown", label: "Grown-ups" },
  { id: "elders", label: "Elders" },
];

const CATALOG: { id: string; group: FaceGroup; look: Look }[] = [
  // Little ones: newborns and babies, for expecting and new parents.
  { id: "f01", group: "little", look: { hair: "bald", hairColor: HAIR.black, skin: SKIN.wheat, eyes: "happy", mouth: "pacifier", nose: "smallRound", body: "rounded", clothing: "f4d150", background: "ffdfbf" } },
  { id: "f02", group: "little", look: { hair: "curly", hairColor: HAIR.black, skin: SKIN.brown, eyes: "open", mouth: "bigSmile", nose: "smallRound", body: "small", clothing: "6dbb58", background: "d7f0e0" } },
  { id: "f03", group: "little", look: { hair: "bald", hairColor: HAIR.black, skin: SKIN.deep, eyes: "sleep", mouth: "smile", nose: "smallRound", body: "rounded", clothing: "54d7c7", background: "b6e3f4" } },

  // Kids.
  { id: "f04", group: "kids", look: { hair: "pigtails", hairColor: HAIR.black, skin: SKIN.brown, eyes: "happy", mouth: "smile", nose: "smallRound", body: "small", clothing: "e8612c", background: "ffd5dc" } },
  { id: "f05", group: "kids", look: { hair: "buzzcut", hairColor: HAIR.black, skin: SKIN.wheat, eyes: "open", mouth: "bigSmile", nose: "smallRound", body: "small", clothing: "456dff", background: "b6e3f4" } },
  { id: "f06", group: "kids", look: { hair: "bobBangs", hairColor: HAIR.black, skin: SKIN.deep, eyes: "open", mouth: "bigSmile", nose: "smallRound", body: "small", clothing: "7555ca", background: "c0aede" } },
  { id: "f07", group: "kids", look: { hair: "curlyHighTop", hairColor: HAIR.black, skin: SKIN.fair, eyes: "happy", mouth: "smile", nose: "smallRound", body: "small", clothing: "54d7c7", background: "d1d4f9" } },

  // Grown-ups: parents, partners, siblings, the diaspora child.
  { id: "f08", group: "grown", look: { hair: "long", hairColor: HAIR.black, skin: SKIN.brown, eyes: "open", mouth: "smile", nose: "smallRound", body: "rounded", clothing: "7555ca", background: "c0aede" } },
  { id: "f09", group: "grown", look: { hair: "shortCombover", hairColor: HAIR.black, skin: SKIN.brown, eyes: "open", mouth: "smile", nose: "mediumRound", body: "squared", clothing: "54d7c7", facialHair: "shadow", background: "d1d4f9" } },
  { id: "f10", group: "grown", look: { hair: "curlyBun", hairColor: HAIR.black, skin: SKIN.wheat, eyes: "happy", mouth: "smile", nose: "smallRound", body: "rounded", clothing: "e8612c", background: "ffd5dc" } },
  { id: "f11", group: "grown", look: { hair: "fade", hairColor: HAIR.black, skin: SKIN.deep, eyes: "open", mouth: "bigSmile", nose: "mediumRound", body: "squared", clothing: "e8e9e6", facialHair: "beardMustache", background: "d7f0e0" } },
  { id: "f12", group: "grown", look: { hair: "bobCut", hairColor: HAIR.brown, skin: SKIN.fair, eyes: "glasses", mouth: "smile", nose: "smallRound", body: "rounded", clothing: "456dff", background: "b6e3f4" } },
  { id: "f13", group: "grown", look: { hair: "buzzcut", hairColor: HAIR.black, skin: SKIN.dark, eyes: "happy", mouth: "smile", nose: "mediumRound", body: "squared", clothing: "f55d81", facialHair: "goatee", background: "ffdfbf" } },
  { id: "f14", group: "grown", look: { hair: "extraLong", hairColor: HAIR.black, skin: SKIN.deep, eyes: "happy", mouth: "lips", nose: "smallRound", body: "rounded", clothing: "6dbb58", background: "d7f0e0" } },
  { id: "f15", group: "grown", look: { hair: "curly", hairColor: HAIR.black, skin: SKIN.wheat, eyes: "glasses", mouth: "smile", nose: "mediumRound", body: "squared", clothing: "f4d150", background: "ffdfbf" } },
  { id: "f16", group: "grown", look: { hair: "straightBun", hairColor: HAIR.black, skin: SKIN.dark, eyes: "open", mouth: "bigSmile", nose: "smallRound", body: "rounded", clothing: "f55d81", background: "ffd5dc" } },
  { id: "f17", group: "grown", look: { hair: "shortComboverChops", hairColor: HAIR.brown, skin: SKIN.brown, eyes: "open", mouth: "smirk", nose: "mediumRound", body: "squared", clothing: "456dff", facialHair: "shadow", background: "d1d4f9" } },

  // Elders: dadi, dada, nani, nana, and the parent being cared for.
  { id: "f18", group: "elders", look: { hair: "straightBun", hairColor: HAIR.grey, skin: SKIN.brown, eyes: "glasses", mouth: "smile", nose: "wrinkles", body: "rounded", clothing: "e8612c", background: "ffd5dc" } },
  { id: "f19", group: "elders", look: { hair: "balding", hairColor: HAIR.grey, skin: SKIN.deep, eyes: "glasses", mouth: "smile", nose: "wrinkles", body: "squared", clothing: "e8e9e6", facialHair: "walrus", background: "d7f0e0" } },
  { id: "f20", group: "elders", look: { hair: "long", hairColor: HAIR.grey, skin: SKIN.wheat, eyes: "happy", mouth: "smile", nose: "wrinkles", body: "rounded", clothing: "7555ca", background: "c0aede" } },
  { id: "f21", group: "elders", look: { hair: "bald", hairColor: HAIR.grey, skin: SKIN.dark, eyes: "glasses", mouth: "smile", nose: "wrinkles", body: "squared", clothing: "456dff", facialHair: "beardMustache", background: "b6e3f4" } },
  { id: "f22", group: "elders", look: { hair: "bobCut", hairColor: HAIR.grey, skin: SKIN.fair, eyes: "glasses", mouth: "smile", nose: "wrinkles", body: "rounded", clothing: "6dbb58", background: "d7f0e0" } },
  { id: "f23", group: "elders", look: { hair: "shortCombover", hairColor: HAIR.grey, skin: SKIN.brown, eyes: "happy", mouth: "smile", nose: "wrinkles", body: "squared", clothing: "f4d150", facialHair: "walrus", background: "ffdfbf" } },
  { id: "f24", group: "elders", look: { hair: "curlyBun", hairColor: HAIR.grey, skin: SKIN.deep, eyes: "happy", mouth: "smile", nose: "wrinkles", body: "rounded", clothing: "54d7c7", background: "d1d4f9" } },
];

/** The first catalogue's ids, pointed at their nearest face in this one. */
const LEGACY: Record<string, string> = {
  p1: "f09",
  p2: "f08",
  p3: "f11",
  p4: "f12",
  p5: "f19",
  p6: "f15",
  p7: "f21",
  p8: "f20",
  p9: "f17",
  p10: "f16",
};

function draw(seed: string, look: Look): string {
  return createAvatar(personas, {
    seed,
    size: 96,
    hair: [look.hair as never],
    hairColor: [look.hairColor],
    skinColor: [look.skin],
    eyes: [look.eyes as never],
    mouth: [look.mouth as never],
    nose: [look.nose as never],
    body: [look.body as never],
    clothingColor: [look.clothing],
    facialHair: look.facialHair ? [look.facialHair as never] : undefined,
    facialHairProbability: look.facialHair ? 100 : 0,
    backgroundColor: [look.background],
  }).toString();
}

export type Face = { id: string; group: FaceGroup; svg: string; background: string };

const cache = new Map<string, Face>();

/** A catalogue face by id (old ids included), or null if the id is not one. */
export function catalogFace(id: string): Face | null {
  const resolved = LEGACY[id] ?? id;
  const hit = cache.get(resolved);
  if (hit) return hit;
  const entry = CATALOG.find((f) => f.id === resolved);
  if (!entry) return null;
  const face = { id: entry.id, group: entry.group, svg: draw(entry.id, entry.look), background: `#${entry.look.background}` };
  cache.set(resolved, face);
  return face;
}

export function facesIn(group: FaceGroup): Face[] {
  return CATALOG.filter((f) => f.group === group).map((f) => catalogFace(f.id) as Face);
}

export function allFaceIds(): string[] {
  return CATALOG.map((f) => f.id);
}

/** True for any id worth storing, new or old. */
export function isFaceId(id: string): boolean {
  return Boolean(LEGACY[id] ?? CATALOG.find((f) => f.id === id));
}

/*
 * The face someone gets when nobody picked one: derived from the profile id
 * so it is stable everywhere, in the same style as the catalogue, and kept to
 * grown-up looks and the same skin range. A derived face that came out as a
 * baby for somebody's father would be worse than none.
 */
const DERIVED_HAIR = ["long", "shortCombover", "curlyBun", "fade", "bobCut", "curly", "straightBun", "buzzcut", "extraLong"];
const DERIVED_CLOTHES = ["456dff", "54d7c7", "7555ca", "e8612c", "6dbb58", "f55d81", "f4d150"];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function derivedFace(profileId: string, background: string): { svg: string; background: string } {
  const h = hash(profileId);
  const skins = Object.values(SKIN);
  const look: Look = {
    hair: DERIVED_HAIR[h % DERIVED_HAIR.length] as string,
    hairColor: HAIR.black,
    skin: skins[(h >>> 4) % skins.length] as string,
    eyes: (h >>> 8) % 3 === 0 ? "happy" : "open",
    mouth: (h >>> 10) % 2 === 0 ? "smile" : "bigSmile",
    nose: "smallRound",
    body: (h >>> 12) % 2 === 0 ? "rounded" : "squared",
    clothing: DERIVED_CLOTHES[(h >>> 14) % DERIVED_CLOTHES.length] as string,
    background,
  };
  return { svg: draw(profileId, look), background: `#${background}` };
}
