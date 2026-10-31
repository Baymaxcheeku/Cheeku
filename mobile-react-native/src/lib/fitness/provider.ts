import { ACTIVITIES, activityById, type ActivityId, type Intensity } from "./catalog";

/*
 * THE FITNESS NETWORK ACCESS POINT.
 *
 * Every screen talks to `fitnessNetwork()` and nothing else. Today that is the
 * preview network below: sample studios placed around wherever the person is,
 * so the whole flow (find, match, book, check in) works end to end. When the
 * partner's master API arrives, a second implementation of FitnessNetwork goes
 * beside it, `fitnessNetwork()` returns it, and no screen changes.
 *
 * WHAT THE PREVIEW NEVER PRETENDS. Sample studios carry no address, phone or
 * brand; screens mark them "Sample" and say real studios appear once the
 * network is connected. Prices are plausible bases for testing the markup,
 * not quotes.
 *
 * WHAT NEVER CROSSES THIS LINE: conditions, readings, records. A booking
 * carries a first name, the session and a reference. Matching on health needs
 * happens on the phone (match.ts), not at the partner.
 */

export type Studio = {
  id: string;
  name: string;
  /** "Sample" in the preview; the partner's locality once live. */
  area: string | null;
  lat: number;
  lng: number;
  activities: ActivityId[];
  rating: number | null;
  reviews: number;
  amenities: string[];
  womenOnly: boolean;
  sample: boolean;
};

export type Session = {
  id: string;
  studioId: string;
  activity: ActivityId;
  title: string;
  /** ISO, local wall time with offset. */
  startsAt: string;
  durationMin: number;
  level: "beginner" | "all" | "intermediate";
  intensity: Intensity;
  seatsLeft: number;
  /** The partner's price per session, before Cheeku's markup. */
  basePrice: number;
};

export type Place = { lat: number; lng: number };

export type BookInput = { session: Session; studio: Studio; forName: string };
export type BookAnswer = { ok: true; reference: string; checkinCode: string } | { ok: false; message: string };

export interface FitnessNetwork {
  readonly id: string;
  readonly preview: boolean;
  studiosNear(place: Place, radiusKm?: number): Promise<Studio[]>;
  studio(id: string): Promise<Studio | null>;
  sessions(studio: Studio, day: Date, now?: Date): Promise<Session[]>;
  book(input: BookInput): Promise<BookAnswer>;
  cancel(reference: string): Promise<boolean>;
}

// ------------------------------------------------------------------ geo --

