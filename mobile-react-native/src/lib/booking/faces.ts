import type { Doctor } from "@/lib/booking/catalog";
import { faceSvg, type FaceTraits } from "@/lib/profiles/avatar";

/*
 * Doctor portraits. Illustrated, never photographs: these are sample doctors,
 * and a stock photo of a real person labelled "Dr. Farah Siddiqui" would put a
 * stranger's face on an invented professional.
 *
 * Every trait that carries mood is pinned — a smile, calm eyes, a collared
 * shirt — because the random generator happily hands out gritted teeth and a
 * frown, and nobody books the doctor who looks alarmed.
 */
const CALM: FaceTraits = { mouth: ["smile"], eyes: ["eyes"], shirt: ["collared"], shirtColor: ["ffffff"] };

const LOOK: Record<string, FaceTraits & { bg: string }> = {
  d1: { bg: "e3dcff", hair: ["full"], hairColor: ["2c1b18"], baseColor: ["ac6651"], earringsProbability: 100, facialHairProbability: 0, glassesProbability: 0 },
  d2: { bg: "dcecff", hair: ["dougFunny"], hairColor: ["000000"], baseColor: ["ac6651"], facialHairProbability: 0, earringsProbability: 0, glassesProbability: 100 },
  d3: { bg: "ffe3ef", hair: ["pixie"], hairColor: ["2c1b18"], baseColor: ["f9c9b6"], earringsProbability: 100, facialHairProbability: 0, glassesProbability: 0 },
  d4: { bg: "e6f1fd", hair: ["fonze"], hairColor: ["000000"], baseColor: ["77311d"], facialHair: ["scruff"], facialHairProbability: 100, earringsProbability: 0, glassesProbability: 0 },
  d5: { bg: "f3e9fd", hair: ["full"], hairColor: ["000000"], baseColor: ["77311d"], earringsProbability: 100, facialHairProbability: 0, glassesProbability: 100 },
  d6: { bg: "ffe8dc", hair: ["full"], hairColor: ["6a4e35"], baseColor: ["f9c9b6"], earringsProbability: 0, facialHairProbability: 0, glassesProbability: 0 },
  d7: { bg: "e0e7ff", hair: ["mrClean"], hairColor: ["000000"], baseColor: ["ac6651"], facialHair: ["beard"], facialHairProbability: 100, earringsProbability: 0, glassesProbability: 100 },
  d8: { bg: "fde0f0", hair: ["pixie"], hairColor: ["000000"], baseColor: ["ac6651"], earringsProbability: 100, facialHairProbability: 0, glassesProbability: 0 },
  d9: { bg: "e3dcff", hair: ["dannyPhantom"], hairColor: ["9e9e9e"], baseColor: ["77311d"], facialHairProbability: 0, earringsProbability: 0, glassesProbability: 100 },
  d10: { bg: "dcecff", hair: ["fonze"], hairColor: ["000000"], baseColor: ["f9c9b6"], facialHair: ["beard"], facialHairProbability: 100, earringsProbability: 0, glassesProbability: 0 },
  d11: { bg: "f0e2ff", hair: ["full"], hairColor: ["2c1b18"], baseColor: ["ac6651"], earringsProbability: 100, facialHairProbability: 0, glassesProbability: 0 },
  d12: { bg: "ffe3ef", hair: ["full"], hairColor: ["2c1b18"], baseColor: ["f9c9b6"], earringsProbability: 100, facialHairProbability: 0, glassesProbability: 100 },
  d13: { bg: "dcecff", hair: ["dougFunny"], hairColor: ["2c1b18"], baseColor: ["ac6651"], facialHair: ["scruff"], facialHairProbability: 100, earringsProbability: 0, glassesProbability: 0 },
  d14: { bg: "f3e9fd", hair: ["pixie"], hairColor: ["000000"], baseColor: ["ac6651"], earringsProbability: 100, facialHairProbability: 0, glassesProbability: 0 },
  d15: { bg: "e6f1fd", hair: ["mrClean"], hairColor: ["9e9e9e"], baseColor: ["77311d"], facialHairProbability: 0, earringsProbability: 0, glassesProbability: 100 },
  d16: { bg: "ffe8dc", hair: ["full"], hairColor: ["000000"], baseColor: ["f9c9b6"], earringsProbability: 100, facialHairProbability: 0, glassesProbability: 0 },
  d17: { bg: "e0e7ff", hair: ["fonze"], hairColor: ["000000"], baseColor: ["ac6651"], facialHair: ["beard"], facialHairProbability: 100, earringsProbability: 0, glassesProbability: 0 },
  d18: { bg: "fde0f0", hair: ["full"], hairColor: ["6a4e35"], baseColor: ["ac6651"], earringsProbability: 0, facialHairProbability: 0, glassesProbability: 100 },
};

const cache = new Map<string, { svg: string; background: string }>();

export function doctorFace(d: Doctor): { svg: string; background: string } {
  const hit = cache.get(d.id);
  if (hit) return hit;
  const { bg, ...look } = LOOK[d.id] ?? { bg: "e3dcff" };
  const face = { svg: faceSvg(`cheeku-doctor-${d.id}`, bg, { ...look, ...CALM }), background: `#${bg}` };
  cache.set(d.id, face);
  return face;
}
