/*
 * Doctor booking — the catalogue behind the preview.
 *
 * ┌─ THIS IS SAMPLE DATA, AND THE SCREENS SAY SO ────────────────────────────┐
 * │                                                                          │
 * │ There is no provider network yet. The doctors below are invented so the  │
 * │ flow can be designed, tested and shown end to end. Every screen that     │
 * │ shows them carries a "Preview · sample doctors" label, and confirming a  │
 * │ slot books nothing. When a real network lands, this file is what gets    │
 * │ replaced by a query; the screens should not need to change shape.        │
 * │                                                                          │
 * │ What the samples deliberately leave out: star ratings and review counts. │
 * │ An invented "4.9 (320 reviews)" is a fabricated trust signal, and it is  │
 * │ exactly the thing a reader would use to choose. Experience, languages,   │
 * │ fee and timings are shown instead — the same fields a real listing has.  │
 * │                                                                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

export type Mode = "online" | "clinic";

export type SpecialtyId = "gp" | "derm" | "gynae" | "paeds" | "ent" | "gastro" | "ortho" | "diet";

export type Specialty = { id: SpecialtyId; label: string; plural: string };

export const SPECIALTIES: Record<SpecialtyId, Specialty> = {
  gp: { id: "gp", label: "General physician", plural: "General physicians" },
  derm: { id: "derm", label: "Dermatologist", plural: "Dermatologists" },
  gynae: { id: "gynae", label: "Gynaecologist", plural: "Gynaecologists" },
  paeds: { id: "paeds", label: "Paediatrician", plural: "Paediatricians" },
  ent: { id: "ent", label: "ENT specialist", plural: "ENT specialists" },
  gastro: { id: "gastro", label: "Gastroenterologist", plural: "Gastroenterologists" },
  ortho: { id: "ortho", label: "Orthopaedist", plural: "Orthopaedists" },
  diet: { id: "diet", label: "Dietician", plural: "Dieticians" },
};

/*
 * WHAT THE READER PICKS, AND WHICH DEPARTMENT THAT IS.
 *
 * The reader chooses the area ("Skin, hair or nails"); the app only names the
 * department that handles that area, the way a hospital reception would. It
 * never reads symptoms, records or severity to decide a specialty — that is
 * triage, and it is a clinical judgement. A general physician is always
 * offered first, because "start with a GP" is the one routing advice that is
 * safe for anything.
 */
export type Concern = { id: string; label: string; departments: SpecialtyId[] };

export const CONCERNS: readonly Concern[] = [
  { id: "fever", label: "Fever, cold or cough", departments: ["gp", "ent"] },
  { id: "skin", label: "Skin, hair or nails", departments: ["gp", "derm"] },
  { id: "stomach", label: "Stomach or digestion", departments: ["gp", "gastro"] },
  { id: "women", label: "Periods, pregnancy or women's health", departments: ["gp", "gynae"] },
  { id: "child", label: "My child's health", departments: ["paeds", "gp"] },
  { id: "bones", label: "Joints, back or bones", departments: ["gp", "ortho"] },
  { id: "diet", label: "Weight or diet", departments: ["gp", "diet"] },
  { id: "checkup", label: "A routine check-up", departments: ["gp"] },
  { id: "other", label: "Something else", departments: ["gp"] },
];

export type Doctor = {
  id: string;
  name: string;
  specialty: SpecialtyId;
  qualifications: string;
  years: number;
  languages: string[];
  /** Fee in rupees, per mode. Absent when the doctor does not offer it. */
  fee: Partial<Record<Mode, number>>;
  clinic: { name: string; area: string; km: number; opd: string };
};

const D = (d: Doctor) => d;

