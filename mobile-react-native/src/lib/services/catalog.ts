/*
 * EVERYTHING CHEEKU CAN BOOK, IN ONE PLACE.
 *
 * The marketplace side comes from a partner network reached over one API
 * (diagnostics, consultations, pharmacy, and the specialised services:
 * ambulance, vision, dental, mental health, physiotherapy, home care). So from
 * day one every category here is live; nothing waits on us signing providers
 * one by one. Until the partner API is wired in (lib/services/provider.ts),
 * requests go through the preview provider and the screens say so.
 *
 * THE SHELVES, in the order people reach for them:
 *
 *   core        Doctors, Lab tests, Medicines, Health insurance (4th, by ask)
 *   mind+body   Mental health, Dental, Eye care, Physiotherapy
 *   at home     Home care, Ambulance
 *   soon        Fitness classes (not in the partner network)
 *
 * DOCTORS ARE ONE SEGMENT. Gynaecologists, dieticians, psychologists and every
 * other specialty live inside Doctors and its pre-consultation flow; they are
 * no longer separate tiles. Dental, eye and mental health also have their own
 * service pages because they carry things a doctor list does not (cleanings,
 * spectacles, a crisis line), and their "see a specialist" offering routes back
 * into the same doctor flow.
 *
 * No invented prices or ratings here. A price is shown when the provider
 * quotes it, before anyone confirms.
 */

export type ServiceId =
  | "doctors"
  | "labs"
  | "medicines"
  | "insurance"
  | "mental"
  | "dental"
  | "eye"
  | "physio"
  | "homecare"
  | "ambulance"
  | "fitness";

export type Shelf = "core" | "mindbody" | "athome" | "soon";
export type Network = "consultations" | "diagnostics" | "pharmacy" | "specialised" | "insurance" | "wellness";
export type ServiceStatus = "live" | "soon" | "locked";
export type VisitMode = "home" | "centre" | "online";

/** One thing you can book inside a service: "Teeth cleaning", "Nurse at home". */
export type Offering = {
  id: string;
  title: string;
  line: string;
  modes: VisitMode[];
  /** Hands over to the doctor flow with this specialty instead of the request form. */
  specialty?: string;
  /** Opens a call instead of a form (emergency ambulance). */
  call?: string;
  /** Opens an existing screen (lab catalogue, insurance). */
  route?: string;
};

export type Service = {
  id: ServiceId;
  title: string;
  /** Under the title on a tile, under six words. */
  line: string;
  /** The one-paragraph promise on the service page. */
  promise: string;
  shelf: Shelf;
  network: Network;
  status: ServiceStatus;
  /** Opens this instead of the generic service page. */
  route?: string;
  /** Lucide icon name, resolved in the UI. */
  icon: string;
  tint: { from: string; to: string; fg: string };
  offerings: Offering[];
  steps: string[];
  /** Words people type when they want this ("physio", "nurse at home"). */
  keywords: string[];
  /** A safety line pinned above everything else on the page. */
  urgent?: { title: string; text: string; call: string; label: string }[];
};

