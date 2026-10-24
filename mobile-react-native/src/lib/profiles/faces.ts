import type { ImageSourcePropType } from "react-native";

import v01 from "../../../assets/avatars/v01.png";
import v02 from "../../../assets/avatars/v02.png";
import v03 from "../../../assets/avatars/v03.png";
import v04 from "../../../assets/avatars/v04.png";
import v05 from "../../../assets/avatars/v05.png";
import v06 from "../../../assets/avatars/v06.png";
import v07 from "../../../assets/avatars/v07.png";
import v08 from "../../../assets/avatars/v08.png";
import v09 from "../../../assets/avatars/v09.png";
import v10 from "../../../assets/avatars/v10.png";
import v11 from "../../../assets/avatars/v11.png";
import v12 from "../../../assets/avatars/v12.png";
import v13 from "../../../assets/avatars/v13.png";
import v14 from "../../../assets/avatars/v14.png";
import v15 from "../../../assets/avatars/v15.png";
import v16 from "../../../assets/avatars/v16.png";
import v17 from "../../../assets/avatars/v17.png";
import v18 from "../../../assets/avatars/v18.png";
import v19 from "../../../assets/avatars/v19.png";
import v20 from "../../../assets/avatars/v20.png";

import { ADULT_FACE_IDS } from "./face-pool";
import { brand } from "@/theme/tokens";

/*
 * The faces people choose from.
 *
 * REPLACED 2026-09-30 with the illustrated set the owner chose: fifteen flat
 * vector portraits in one hand-drawn style (warm skin, simple line faces,
 * bold hair shapes), cut from the supplied artwork onto transparent
 * backgrounds so each sits on the app's own pastel. The previous generated
 * sets (`micah`, then `personas`) are gone from the picker.
 *
 * Shipped as images, not SVG strings: they are raster art, and letting the
 * native image cache handle them is cheaper than decoding markup per face.
 * <Avatar image> draws them (components/ui/avatar).
 *
 * IDS ARE FOREVER. Stored in `profiles.avatar_seed`. These take f25 to f39 so
 * the database's existing check (0026: `^(p|f)[0-9]{1,2}$`) accepts them with
 * no migration. Every older id, the first set's p1–p10 and the second set's
 * f01–f24, maps below to its nearest face here, so nobody's pick disappears.
 *
 * CHILDREN. The supplied set had no babies or young kids, so five were drawn
 * for this app to match it (f40 to f44: a baby, two toddlers, two school-age
 * kids), in the same palette and line style. Their SVG sources are in
 * assets/avatars/source; edit those and re-render at 384px rather than
 * touching the PNGs. The ids come after the grown-ups so nothing stored moved.
 *
 * LICENCE. f25 to f39 are third-party stock supplied by the owner. Keep proof
 * of the licence (and any attribution it requires) with the release; see
 * PROGRESS.md. f40 to f44 were made for this app and carry no such terms.
 */

const BACKGROUNDS = [brand[100], "#ffd5dc", "#c0aede", "#b6e3f4", "#ffdfbf", "#d7f0e0"] as const;

const IMAGES: ImageSourcePropType[] = [v01, v02, v03, v04, v05, v06, v07, v08, v09, v10, v11, v12, v13, v14, v15, v16, v17, v18, v19, v20];

export type Face = { id: string; image: ImageSourcePropType; background: string; svg: string };

const CATALOG: Face[] = IMAGES.map((image, i) => ({
  id: `f${25 + i}`,
  image,
  background: BACKGROUNDS[i % BACKGROUNDS.length] as string,
  svg: "",
}));

/*
 * Older ids, pointed at their nearest face in this set by hair, age and look.
 * The second set's babies and kids (f01 to f07) land on the drawn children.
 */
const LEGACY: Record<string, string> = {
  // First set (micah).
  p1: "f38", p2: "f26", p3: "f28", p4: "f30", p5: "f34",
  p6: "f29", p7: "f34", p8: "f31", p9: "f39", p10: "f37",
  // Second set (personas).
  f01: "f40", f02: "f44", f03: "f40", f04: "f43", f05: "f42", f06: "f41", f07: "f44",
  f08: "f37", f09: "f38", f10: "f30", f11: "f28", f12: "f27", f13: "f28", f14: "f26",
  f15: "f29", f16: "f32", f17: "f38",
  f18: "f31", f19: "f34", f20: "f31", f21: "f34", f22: "f31", f23: "f34", f24: "f31",
};

/** A catalogue face by id (old ids included), or null if the id is not one. */
export function catalogFace(id: string): Face | null {
  const resolved = LEGACY[id] ?? id;
  return CATALOG.find((f) => f.id === resolved) ?? null;
}

export function allFaces(): Face[] {
  return CATALOG;
}

export function allFaceIds(): string[] {
  return CATALOG.map((f) => f.id);
}

/** True for any id worth storing, new or old. */
export function isFaceId(id: string): boolean {
  return Boolean(catalogFace(id));
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * The face for someone who never picked one: one of the grown-ups, chosen by
 * their profile id so it is stable on every screen and every phone. Only the
 * grown-ups, because the id says nothing about age (and adding the children
 * to the draw would have reshuffled everyone's face). New members always get
 * a stored face at save, picked for their age (face-pool.ts), so this is only
 * the fallback for profiles made before that.
 */
export function derivedFace(profileId: string): Face {
  const id = ADULT_FACE_IDS[hash(profileId) % ADULT_FACE_IDS.length] as string;
  return catalogFace(id) as Face;
}