const R = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in km. */
export function distanceKm(a: Place, b: Place): number {
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const distanceLabel = (km: number) => (km < 1 ? `${Math.max(100, Math.round(km * 10) * 100)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`);

// ------------------------------------------------------- preview network --

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
function hash(text: string): number {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
}

const NAMES: Record<ActivityId, string[]> = {
  gym: ["Iron Works Gym", "Core Strength Club", "Peak Fitness"],
  yoga: ["Prana Yoga Studio", "Lotus Yoga Shala", "Aum Yoga House"],
  zumba: ["Groove Zumba Studio", "Beat Dance Fitness"],
  swimming: ["Blue Lagoon Aquatics", "Tide Swim Centre"],
  dance: ["Tribe Dance Studio", "Taal Dance Academy"],
  pilates: ["Align Pilates", "Balance Pilates Studio"],
  functional: ["Forge Functional", "Stride CrossTrain"],
  hiit: ["Pulse HIIT Lab", "Spark Interval Studio"],
  aerobics: ["Rise Aerobics Club"],
  kickboxing: ["Strike Kickboxing Club"],
  prenatal_yoga: ["Bloom Prenatal Yoga"],
  meditation: ["Still Mind Centre"],
  aqua: ["Aqua Ease Pool Studio"],
};

const BASE: Record<ActivityId, [number, number]> = {
  gym: [120, 200], yoga: [150, 250], zumba: [150, 220], swimming: [200, 300], dance: [180, 250],
  pilates: [300, 450], functional: [200, 300], hiit: [200, 300], aerobics: [150, 220], kickboxing: [250, 350],
  prenatal_yoga: [250, 350], meditation: [120, 180], aqua: [250, 350],
};

const AMENITIES = ["Showers", "Lockers", "Parking", "Changing rooms", "Drinking water", "Trainer on floor"];

/** Studios are placed on a ~2 km grid cell, so the same place always shows the same studios. */
function sampleStudios(place: Place): Studio[] {
  const cellLat = Math.round(place.lat * 50) / 50, cellLng = Math.round(place.lng * 50) / 50;
  const r = rng(hash(`${cellLat},${cellLng}`));
  const kinds = ACTIVITIES.map((a) => a.id);
  const out: Studio[] = [];
  for (let i = 0; i < 14; i++) {
    const main = kinds[Math.floor(r() * kinds.length)] as ActivityId;
    const extra = kinds.filter((k) => k !== main && r() < 0.18).slice(0, 2);
    // Within ~6 km, more of them close by.
    const km = 0.3 + (r() ** 1.6) * 5.7;
    const bearing = r() * Math.PI * 2;
    const lat = cellLat + (km / 111) * Math.cos(bearing);
    const lng = cellLng + (km / (111 * Math.cos(rad(cellLat)))) * Math.sin(bearing);
    const pool = NAMES[main];
    out.push({
      id: `s_${hash(`${cellLat},${cellLng},${i}`).toString(36)}`,
      name: pool[Math.floor(r() * pool.length)] as string,
      area: "Sample",
      lat,
      lng,
      activities: [main, ...extra],
      rating: Math.round((3.9 + r() * 1.0) * 10) / 10,
      reviews: 20 + Math.floor(r() * 900),
      amenities: AMENITIES.filter(() => r() < 0.5),
      womenOnly: main === "prenatal_yoga" || r() < 0.06,
      sample: true,
    });
  }
  return out;
}

const pad = (n: number) => String(n).padStart(2, "0");
function localIso(day: Date, hour: number, minute: number): string {
  const d = new Date(day);
  d.setHours(hour, minute, 0, 0);
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(hour)}:${pad(minute)}:00${sign}${pad(Math.floor(Math.abs(off) / 60))}:${pad(Math.abs(off) % 60)}`;
}

const SLOTS: [number, number][] = [[6, 0], [7, 0], [7, 30], [9, 0], [11, 0], [17, 30], [18, 30], [19, 0], [20, 0]];

export function sampleSessions(studio: Studio, day: Date, now: Date = new Date()): Session[] {
  const dayKey = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
  const r = rng(hash(`${studio.id}|${dayKey}`));
  const out: Session[] = [];
  for (const act of studio.activities) {
    const a = activityById(act);
    if (!a) continue;
    const [lo, hi] = BASE[act];
    const picks = SLOTS.filter(() => r() < 0.4).slice(0, 4);
    for (const [h, m] of picks.length ? picks : [SLOTS[Math.floor(r() * SLOTS.length)] as [number, number]]) {
      const startsAt = localIso(day, h, m);
      if (Date.parse(startsAt) < now.getTime() + 30 * 60_000) continue;
      const level = r() < 0.4 ? "beginner" : r() < 0.8 ? "all" : "intermediate";
      out.push({
        id: `${studio.id}_${act}_${dayKey}_${h}${m}`.replace(/[^a-zA-Z0-9_]/g, ""),
        studioId: studio.id,
        activity: act,
        title: level === "beginner" ? `${a.label} for beginners` : a.label,
        startsAt,
        durationMin: act === "swimming" || act === "gym" ? 60 : r() < 0.5 ? 45 : 60,
        level,
        intensity: level === "beginner" && a.intensity === "high" ? "moderate" : a.intensity,
        seatsLeft: 1 + Math.floor(r() * 14),
        basePrice: Math.round((lo + r() * (hi - lo)) / 10) * 10,
      });
    }
  }
  return out.sort((x, y) => x.startsAt.localeCompare(y.startsAt));
}

const cache = new Map<string, Studio>();

export const previewNetwork: FitnessNetwork = {
  id: "preview",
  preview: true,
  async studiosNear(place, radiusKm = 8) {
    const list = sampleStudios(place).filter((s) => distanceKm(place, s) <= radiusKm);
    for (const s of list) cache.set(s.id, s);
    return list;
  },
  async studio(id) {
    return cache.get(id) ?? null;
  },
  async sessions(studio, day, now) {
    return sampleSessions(studio, day, now);
  },
  async book({ session }) {
    if (session.seatsLeft <= 0) return { ok: false, message: "That session just filled up. Pick another time." };
    const h = hash(`${session.id}|${Date.now()}`).toString(36).toUpperCase();
    return { ok: true, reference: `PV-${h.slice(0, 8)}`, checkinCode: h.slice(0, 6).padEnd(6, "7") };
  },
  async cancel() {
    return true;
  },
};

/** The network in use. The partner's API replaces this one line. */
export function fitnessNetwork(): FitnessNetwork {
  return previewNetwork;
}
