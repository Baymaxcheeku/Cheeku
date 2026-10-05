#!/usr/bin/env node
/*
 * Recolours the mascot Lottie files into the app's brand palette.
 *
 *   node scripts/recolor-mascot.mjs
 *
 * Reads assets/mascot/source/*.json (the files exactly as downloaded, kept so
 * this can be re-run with a different palette), writes assets/mascot/*.json.
 *
 * The originals are a yellow character with orange outlines, orange cheeks,
 * yellow sparks, and a teal and magenta desk set. The app is violet on a pale
 * lavender canvas, so:
 *
 *   body yellows            -> lilac violets (light to dark, same order)
 *   orange outline          -> brand violet 500
 *   magenta cheek tint      -> rose blush, stronger, so it shows on lilac
 *   yellow spark strokes    -> pink, so a celebration reads warm
 *   teal chair and desk     -> deep ink indigo, so a violet body stands out
 *   magenta props           -> rose pink
 *   greys, white, mouth     -> unchanged
 *
 * Exact matches come first (the palette the artist used); anything else in
 * the yellow/orange or teal range is moved by hue with its lightness kept, so
 * a colour this table missed still lands in the family. Never green, amber or
 * red: those mean health results in this app (PLAN.md rule 3).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(here, "../assets/mascot/source");
const OUT = path.join(here, "../assets/mascot");

const EXACT = {
  // the character
  "#f9ba0f": "#a594f9", // body
  "#f9ab0f": "#9786f6", // body shade (belly, underside)
  "#ffc731": "#bdb2fb", // body highlight
  "#ffd63c": "#cbc3fc", // lighter highlight
  "#fff8da": "#f1eeff", // face light
  "#eb8828": "#5b4ef0", // outline
  "#cc6d10": "#3b2bc9", // deep outline
  "#f99310": "#8f7ff4", // shade
  "#ffde00": "#ff9ec4", // celebration sparks
  "#e40069": "#e5487f", // mouth, tongue, props
  // the desk set
  "#bc0d5e": "#d94c8a",
  "#00abaf": "#3e3a8c",
  "#008591": "#2e2b70",
  "#00879f": "#34318a",
  "#0e7073": "#24215c",
  "#018083": "#2b2870",
  "#044849": "#16143f",
  "#4ad4d6": "#6c66c9",
  "#66ffcc": "#a9a4f0",
  "#4afff0": "#a9a4f0",
  "#ffff99": "#f1eeff",
  "#ffdc98": "#ece7ff",
  // paper and card on the desk: neutral, kept
  "#d4c392": "#d4c392",
  "#d8ad67": "#d8c9a6",
};

/** Exported files carry rounding variants (#fabb0f for #f9ba0f): snap within 4/255. */
const NEAR = 4 / 255;

const hex = (c) => "#" + c.slice(0, 3).map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0")).join("");
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

function toHsl([r, g, b]) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function fromHsl([h, s, l]) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

const misses = new Map();

function nearest(c) {
  for (const [from, to] of Object.entries(EXACT)) {
    const f = rgb(from);
    if (f.every((v, i) => Math.abs(v - c[i]) <= NEAR)) return to;
  }
  return null;
}

function remap(c) {
  const h = hex(c);
  const exact = EXACT[h] ?? nearest(c);
  if (exact) return [...rgb(exact), ...c.slice(3)];
  const [hue, s, l] = toHsl(c);
  if (s < 0.25) return c; // greys, white, near-black: unchanged
  let next = null;
  // Same lightness order as the original, lifted into the lilac range the body uses.
  if (hue >= 20 && hue <= 65) next = fromHsl([250, Math.min(0.88, s * 0.85), Math.max(0.55, Math.min(0.9, 0.38 + l * 0.45))]);
  else if (hue >= 160 && hue <= 200) next = fromHsl([244, 0.42, Math.max(0.14, l * 0.62)]);
  if (!next) return c;
  misses.set(h, hex(next));
  return [...next, ...c.slice(3)];
}

/** Every colour in a Lottie tree: fills, strokes, keyframed colours, gradients, solids. */
function walk(o) {
  if (Array.isArray(o)) return o.forEach(walk);
  if (!o || typeof o !== "object") return;
  /*
   * The blush is magenta at about 18% over the body. Over lilac that reads
   * purple, so a faint magenta fill becomes a rose pink at a stronger opacity.
   */
  if (o.ty === "fl" && Array.isArray(o.c?.k) && typeof o.c.k[0] === "number" && typeof o.o?.k === "number" && o.o.k < 40) {
    const [r, g, b] = o.c.k;
    if (r > 0.8 && g < 0.1 && b > 0.3 && b < 0.5) {
      o.c.k = [...rgb("#ff6fa3"), ...o.c.k.slice(3)];
      o.o.k = 55;
      return;
    }
  }
  if ((o.ty === "fl" || o.ty === "st") && o.c) {
    const k = o.c.k;
    if (Array.isArray(k) && typeof k[0] === "number") o.c.k = remap(k);
    else if (Array.isArray(k)) for (const kf of k) for (const key of ["s", "e"]) if (Array.isArray(kf?.[key])) kf[key] = remap(kf[key]);
  }
  if ((o.ty === "gf" || o.ty === "gs") && o.g?.k) {
    const recolour = (arr, count) => {
      for (let i = 0; i < count; i++) {
        const [r, g, b] = remap(arr.slice(i * 4 + 1, i * 4 + 4));
        arr.splice(i * 4 + 1, 3, r, g, b);
      }
    };
    const k = o.g.k.k;
    if (Array.isArray(k) && typeof k[0] === "number") recolour(k, o.g.p);
    else if (Array.isArray(k)) for (const kf of k) for (const key of ["s", "e"]) if (Array.isArray(kf?.[key])) recolour(kf[key], o.g.p);
  }
  if (typeof o.sc === "string" && /^#[0-9a-f]{6}$/i.test(o.sc)) o.sc = hex(remap(rgb(o.sc.toLowerCase())));
  for (const v of Object.values(o)) walk(v);
}

const isBlushMagenta = (k) => Array.isArray(k) && typeof k[0] === "number" && k[0] > 0.8 && k[1] < 0.1 && k[2] > 0.3 && k[2] < 0.5;

/** Some files fade the blush on the layer instead of the fill: same treatment. */
function blushLayers(layers) {
  for (const l of layers ?? []) {
    const lo = l.ks?.o;
    if (typeof lo?.k !== "number" || lo.k >= 40) continue;
    const fills = [];
    const find = (o) => {
      if (Array.isArray(o)) return o.forEach(find);
      if (!o || typeof o !== "object") return;
      if (o.ty === "fl" && isBlushMagenta(o.c?.k)) fills.push(o);
      Object.values(o).forEach(find);
    };
    find(l.shapes);
    if (!fills.length) continue;
    for (const f of fills) f.c.k = [...rgb("#ff6fa3"), ...f.c.k.slice(3)];
    lo.k = 50;
  }
}

for (const file of fs.readdirSync(SRC).filter((f) => f.endsWith(".json"))) {
  const data = JSON.parse(fs.readFileSync(path.join(SRC, file), "utf8"));
  blushLayers(data.layers);
  walk(data);
  data.nm = `cheeku-${path.basename(file, ".json")}`;
  fs.writeFileSync(path.join(OUT, file), JSON.stringify(data));
  console.log(`${file}: ${(fs.statSync(path.join(OUT, file)).size / 1024).toFixed(1)} KB`);
}
if (misses.size) console.log("moved by hue:", Object.fromEntries(misses));
