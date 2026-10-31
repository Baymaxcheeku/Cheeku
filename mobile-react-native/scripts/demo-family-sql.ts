/*
 * Writes supabase/manual/demo-step-*.sql: sample records for the family
 * Athar, Nisha and Imaad, for seeing every record page, the health file and
 * its trends on a real account.
 *
 *   ../node_modules/.bin/tsx scripts/demo-family-sql.ts
 *
 * PASTE-SAFE. The SQL Editor has been altering long pastes and English text,
 * so each step carries its records base64-encoded, stays small, and is safe to
 * run twice (a record already added is skipped by its key).
 *
 * NO EMAIL NEEDED. The loader finds the one account whose family has members
 * called Athar, Nisha and Imaad. Dates are written around 1950-06-15 and moved
 * to "today" when the step runs, so countdowns always read right.
 *
 * Every record is checked against readDetails before anything is written, so a
 * sample can never ship that its own page would fail to draw.
 *
 * Everything here is invented. Raw text is marked DEMO-RECORDS so the samples
 * can be removed with one statement (the last step prints it).
 */

import { writeFileSync, readdirSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

import { readDetails } from "../src/lib/records/details";
import type { DocType } from "../src/lib/records/types";

const BASE = Date.parse("1950-06-15");
const d = (offset: number) => new Date(BASE + offset * 86_400_000).toISOString().slice(0, 10);

type Ent = { kind: "lab_value" | "medication" | "vaccine"; name: string; canonical_name: string; value?: number; value_text?: string; unit?: string; ref_range?: string; flag?: "normal" | "high" | "low" | "caution" };
type Rec = { key: string; doc_type: DocType; status?: "filed" | "needs_review"; event_date: string; facility: string | null; doctor: string | null; title: string; details: Record<string, unknown>; entities?: Ent[] };

const lab = (name: string, key: string, value: number, unit: string, ref: string, flag: Ent["flag"]): Ent => ({ kind: "lab_value", name, canonical_name: key, value, unit, ref_range: ref, flag });
const med = (name: string, freq: string): Ent => ({ kind: "medication", name, canonical_name: name.toLowerCase(), value_text: freq });

// ------------------------------------------------------------------ Athar --

function checkup(key: string, offset: number, v: { tc: number; ldl: number; hdl: number; tg: number; a1c: number; fbs: number; vitd: number }): Rec {
  const f = (x: number, hi: number) => (x > hi ? "high" : "normal") as Ent["flag"];
  return {
    key,
    doc_type: "lab_report",
    event_date: d(offset),
    facility: "Dr Lal PathLabs, Koramangala",
    doctor: "Dr. N. Raghavan",
    title: "Annual health check-up",
    details: {
      panel: "Health check-up: lipids, sugar, vitamin D",
      sampleType: "Serum, fasting 10 hours",
      collectedAt: `${d(offset)}T07:40:00+05:30`,
      reportedAt: `${d(offset)}T18:15:00+05:30`,
      referredBy: "Dr. N. Raghavan",
      labId: `LPL-${key.toUpperCase()}`,
      accreditation: "NABL accredited",
      sections: [
        { name: "Lipid profile", keys: ["total_cholesterol", "ldl", "hdl", "triglycerides"] },
        { name: "Blood sugar", keys: ["hba1c", "fbs"] },
        { name: "Vitamins", keys: ["vitamin_d"] },
      ],
      notes: ["Sample was fasting.", "LDL calculated by Friedewald formula."],
    },
    entities: [
      lab("Total cholesterol", "total_cholesterol", v.tc, "mg/dL", "<200", f(v.tc, 200)),
      lab("LDL cholesterol", "ldl", v.ldl, "mg/dL", "<100", f(v.ldl, 100)),
      lab("HDL cholesterol", "hdl", v.hdl, "mg/dL", ">40", v.hdl < 40 ? "low" : "normal"),
      lab("Triglycerides", "triglycerides", v.tg, "mg/dL", "<150", f(v.tg, 150)),
      lab("HbA1c", "hba1c", v.a1c, "%", "4.0-5.6", f(v.a1c, 5.6)),
      lab("Fasting blood sugar", "fbs", v.fbs, "mg/dL", "70-100", f(v.fbs, 100)),
      lab("Vitamin D (25-OH)", "vitamin_d", v.vitd, "ng/mL", "30-100", v.vitd < 30 ? "low" : "normal"),
    ],
  };
}

const athar: Rec[] = [
  checkup("athar-checkup-1", -200, { tc: 224, ldl: 146, hdl: 38, tg: 182, a1c: 6.1, fbs: 108, vitd: 14 }),
  checkup("athar-checkup-2", -20, { tc: 206, ldl: 131, hdl: 42, tg: 162, a1c: 5.9, fbs: 103, vitd: 26 }),
  {
    key: "athar-rx-1",
    doc_type: "prescription",
    event_date: d(-18),
    facility: "Raghavan Clinic, Indiranagar",
    doctor: "Dr. N. Raghavan",
    title: "Prescription · Dr. N. Raghavan",
    details: {
      doctor: { name: "Dr. N. Raghavan", qualification: "MBBS, MD (Internal Medicine)", regNo: "KMC 51190", clinic: "Raghavan Clinic, Indiranagar", phone: "+91 80 4000 0000" },
      complaints: ["Routine review of check-up results"],
      diagnosis: ["Lipids above range", "Vitamin D below range"],
      vitals: [
        { label: "BP", value: "128/82" },
        { label: "Pulse", value: "76 bpm" },
        { label: "Weight", value: "78 kg" },
      ],
      medicines: [
        { name: "Atorvastatin", strength: "10 mg", form: "tablet", dose: "1 tablet", schedule: "0-0-1", timing: "bedtime", durationDays: 90 },
        { name: "Vitamin D3", strength: "60,000 IU", form: "sachet", dose: "1 sachet", schedule: "1-0-0", timing: "after_food", durationDays: 56, note: "Once a week, on Sundays, with milk" },
      ],
      tests: ["Lipid profile", "HbA1c"],
      advice: ["Brisk walk for 30 minutes, five days a week", "Cut down on fried food and sweets", "Repeat the tests in 3 months"],
      followUp: d(70),
    },
    entities: [med("Atorvastatin 10 mg", "0-0-1 · Once a day at bedtime, for 90 days"), med("Vitamin D3 60,000 IU", "Once a week, for 8 weeks")],
  },
  {
    key: "athar-consult-1",
    doc_type: "consultation_invoice",
    event_date: d(-18),
    facility: "Raghavan Clinic, Indiranagar",
    doctor: "Dr. N. Raghavan",
    title: "Clinic visit · Dr. N. Raghavan",
    details: {
      invoiceNo: "RC-2627-01184",
      issuedAt: `${d(-18)}T19:10:00+05:30`,
      doctor: { name: "Dr. N. Raghavan", specialty: "General physician", clinic: "Raghavan Clinic, Indiranagar" },
      mode: "clinic",
      appointment: { day: d(-18), slot: "7:00 pm - 7:15 pm" },
      lines: [
        { label: "Consultation fee", amount: 700 },
        { label: "Booking fee", amount: 0 },
      ],
      total: 700,
      status: "paid",
      paymentMode: "UPI",
    },
  },
  {
    key: "athar-bill-1",
    doc_type: "bill",
    event_date: d(-17),
    facility: "Apollo Pharmacy, Indiranagar",
    doctor: null,
    title: "Pharmacy bill · Apollo Pharmacy",
    details: {
      billNo: "APH/IND/2627/11420",
      vendor: "Apollo Pharmacy, Indiranagar",
      vendorKind: "pharmacy",
      gstin: "29AABCA0000F1Z5",
      items: [
        { name: "Atorvastatin 10 mg (30 tab)", category: "Medicines", qty: 3, rate: 96, amount: 288 },
        { name: "Vitamin D3 60,000 IU (4 sachets)", category: "Medicines", qty: 2, rate: 132, amount: 264 },
      ],
      subtotal: 552,
      discount: 55.2,
      taxes: [{ label: "GST 12%", amount: 59.62 }],
      total: 556.42,
      paid: 556.42,
      paymentMode: "Card",
      status: "paid",
      claimable: false,
    },
  },
  {
    key: "athar-insurance-1",
    doc_type: "insurance",
    event_date: d(-237),
    facility: "Niva Bupa Health Insurance",
    doctor: null,
    title: "Family health insurance · Niva Bupa",
    details: {
      insurer: "Niva Bupa Health Insurance",
      plan: "ReAssure 2.0 (sample)",
      policyNo: "SAMPLE-31001234",
      policyType: "family_floater",
      start: d(-237),
      end: d(128),
      sumInsured: 1500000,
      claimed: 0,
      premium: { amount: 32640, frequency: "yearly" },
      members: [{ name: "Athar", relation: "Self" }, { name: "Nisha", relation: null }, { name: "Imaad", relation: null }],
      tpa: { name: "Niva Bupa (in-house)", phone: "1800 123 4567" },
      cashless: true,
      coPay: "None",
      roomRent: "Single private room",
      waitingPeriods: [
        { label: "Pre-existing conditions", until: d(493) },
        { label: "Specific illnesses", until: d(-2) },
      ],
      claims: [],
    },
  },
  {
    key: "athar-scan-1",
    doc_type: "scan",
    event_date: d(-300),
    facility: "Aarthi Scans & Labs",
    doctor: "Dr. K. Prakash",
    title: "Chest X-ray",
    details: {
      modality: "xray",
      bodyPart: "Chest (PA view)",
      technique: "Single frontal view",
      contrast: false,
      clinicalNote: "Pre-employment check.",
      findings: ["Both lung fields are clear.", "Heart size is within normal limits.", "Costophrenic angles are clear.", "Bony thorax appears normal."],
      impression: ["No active lung or heart abnormality seen."],
      radiologist: "Dr. K. Prakash, MD (Radiology)",
      referredBy: "Employer health check",
    },
  },
];

// ------------------------------------------------------------------ Nisha --

function thyroid(key: string, offset: number, tsh: number, ft4: number, hb: number, ferritin: number): Rec {
  return {
    key,
    doc_type: "lab_report",
    event_date: d(offset),
    facility: "Healthians",
    doctor: "Dr. S. Bhat",
    title: "Thyroid and iron panel",
    details: {
      panel: "Thyroid profile with iron studies",
      sampleType: "Serum",
      collectedAt: `${d(offset)}T08:05:00+05:30`,
      reportedAt: `${d(offset + 1)}T11:30:00+05:30`,
      referredBy: "Dr. S. Bhat",
      labId: `HLT-${key.toUpperCase()}`,
      accreditation: "NABL accredited",
      sections: [
        { name: "Thyroid", keys: ["tsh", "free_t4"] },
        { name: "Blood and iron", keys: ["haemoglobin", "ferritin"] },
      ],
      notes: ["Home collection."],
    },
    entities: [
      lab("TSH", "tsh", tsh, "µIU/mL", "0.4-4.5", tsh > 4.5 ? "high" : "normal"),
      lab("Free T4", "free_t4", ft4, "ng/dL", "0.8-1.8", "normal"),
      lab("Haemoglobin", "haemoglobin", hb, "g/dL", "12.0-15.0", hb < 12 ? "low" : "normal"),
      lab("Ferritin", "ferritin", ferritin, "ng/mL", "15-150", ferritin < 15 ? "low" : "normal"),
    ],
  };
}

const nisha: Rec[] = [
  thyroid("nisha-thyroid-1", -210, 4.9, 1.1, 11.4, 12),
  thyroid("nisha-thyroid-2", -35, 5.8, 1.0, 11.8, 16),
  {
    key: "nisha-rx-1",
    doc_type: "prescription",
    status: "needs_review",
    event_date: d(-33),
    facility: "Bhat Endocrine Clinic, HSR Layout",
    doctor: "Dr. S. Bhat",
    title: "Prescription · Dr. S. Bhat",
    details: {
      doctor: { name: "Dr. S. Bhat", qualification: "MBBS, DM (Endocrinology)", regNo: "KMC 60412", clinic: "Bhat Endocrine Clinic, HSR Layout", phone: null },
      complaints: ["Tiredness for two months", "Feeling cold"],
      diagnosis: ["TSH above range"],
      vitals: [
        { label: "BP", value: "112/74" },
        { label: "Pulse", value: "68 bpm" },
      ],
      medicines: [
        { name: "Thyronorm", strength: "25 mcg", form: "tablet", dose: "1 tablet", schedule: "1-0-0", timing: "empty_stomach", durationDays: 90, note: "30 minutes before breakfast" },
        { name: "Ferrous ascorbate", strength: "100 mg", form: "tablet", dose: "1 tablet", schedule: "0-1-0", timing: "after_food", durationDays: 60 },
      ],
      tests: ["TSH after 6 weeks"],
      advice: ["Take the thyroid tablet at the same time every day", "Keep the iron tablet 4 hours apart from the thyroid tablet"],
      followUp: d(55),
    },
    entities: [med("Thyronorm 25 mcg", "1-0-0 · Once a day on an empty stomach, for 90 days"), med("Ferrous ascorbate 100 mg", "0-1-0 · Once a day after food, for 60 days")],
  },
  {
    key: "nisha-bill-1",
    doc_type: "bill",
    event_date: d(-35),
    facility: "Healthians",
    doctor: null,
    title: "Lab bill · Healthians",
    details: {
      billNo: "HLT-INV-88213",
      vendor: "Healthians",
      vendorKind: "diagnostic",
      items: [
        { name: "Thyroid profile (T3, T4, TSH)", category: "Tests", qty: 1, rate: 499, amount: 499 },
        { name: "Iron studies with ferritin", category: "Tests", qty: 1, rate: 799, amount: 799 },
        { name: "Home collection", category: "Service", qty: 1, rate: 0, amount: 0 },
      ],
      subtotal: 1298,
      discount: 0,
      taxes: [],
      total: 1298,
      paid: 1298,
      paymentMode: "UPI",
      status: "paid",
      claimable: false,
    },
  },
  {
    key: "nisha-vaccine-flu",
    doc_type: "vaccination",
    event_date: d(-60),
    facility: "Cloudnine Clinic, Jayanagar",
    doctor: null,
    title: "Flu vaccine · 2026",
    details: { vaccine: "Influenza (quadrivalent)", protectsAgainst: "Influenza", dose: 1, doses: 1, givenOn: d(-60), batch: "FLU26-3381", site: "Left upper arm", givenBy: "Sr. Meena R.", centre: "Cloudnine Clinic, Jayanagar", nextDue: d(305), certificateId: null },
    entities: [{ kind: "vaccine", name: "Influenza (quadrivalent)", canonical_name: "influenza", value: 1, value_text: "Single dose" }],
  },
  {
    key: "nisha-scan-1",
    doc_type: "scan",
    event_date: d(-80),
    facility: "Aarthi Scans & Labs",
    doctor: "Dr. R. Iyengar",
    title: "Ultrasound abdomen and pelvis",
    details: {
      modality: "ultrasound",
      bodyPart: "Abdomen and pelvis",
      technique: "Transabdominal scan",
      contrast: false,
      clinicalNote: "Occasional abdominal discomfort.",
      findings: ["Liver is normal in size and echotexture.", "Gall bladder is well distended with no stones.", "Both kidneys are normal in size with no stones.", "Uterus and ovaries appear normal."],
      impression: ["No significant abnormality detected."],
      radiologist: "Dr. R. Iyengar, DMRD",
      referredBy: "Dr. S. Bhat",
    },
  },
];

// ------------------------------------------------------------------ Imaad --

const imaad: Rec[] = [
  {
    key: "imaad-cbc-1",
    doc_type: "lab_report",
    event_date: d(-12),
    facility: "Healthians",
    doctor: "Dr. Meera Iyer",
    title: "Complete blood count",
    details: {
      panel: "Complete blood count (CBC)",
      sampleType: "Whole blood, EDTA",
      collectedAt: `${d(-13)}T07:30:00+05:30`,
      reportedAt: `${d(-12)}T10:00:00+05:30`,
      referredBy: "Dr. Meera Iyer",
      labId: "HLT-IMAAD-CBC",
      accreditation: "NABL accredited",
      sections: [
        { name: "Red blood cells", keys: ["haemoglobin"] },
        { name: "White blood cells", keys: ["wbc", "eosinophils"] },
        { name: "Platelets", keys: ["platelets"] },
      ],
      notes: ["Home collection."],
    },
    entities: [
      lab("Haemoglobin", "haemoglobin", 13.1, "g/dL", "11.5-15.5", "normal"),
      lab("Total WBC count", "wbc", 11.8, "thousand/µL", "4.5-11.0", "high"),
      lab("Eosinophils", "eosinophils", 7, "%", "1-6", "high"),
      lab("Platelet count", "platelets", 2.9, "lakh/µL", "1.5-4.5", "normal"),
    ],
  },
  {
    key: "imaad-booking-1",
    doc_type: "booking_invoice",
    event_date: d(-14),
    facility: "Healthians",
    doctor: null,
    title: "Home collection · Healthians",
    details: { invoiceNo: "HLT-BK-55120", issuedAt: `${d(-14)}T20:12:00+05:30`, partner: "Healthians", tests: [{ name: "Complete blood count (CBC)", price: 349 }], collectionFee: 0, subtotal: 349, total: 349, status: "paid", slot: { date: d(-13), window: "6-8 am" }, sample: true },
  },
  {
    key: "imaad-rx-1",
    doc_type: "prescription",
    event_date: d(-12),
    facility: "Sunrise Family Clinic, Indiranagar",
    doctor: "Dr. Meera Iyer",
    title: "Prescription · Dr. Meera Iyer",
    details: {
      doctor: { name: "Dr. Meera Iyer", qualification: "MBBS, MD (General Medicine)", regNo: "KMC 48213", clinic: "Sunrise Family Clinic, Indiranagar", phone: null },
      complaints: ["Fever for two days", "Sneezing and runny nose"],
      diagnosis: ["Viral fever with allergic rhinitis"],
      vitals: [{ label: "Temp", value: "100.4 °F" }],
      medicines: [
        { name: "Paracetamol", strength: "500 mg", form: "tablet", dose: "1 tablet", schedule: "1-1-1", timing: "after_food", durationDays: 3, note: "Only if temperature is above 100 °F" },
        { name: "Cetirizine", strength: "5 mg", form: "tablet", dose: "1 tablet", schedule: "0-0-1", timing: "bedtime", durationDays: 5 },
      ],
      tests: ["Complete blood count (CBC)"],
      advice: ["Plenty of fluids", "Rest at home until the fever settles"],
      followUp: d(3),
    },
    entities: [med("Paracetamol 500 mg", "1-1-1 · Three times a day after food, for 3 days"), med("Cetirizine 5 mg", "0-0-1 · Once a day at bedtime, for 5 days")],
  },
  {
    key: "imaad-consult-1",
    doc_type: "consultation_invoice",
    event_date: d(-12),
    facility: "Sunrise Family Clinic, Indiranagar",
    doctor: "Dr. Meera Iyer",
    title: "Video consultation · Dr. Meera Iyer",
    details: {
      invoiceNo: "CK-SAMPLE-4F2A1",
      issuedAt: `${d(-13)}T21:40:00+05:30`,
      doctor: { name: "Dr. Meera Iyer", specialty: "General physician", clinic: null },
      mode: "online",
      appointment: { day: d(-12), slot: "6:30 pm" },
      lines: [
        { label: "Consultation fee", amount: 399 },
        { label: "Booking fee", amount: 0 },
      ],
      total: 399,
      status: "paid",
      paymentMode: "Paid in app",
      sample: true,
    },
  },
  {
    key: "imaad-vaccine-hepa",
    doc_type: "vaccination",
    event_date: d(-170),
    facility: "Rainbow Children's Hospital, Marathahalli",
    doctor: null,
    title: "Hepatitis A vaccine · Dose 1",
    details: { vaccine: "Hepatitis A (inactivated)", protectsAgainst: "Hepatitis A", dose: 1, doses: 2, givenOn: d(-170), batch: "HAV-77120", site: "Right upper arm", givenBy: "Sr. Anita P.", centre: "Rainbow Children's Hospital, Marathahalli", nextDue: d(10), certificateId: null },
    entities: [{ kind: "vaccine", name: "Hepatitis A (inactivated)", canonical_name: "hepatitis a", value: 1, value_text: "Dose 1 of 2" }],
  },
  {
    key: "imaad-vaccine-flu",
    doc_type: "vaccination",
    event_date: d(-40),
    facility: "Rainbow Children's Hospital, Marathahalli",
    doctor: null,
    title: "Flu vaccine · 2026",
    details: { vaccine: "Influenza (quadrivalent)", protectsAgainst: "Influenza", dose: 1, doses: 1, givenOn: d(-40), batch: "FLU26-4410", site: "Left upper arm", givenBy: "Sr. Anita P.", centre: "Rainbow Children's Hospital, Marathahalli", nextDue: d(325), certificateId: null },
    entities: [{ kind: "vaccine", name: "Influenza (quadrivalent)", canonical_name: "influenza", value: 1, value_text: "Single dose" }],
  },
];

// ------------------------------------------------------------- validation --

const FAMILY: [string, Rec[]][] = [
  ["Athar", athar],
  ["Nisha", nisha],
  ["Imaad", imaad],
];

for (const [, recs] of FAMILY) {
  for (const r of recs) {
    const parsed = readDetails(r.doc_type, { details: r.details });
    if (!parsed || parsed.kind !== r.doc_type) throw new Error(`${r.key}: details do not read as ${r.doc_type}`);
  }
}

// -------------------------------------------------------------------- SQL --

const LOADER = `create or replace function demo_load_records (p_who text, p_payload text) returns text
set
  search_path = public as $$
declare
  v_user uuid;
  v_profile uuid;
  v_shift int := current_date - date '1950-06-15';
  v_txt text;
  r jsonb;
  m text;
  v_doc uuid;
  n int := 0;
begin
  select a.user_id into v_user
  from profiles a
  where lower(split_part(trim(a.name), ' ', 1)) = 'athar'
    and exists (select 1 from profiles b where b.user_id = a.user_id and lower(split_part(trim(b.name), ' ', 1)) = 'nisha')
    and exists (select 1 from profiles c where c.user_id = a.user_id and lower(split_part(trim(c.name), ' ', 1)) = 'imaad')
  limit 1;
  if v_user is null then
    return 'NOT ADDED: no account has Athar, Nisha and Imaad';
  end if;

  select id into v_profile from profiles
  where user_id = v_user and lower(split_part(trim(name), ' ', 1)) = lower(p_who)
  order by is_primary desc, created_at limit 1;
  if v_profile not in (select covered_profile_ids(v_user)) then
    return 'NOT ADDED: ' || p_who || ' is not covered by the plan';
  end if;

  v_txt := convert_from(decode(p_payload, 'base64'), 'UTF8');
  for m in select distinct (regexp_matches(v_txt, '19[456][0-9]-[0-9]{2}-[0-9]{2}', 'g'))[1] loop
    v_txt := replace(v_txt, m, to_char(m::date + v_shift, 'YYYY-MM-DD'));
  end loop;

  for r in select * from jsonb_array_elements(v_txt::jsonb) loop
    continue when exists (select 1 from documents where user_id = v_user and raw_text = 'DEMO-RECORDS ' || (r ->> 'key'));
    v_doc := gen_random_uuid();
    insert into documents (id, profile_id, user_id, storage_path, mime_type, doc_type, status, event_date, facility, doctor, confidence, raw_text, extraction)
    values (
      v_doc, v_profile, v_user, v_user || '/' || v_profile || '/demo-' || v_doc || '.pdf', 'application/pdf',
      r ->> 'doc_type', coalesce(r ->> 'status', 'filed'), (r ->> 'event_date')::date, r ->> 'facility', r ->> 'doctor', 0.96,
      'DEMO-RECORDS ' || (r ->> 'key'),
      jsonb_build_object('title', r ->> 'title', 'details', r -> 'details')
    );
    insert into entities (profile_id, user_id, document_id, kind, name, canonical_name, value, value_text, unit, ref_range, flag, event_date)
    select v_profile, v_user, v_doc, e ->> 'kind', e ->> 'name', e ->> 'canonical_name', (e ->> 'value')::numeric,
           e ->> 'value_text', e ->> 'unit', e ->> 'ref_range', e ->> 'flag', (r ->> 'event_date')::date
    from jsonb_array_elements(coalesce(r -> 'entities', '[]'::jsonb)) e;
    n := n + 1;
  end loop;

  delete from notifications
  where user_id = v_user
    and document_id in (select id from documents where user_id = v_user and raw_text like 'DEMO-RECORDS %');

  return p_who || ': ' || n || ' records added';
end;
$$ language plpgsql;
`;

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o), "utf8").toString("base64");
const wrap = (s: string) => s.match(/.{1,100}/g)?.join("\n") ?? s;