export const SERVICES: readonly Service[] = [
  {
    id: "doctors",
    title: "Doctors",
    line: "Every specialty, online or clinic",
    promise: "A few quick questions, a note the doctor reads before you meet, then the right specialist online or at a clinic near you.",
    shelf: "core",
    network: "consultations",
    status: "live",
    route: "/services/doctors",
    icon: "Stethoscope",
    tint: { from: "#ece6ff", to: "#f6f3ff", fg: "#4a2ade" },
    offerings: [],
    steps: ["Tell Cheeku what's going on", "A note for the doctor", "Pick a doctor and a slot"],
    keywords: ["doctor", "consult", "specialist", "appointment", "physician"],
  },
  {
    id: "labs",
    title: "Lab tests",
    line: "Home collection, results filed",
    promise: "Blood tests, scans and full-body packages. A collector comes home, and the report lands in your health file.",
    shelf: "core",
    network: "diagnostics",
    status: "live",
    route: "/labs",
    icon: "FlaskConical",
    tint: { from: "#dcecff", to: "#eef6ff", fg: "#1a6fc2" },
    offerings: [],
    steps: ["Pick tests", "Pick a lab and slot", "Result filed in memory"],
    keywords: ["lab", "test", "blood test", "diagnostic", "scan", "xray", "x-ray", "ultrasound", "mri", "ct"],
  },
  {
    id: "medicines",
    title: "Medicines",
    line: "From your prescription to your door",
    promise: "Order what's on your prescription or refill what you already take. The prescription is checked, and the order is kept in your file.",
    shelf: "core",
    network: "pharmacy",
    status: "live",
    icon: "Pill",
    tint: { from: "#ffe3d3", to: "#fff1e9", fg: "#c2650b" },
    offerings: [
      { id: "rx", title: "Order from a prescription", line: "Pick one from your records, or upload a new one", modes: ["home"] },
      { id: "refill", title: "Refill current medicines", line: "The ones Cheeku already knows you take", modes: ["home"] },
      { id: "otc", title: "Everyday essentials", line: "Vitamins, first aid, baby care", modes: ["home"] },
    ],
    steps: ["Choose what to order", "Prescription checked", "Delivered and tracked"],
    keywords: ["medicine", "medicines", "pharmacy", "tablets", "refill", "meds", "chemist"],
  },
  {
    id: "insurance",
    title: "Health insurance",
    line: "Compare family floater plans",
    promise: "Compare health cover for your family, with your records ready for the claim when you need it.",
    shelf: "core",
    network: "insurance",
    status: "locked",
    icon: "ShieldCheck",
    tint: { from: "#e6f0ff", to: "#f2f7ff", fg: "#2b5fb8" },
    offerings: [],
    steps: ["Tell us who to cover", "Compare plans", "Buy and keep the policy on file"],
    keywords: ["insurance", "policy", "cover", "floater", "claim"],
  },
  {
    id: "mental",
    title: "Mental health",
    line: "Therapy and psychiatry, privately",
    promise: "Talk to a clinical psychologist, or see a psychiatrist when medicines might help. Online or in person, and nobody else in the family sees it.",
    shelf: "mindbody",
    network: "specialised",
    status: "live",
    icon: "WellbeingIcon",
    tint: { from: "#e9e4ff", to: "#f5f2ff", fg: "#5b3fd4" },
    offerings: [
      { id: "therapy", title: "Talk to a psychologist", line: "Stress, anxiety, low mood, relationships", modes: ["online", "centre"], specialty: "psych" },
      { id: "psychiatry", title: "See a psychiatrist", line: "Sleep, mood, when medicines may help", modes: ["online", "centre"], specialty: "psychiatry" },
      { id: "couples", title: "Couples or family counselling", line: "Together, with one counsellor", modes: ["online", "centre"] },
    ],
    steps: ["Pick who you'd like to talk to", "A short, private intake", "Your first session"],
    keywords: ["mental", "therapy", "therapist", "counsellor", "counselor", "counselling", "psychologist", "psychiatrist", "anxiety", "stress", "depression"],
    urgent: [
      { title: "Thinking of ending your life, or worried someone is?", text: "Tele-MANAS is free, confidential and open all day and night.", call: "14416", label: "Call 14416" },
    ],
  },
  {
    id: "dental",
    title: "Dental",
    line: "Check-ups, cleaning, toothache",
    promise: "A dentist near you for a check-up, a cleaning or that tooth that's been bothering you.",
    shelf: "mindbody",
    network: "specialised",
    status: "live",
    icon: "Smile",
    tint: { from: "#e0f2ff", to: "#f0f8ff", fg: "#1f6fae" },
    offerings: [
      { id: "consult", title: "See a dentist", line: "Pain, sensitivity, a check-up", modes: ["centre"], specialty: "dental" },
      { id: "cleaning", title: "Teeth cleaning", line: "Scaling and polishing", modes: ["centre"] },
      { id: "kids", title: "Children's dental check", line: "First visits and fluoride", modes: ["centre"] },
    ],
    steps: ["Pick a visit", "Pick a clinic and time", "Notes filed after"],
    keywords: ["dental", "dentist", "teeth", "tooth", "toothache", "gums", "cleaning", "braces"],
  },
  {
    id: "eye",
    title: "Eye care",
    line: "Eye tests, glasses, specialists",
    promise: "An eye test at home or at a centre, glasses and lenses, or an eye specialist when something's not right.",
    shelf: "mindbody",
    network: "specialised",
    status: "live",
    icon: "Eye",
    tint: { from: "#e4f0ff", to: "#f2f8ff", fg: "#2563b8" },
    offerings: [
      { id: "test", title: "Eye test", line: "Vision check, power for glasses", modes: ["home", "centre"] },
      { id: "specialist", title: "See an eye specialist", line: "Redness, pain, blurry vision", modes: ["online", "centre"], specialty: "eye" },
      { id: "glasses", title: "Glasses and lenses", line: "From your latest prescription", modes: ["home", "centre"] },
    ],
    steps: ["Pick what you need", "Home or centre", "Prescription filed"],
    keywords: ["eye", "eyes", "vision", "glasses", "spectacles", "lens", "lenses", "optician", "ophthalmologist"],
  },
  {
    id: "physio",
    title: "Physiotherapy",
    line: "At home or at a centre",
    promise: "A physiotherapist for back and joint pain, after an injury or surgery, or after a baby. Sessions at home or at a centre.",
    shelf: "mindbody",
    network: "specialised",
    status: "live",
    icon: "Activity",
    tint: { from: "#e8ebff", to: "#f3f5ff", fg: "#3f4fd9" },
    offerings: [
      { id: "pain", title: "Back, neck or joint pain", line: "Assessment and a plan", modes: ["home", "centre"] },
      { id: "rehab", title: "After an injury or surgery", line: "Get moving again, safely", modes: ["home", "centre"] },
      { id: "postnatal", title: "After a baby", line: "Core and pelvic floor", modes: ["home", "centre", "online"] },
    ],
    steps: ["Pick what it's for", "Home or centre", "Progress kept in memory"],
    keywords: ["physio", "physiotherapy", "physiotherapist", "back pain", "rehab", "rehabilitation"],
  },
  {
    id: "homecare",
    title: "Home care",
    line: "Nurses, caregivers, elder care",
    promise: "A trained nurse or caregiver at home: injections and dressings, care after a hospital stay, or daily help for an older parent.",
    shelf: "athome",
    network: "specialised",
    status: "live",
    icon: "HeartHandshake",
    tint: { from: "#ffe4ef", to: "#fff1f6", fg: "#b8326b" },
    offerings: [
      { id: "nurse", title: "Nurse visit", line: "Injections, dressings, IV, catheter care", modes: ["home"] },
      { id: "elder", title: "Elder care at home", line: "Daily help, by the shift", modes: ["home"] },
      { id: "postop", title: "After a hospital stay", line: "Care and checks at home", modes: ["home"] },
      { id: "newborn", title: "New mother and baby care", line: "Feeding, bathing, recovery", modes: ["home"] },
    ],
    steps: ["Pick the kind of care", "When and for how long", "Visit notes filed"],
    keywords: ["nurse", "home care", "caregiver", "caretaker", "attendant", "elder care", "injection at home", "dressing"],
  },
  {
    id: "ambulance",
    title: "Ambulance",
    line: "Emergency or planned transport",
    promise: "In an emergency, call first. For a planned hospital transfer or a ride back home after discharge, book ahead here.",
    shelf: "athome",
    network: "specialised",
    status: "live",
    icon: "Ambulance",
    tint: { from: "#eceff6", to: "#f6f7fb", fg: "#334a6b" },
    offerings: [
      { id: "emergency", title: "Emergency ambulance", line: "Call 108 now. Don't book.", modes: ["home"], call: "108" },
      { id: "transfer", title: "Planned hospital transfer", line: "Between hospitals, or for a scheduled admission", modes: ["home"] },
      { id: "discharge", title: "Ride home after discharge", line: "With a stretcher or wheelchair", modes: ["home"] },
    ],
    steps: ["Pick the trip", "Pick-up and drop", "Confirmed by the provider"],
    keywords: ["ambulance", "patient transport", "stretcher"],
    urgent: [{ title: "Is this an emergency?", text: "Don't fill a form. Call now.", call: "108", label: "Call 108" }],
  },
  {
    id: "fitness",
    title: "Fitness classes",
    line: "Yoga, strength, prenatal",
    promise: "Classes and trainers, online or at home, that fit around your routine.",
    shelf: "soon",
    network: "wellness",
    status: "soon",
    icon: "Dumbbell",
    tint: { from: "#dfe6ff", to: "#f0f3ff", fg: "#3f5bd9" },
    offerings: [],
    steps: [],
    keywords: ["fitness", "yoga", "gym", "trainer", "workout", "pilates", "zumba"],
  },
];

