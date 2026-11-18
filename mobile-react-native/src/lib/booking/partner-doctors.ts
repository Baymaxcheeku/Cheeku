import type { Doctor, Mode, SpecialtyId } from "@/lib/booking/catalog";
import type { Provider, Speciality } from "@/lib/partner/types";
import { imageUrl } from "@/lib/partner/validate";

/*
 * PARTNER DOCTORS AS OUR DOCTORS.
 *
 * Live, the doctor list comes from the partner network. Each provider is
 * turned into the same `Doctor` the sample catalogue uses, with the id
 * "ls-<partner id>", so the slot, confirm, booked and appointment screens
 * work unchanged. `doctorById` (catalog.ts) looks here for "ls-" ids.
 *
 * The last few seen are kept on the phone (names and departments only,
 * nothing about anyone's health), so an appointment opened after a restart
 * still shows who it is with.
 *
 * Types only from catalog.ts: catalog imports this file, not the other way.
 * No storage here either (catalog is loaded by plain tests); saving the list
 * on the phone is done by partner/use-doctors.ts.
 */

/** Our departments to the partner's speciality names ("Cardiology", "General Physician"). */
const MATCH: Record<SpecialtyId, RegExp> = {
  gp: /general|physician|family|internal medicine/i,
  paeds: /paediat|pediat|child/i,
  gynae: /gyn|obstet|women/i,
  derm: /derma|skin|cosmet/i,
  ent: /\bent\b|otorhino|ear/i,
  dental: /dent|oral/i,
  eye: /ophthal|eye/i,
  psych: /psycholog|counsel/i,
  psychiatry: /psychiat/i,
  diet: /diet|nutri/i,
  cardio: /cardio|heart/i,
  endo: /endocr|diabet|thyroid/i,
  gastro: /gastro|digest/i,
  ortho: /ortho|bone|joint/i,
  neuro: /neuro|brain/i,
};

/** The partner's name for one of our departments, from its live list; null if it has none. */
export function partnerSpeciality(id: SpecialtyId, list: readonly Speciality[]): string | null {
  const re = MATCH[id];
  // "Psychiatry" also matches /psych/ loosely elsewhere, so the most specific wins: exact department first.
  const hits = list.filter((s) => re.test(s.name) && s.count > 0);
  if (id === "psych") return hits.find((s) => !/psychiat/i.test(s.name))?.name ?? null;
  return hits.sort((a, b) => b.count - a.count)[0]?.name ?? null;
}

/** Our department for a provider's specialities, general physician if none match. */
export function departmentOf(names: readonly string[]): SpecialtyId {
  for (const n of names) {
    if (/psychiat/i.test(n)) return "psychiatry";
    const hit = (Object.keys(MATCH) as SpecialtyId[]).find((k) => k !== "gp" && MATCH[k].test(n));
    if (hit) return hit;
  }
  return "gp";
}

const seen = new Map<string, Doctor>();

/** A partner provider as a Doctor. Fees aren't in the partner's list, so they show as 0 ("on the bill"). */
export function asDoctor(p: Provider): Doctor {
  const modes: Mode[] = [];
  if (p.types.includes("ONLINE")) modes.push("online");
  if (p.types.includes("CENTER_VISIT")) modes.push("clinic");
  const typeOf = (m: Mode): "ONLINE" | "CENTER_VISIT" => (m === "online" ? "ONLINE" : "CENTER_VISIT");
  const priced = (m: Mode) => p.prices?.[typeOf(m)];
  const pick = <K extends "next" | "durationMin">(k: K) =>
    Object.fromEntries(modes.map((m) => [m, priced(m)?.[k]]).filter(([, v]) => v !== null && v !== undefined)) as Partial<Record<Mode, NonNullable<NonNullable<ReturnType<typeof priced>>[K]>>>;
  // Education tags read as qualifications ("MBBS, MD"); the specialities are already the department.
  const degrees = (p.tags ?? []).filter((t) => /educat|qualif|degree/i.test(t.category)).map((t) => t.name);
  return {
    id: `ls-${p.lsId}`,
    name: p.name,
    specialty: departmentOf(p.specialities),
    qualifications: degrees.join(", "),
    years: p.years ?? 0,
    languages: p.languages,
    // 0 means "price not known yet": the screens say "Fee shown at booking" for it.
    fee: Object.fromEntries(modes.map((m) => [m, priced(m)?.price ?? 0])) as Doctor["fee"],
    clinic: { name: p.place ?? "Clinic", area: p.place ?? "", km: p.distanceKm ?? 0, opd: "" },
    gender: p.gender,
    photo: imageUrl(p.photo),
    live: {
      next: pick("next") as Partial<Record<Mode, string>>,
      durationMin: pick("durationMin") as Partial<Record<Mode, number>>,
      rating: p.rating,
      ratings: p.ratings,
      followUpDays: p.followUpDays ?? null,
      subSpecialities: p.subSpecialities ?? [],
      tags: (p.tags ?? []).filter((t) => !/educat|qualif|degree/i.test(t.category)),
      address: p.address ?? null,
    },
  };
}

/** Keep these so doctorById finds them; returns the newest 30 for saving. */
export function rememberDoctors(list: readonly Doctor[]): Doctor[] {
  for (const d of list) seen.set(d.id, d);
  return [...seen.values()].slice(-30);
}

export function partnerDoctor(id: string): Doctor | undefined {
  return seen.get(id);
}

/** The partner id for a doctor id, or null for a sample doctor. */
export function lsIdOf(doctorId: string | undefined): number | null {
  return doctorId?.startsWith("ls-") ? Number(doctorId.slice(3)) || null : null;
}