// Records into steps of at most ~3,000 characters of payload.
const steps: string[] = [LOADER];
for (const [who, recs] of FAMILY) {
  let batch: Rec[] = [];
  const flush = () => {
    if (batch.length) steps.push(`select demo_load_records('${who}', '\n${wrap(b64(batch))}\n');\n`);
    batch = [];
  };
  for (const r of recs) {
    if (batch.length && b64([...batch, r]).length > 3000) flush();
    batch.push(r);
  }
  flush();
}
steps.push(`drop function if exists demo_load_records (text, text);

select p.name, count(d.id) as demo_records
from profiles p
join documents d on d.profile_id = p.id and d.raw_text like 'DEMO-RECORDS %'
group by p.name
order by p.name;
`);

const dir = resolve(__dirname, "../supabase/manual");
for (const f of readdirSync(dir)) if (f.startsWith("demo-step-")) unlinkSync(resolve(dir, f));
const n = steps.length;
steps.forEach((body, i) => {
  const head = `-- demo step ${i + 1} of ${n}: sample records for Athar, Nisha and Imaad. Run in order, each in a new query. Safe to run again.\n`;
  // The removal note sits above `begin`, so every file still ends on `commit;`.
  const note = i === n - 1 ? "-- To remove every sample later, run this on its own:\n-- delete from documents where raw_text like 'DEMO-RECORDS %';\n" : "";
  writeFileSync(resolve(dir, `demo-step-${i + 1}-of-${n}.sql`), `${head}${note}begin;\n\n${body}\ncommit;\n`);
  console.log(`demo step ${i + 1}/${n}: ${head.length + body.length} chars`);
});
