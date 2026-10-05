#!/usr/bin/env node
/*
 * Builds the extra mascot poses from the four recoloured animations.
 *
 *   node scripts/recolor-mascot.mjs     (first, if the palette changed)
 *   node scripts/mascot-variants.mjs
 *
 * The artist's files hold more than they play. `working.json` stops at frame
 * 272, but its layers carry on to 1039 with three more moods at the desk
 * (markers in the file: steady, sad, happy). The standing three share one
 * rig, so their parts can be swapped. From those this script cuts:
 *
 *   idle      wave 84-120        standing, glancing about (the tail of the wave)
 *   cheer     celebrate 40-192   arms up, held (after the jump has played once)
 *   think     working 272-449    at the desk, one eyebrow up, mulling it over
 *   worried   working 449-600    at the desk, a worried face
 *   joy       working 600-720    at the desk, throws an arm up and laughs
 *   present   shrug + celebrate  NEW POSE: shrug's open arms with celebrate's
 *                                smiling face, "here's what I found"
 *   present-loop                 the same, from frame 20 (arms already open)
 *
 * The desk's last segment (720 on) shows a badge with Turkish text and is
 * left out. Each cut keeps only the keyframes and layers it needs, so a
 * segment of the 287 KB desk file is a fraction of it.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(here, "../assets/mascot");
const read = (name) => JSON.parse(fs.readFileSync(path.join(DIR, `${name}.json`), "utf8"));
const clone = (o) => JSON.parse(JSON.stringify(o));

/** Drops keyframes that can never be reached inside [ip, op]. */
function trimKeys(o, ip, op) {
  if (Array.isArray(o)) return o.forEach((x) => trimKeys(x, ip, op));
  if (!o || typeof o !== "object") return;
  if (o.a === 1 && Array.isArray(o.k) && o.k.length > 2 && typeof o.k[0]?.t === "number") {
    const ks = o.k;
    let first = 0;
    for (let i = 0; i < ks.length; i++) if (ks[i].t <= ip) first = i;
    let last = ks.length - 1;
    for (let i = ks.length - 1; i >= 0; i--) if (ks[i].t >= op) last = i;
    const kept = ks.slice(first, last + 1);
    if (kept.length >= 2) o.k = kept;
    else {
      // One keyframe left: the value never changes in this window, so it
      // becomes a plain static value (a lone keyframe breaks the players).
      const s = kept[0].s ?? kept[0].e;
      o.a = 0;
      o.k = Array.isArray(s) && s.length === 1 ? s[0] : s;
    }
  }
  for (const v of Object.values(o)) trimKeys(v, ip, op);
}

function round(o) {
  if (typeof o === "number") return Math.round(o * 1000) / 1000;
  if (Array.isArray(o)) return o.map(round);
  if (o && typeof o === "object") return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, round(v)]));
  return o;
}

function cut(source, ip, op, name, dropNames = []) {
  const d = clone(source);
  d.ip = ip;
  d.op = op;
  d.markers = [];
  d.nm = `cheeku-${name}`;
  // Layers that are not on screen in the window, or that we do not want, go.
  const gone = new Set(d.layers.filter((l) => l.op <= ip || l.ip >= op || dropNames.some((n) => l.nm.startsWith(n))).map((l) => l.ind));
  // Never drop a parent another kept layer hangs from.
  for (const l of d.layers) if (!gone.has(l.ind) && l.parent && gone.has(l.parent)) gone.delete(l.parent);
  d.layers = d.layers.filter((l) => !gone.has(l.ind));
  trimKeys(d.layers, ip, op);
  write(name, round(d));
}

function write(name, data) {
  const file = path.join(DIR, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(data));
  console.log(`${name}.json: ${(fs.statSync(file).size / 1024).toFixed(1)} KB`);
}

const wave = read("wave");
const working = read("working");
const celebrate = read("celebrate");
const shrug = read("shrug");

cut(wave, 84, 120, "idle");
cut(celebrate, 40, 192, "cheer");
// The badge ("rozet") and its light beam ("ışık") belong to the final segment.
cut(working, 272, 449, "think", ["rozet", "ışık"]);
cut(working, 449, 600, "worried", ["rozet", "ışık"]);
cut(working, 600, 720, "joy", ["rozet", "ışık"]);

/*
 * PRESENT: shrug's body and open arms, celebrate's face. Both files are the
 * same rig, so the face, its pupils, hair and mouth move across under
 * shrug's body layer with their own parenting kept.
 */
{
  const body = shrug.layers.find((l) => l.nm === "beden").ind;
  const shrugFace = shrug.layers.find((l) => l.nm.startsWith("face/")).ind;
  const celebFace = celebrate.layers.find((l) => l.nm.startsWith("face/")).ind;
  const faceTree = (layers, root) => new Set([root, ...layers.filter((l) => l.parent === root).map((l) => l.ind)]);
  const drop = faceTree(shrug.layers, shrugFace);
  const take = faceTree(celebrate.layers, celebFace);
  const offset = 100;
  const moved = celebrate.layers
    .filter((l) => take.has(l.ind))
    .map((l) => ({ ...clone(l), ind: l.ind + offset, parent: take.has(l.parent) ? l.parent + offset : body }));
  const present = clone(shrug);
  present.layers = [...moved, ...present.layers.filter((l) => !drop.has(l.ind))];
  present.nm = "cheeku-present";
  present.markers = [];
  write("present", round(present));
  cut(present, 20, 192, "present-loop");
}