export const SHELVES: { id: Shelf; title: string; line: string }[] = [
  { id: "core", title: "Everyday care", line: "Doctors, tests, medicines and cover" },
  { id: "mindbody", title: "Mind and body", line: "Therapy, teeth, eyes and movement" },
  { id: "athome", title: "At home and on the way", line: "Nurses, caregivers and transport" },
  { id: "soon", title: "Coming soon", line: "Not open yet: we'll tell you" },
];

export function serviceById(id: string | undefined | null): Service | undefined {
  return SERVICES.find((s) => s.id === id);
}

export function onShelf(shelf: Shelf): Service[] {
  return SERVICES.filter((s) => s.shelf === shelf);
}

/** Where a service tile goes: its own flow, or the generic service page. */
export function routeFor(s: Service): string {
  return s.route ?? `/services/${s.id}`;
}

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

/**
 * Search across services and what's inside them: "nurse" finds Home care,
 * "braces" finds Dental, "therapy" finds Mental health. Title matches first.
 */
export function searchServices(query: string): Service[] {
  const q = norm(query);
  if (!q) return [...SERVICES];
  const score = (s: Service) => {
    const title = norm(s.title);
    if (title.startsWith(q)) return 100;
    // A word people use for exactly this beats a title that merely contains
    // it: "therapy" means Mental health, not Physiotherapy.
    if (s.keywords.some((k) => norm(k) === q)) return 90;
    if (title.includes(q)) return 70;
    if (s.keywords.some((k) => norm(k).includes(q) || q.includes(norm(k)))) return 40;
    if (s.offerings.some((o) => norm(`${o.title} ${o.line}`).includes(q))) return 30;
    return 0;
  };
  return SERVICES.map((s) => ({ s, n: score(s) }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .map((x) => x.s);
}

export const MODE_LABEL: Record<VisitMode, string> = { home: "At home", centre: "At a centre", online: "Online" };