export const DOCTORS: readonly Doctor[] = [
  D({ id: "d1", name: "Dr. Meera Iyer", specialty: "gp", qualifications: "MBBS, MD (Medicine)", years: 14, languages: ["English", "Hindi", "Tamil"], fee: { online: 399, clinic: 500 }, clinic: { name: "Sunrise Family Clinic", area: "Indiranagar", km: 2.1, opd: "9:30 am – 1:30 pm · 5 – 8 pm" } }),
  D({ id: "d2", name: "Dr. Rohan Kapoor", specialty: "gp", qualifications: "MBBS, DNB (Family Medicine)", years: 9, languages: ["English", "Hindi"], fee: { online: 299 }, clinic: { name: "CarePoint Clinic", area: "HSR Layout", km: 4.6, opd: "10 am – 2 pm" } }),
  D({ id: "d3", name: "Dr. Farah Siddiqui", specialty: "derm", qualifications: "MBBS, MD (Dermatology)", years: 11, languages: ["English", "Hindi", "Urdu"], fee: { online: 599, clinic: 800 }, clinic: { name: "Skin & Hair Studio", area: "Koramangala", km: 3.4, opd: "11 am – 2 pm · 5 – 8 pm" } }),
  D({ id: "d4", name: "Dr. Arjun Menon", specialty: "derm", qualifications: "MBBS, DVL", years: 7, languages: ["English", "Malayalam"], fee: { clinic: 700 }, clinic: { name: "Clear Skin Centre", area: "Jayanagar", km: 6.2, opd: "4 – 8 pm" } }),
  D({ id: "d5", name: "Dr. Kavya Rao", specialty: "gynae", qualifications: "MBBS, MS (Obs & Gynae)", years: 16, languages: ["English", "Kannada", "Hindi"], fee: { online: 699, clinic: 900 }, clinic: { name: "Motherhood Women's Clinic", area: "Whitefield", km: 5.8, opd: "10 am – 1 pm · 6 – 8 pm" } }),
  D({ id: "d6", name: "Dr. Nisha Verma", specialty: "gynae", qualifications: "MBBS, DGO", years: 8, languages: ["English", "Hindi"], fee: { online: 499 }, clinic: { name: "Bloom Clinic", area: "Bellandur", km: 7.0, opd: "11 am – 3 pm" } }),
  D({ id: "d7", name: "Dr. Sameer Joshi", specialty: "paeds", qualifications: "MBBS, MD (Paediatrics)", years: 12, languages: ["English", "Hindi", "Marathi"], fee: { online: 499, clinic: 700 }, clinic: { name: "Little Steps Children's Clinic", area: "Indiranagar", km: 2.8, opd: "9 am – 12 pm · 5 – 7 pm" } }),
  D({ id: "d8", name: "Dr. Ananya Das", specialty: "ent", qualifications: "MBBS, MS (ENT)", years: 10, languages: ["English", "Bengali", "Hindi"], fee: { online: 499, clinic: 650 }, clinic: { name: "Ear Nose Throat Care", area: "MG Road", km: 3.9, opd: "10 am – 1 pm" } }),
  D({ id: "d9", name: "Dr. Vikram Shetty", specialty: "gastro", qualifications: "MBBS, MD, DM (Gastro)", years: 18, languages: ["English", "Kannada", "Tulu"], fee: { online: 899, clinic: 1100 }, clinic: { name: "Digestive Health Centre", area: "Malleshwaram", km: 8.3, opd: "10 am – 2 pm" } }),
  D({ id: "d10", name: "Dr. Imran Qureshi", specialty: "ortho", qualifications: "MBBS, MS (Ortho)", years: 13, languages: ["English", "Hindi", "Urdu"], fee: { online: 599, clinic: 800 }, clinic: { name: "Joint & Spine Clinic", area: "Hebbal", km: 9.1, opd: "5 – 9 pm" } }),
  D({ id: "d11", name: "Priya Nair, RD", specialty: "diet", qualifications: "MSc (Nutrition), Registered Dietitian", years: 6, languages: ["English", "Malayalam", "Hindi"], fee: { online: 449 }, clinic: { name: "NourishWell", area: "Koramangala", km: 3.1, opd: "10 am – 6 pm" } }),
];

export function doctorsFor(specialty: SpecialtyId, mode: Mode): Doctor[] {
  return DOCTORS.filter((d) => d.specialty === specialty && d.fee[mode] !== undefined);
}

export function doctorById(id: string | undefined): Doctor | undefined {
  return DOCTORS.find((d) => d.id === id);
}

/*
 * SLOTS
 *
 * Online: 15-minute video slots across the doctor's hours.
 * Clinic: the OPD runs on arrival windows — you are given a half-hour window
 * and a token when you check in, which is how most Indian OPDs actually work.
 * Pretending to a minute-exact clinic appointment would set an expectation the
 * waiting room will break.
 *
 * Deterministic per doctor and date, so the same day shows the same gaps every
 * time it is opened, and some slots are always taken — a calendar with every
 * slot free looks fake.
 */
export type Slot = { id: string; label: string; part: "Morning" | "Afternoon" | "Evening"; taken: boolean };

export function slotsFor(doctor: Doctor, mode: Mode, day: Date): Slot[] {
  const hours =
    mode === "online"
      ? [9, 10, 11, 12, 14, 15, 17, 18, 19, 20]
      : [10, 11, 12, 17, 18, 19];
  const step = mode === "online" ? [0, 15, 30, 45] : [0, 30];
  const seed = hash(`${doctor.id}-${day.toDateString()}-${mode}`);
  const now = new Date();
  const today = day.toDateString() === now.toDateString();

  const out: Slot[] = [];
  hours.forEach((h, hi) => {
    step.forEach((m, mi) => {
      const past = today && (h < now.getHours() || (h === now.getHours() && m <= now.getMinutes()));
      if (past) return;
      const taken = (seed + hi * 7 + mi * 13) % 5 === 0;
      out.push({
        id: `${h}:${m}`,
        label: mode === "online" ? time(h, m) : `${time(h, m)} – ${time(m === 30 ? h + 1 : h, m === 30 ? 0 : 30)}`,
        part: h < 12 ? "Morning" : h < 17 ? "Afternoon" : "Evening",
        taken,
      });
    });
  });
  return out;
}

/** The next free slot today or tomorrow, for the list's "Next available" chip. */
export function nextFree(doctor: Doctor, mode: Mode): string | null {
  for (let offset = 0; offset < 3; offset++) {
    const day = addDays(new Date(), offset);
    const free = slotsFor(doctor, mode, day).find((s) => !s.taken);
    if (free) {
      const when = offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : dayName(day);
      return `${when}, ${free.label.split(" – ")[0]}`;
    }
  }
  return null;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function dayName(d: Date): string {
  return d.toLocaleDateString("en-IN", { weekday: "short" });
}

function time(h: number, m: number): string {
  const suffix = h >= 12 ? "pm" : "am";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${m.toString().padStart(2, "0")} ${suffix}`;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
