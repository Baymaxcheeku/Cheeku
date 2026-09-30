import type { DocType } from "@/lib/records/types";

/*
 * What the mock reader "finds" in each kind of document.
 *
 * One realistic Indian document per type, so every record page can be built
 * and looked at against something that reads like the real thing: a
 * physician's prescription with a 1-0-1 schedule, a radiology report with
 * findings and an impression, a family floater with a TPA helpline. Dates are
 * relative to the upload day so nothing is ever stale.
 *
 * SAMPLES. Every name, number and registration below is invented. The upload
 * screen and the record page both say the reading is a preview.
 */

export type Fixture = {
  title: string;
  facility: string | null;
  doctor: string | null;
  /** The document's own date. */
  eventDate: string;
  details: Record<string, unknown>;
  /** Printed lab values; empty for every other type. */
  values: { key: string; label: string; value: string; unit: string | null; refRange: string | null; flag: "normal" | "high" | "low" | "caution" | null }[];
  rawText: string;
};

const day = (today: string, offset: number) => new Date(Date.parse(today) + offset * 86_400_000).toISOString().slice(0, 10);

export function fixtureFor(type: DocType, today: string): Fixture {
  switch (type) {
    case "lab_report":
      return {
        title: "Complete blood count",
        facility: "Lucid Medical Diagnostics",
        doctor: "Dr. S. Menon",
        eventDate: today,
        details: {
          panel: "Complete blood count (CBC)",
          sampleType: "Whole blood, EDTA",
          collectedAt: `${today}T08:12:00+05:30`,
          reportedAt: `${today}T17:40:00+05:30`,
          referredBy: "Dr. S. Menon",
          labId: "LMD-24-118093",
          accreditation: "NABL accredited",
          sections: [
            { name: "Red blood cells", keys: ["haemoglobin", "rbc", "mcv", "hematocrit"] },
            { name: "White blood cells", keys: ["wbc"] },
            { name: "Platelets", keys: ["platelets"] },
          ],
          notes: ["Mild microcytosis noted on the smear.", "Correlate clinically."],
        },
        values: [
          { key: "haemoglobin", label: "Haemoglobin", value: "10.4", unit: "g/dL", refRange: "12.0-15.0", flag: "low" },
          { key: "rbc", label: "RBC count", value: "4.3", unit: "million/µL", refRange: "3.8-4.8", flag: "normal" },
          { key: "mcv", label: "MCV", value: "78", unit: "fL", refRange: "80-100", flag: "low" },
          { key: "hematocrit", label: "Haematocrit (PCV)", value: "36.2", unit: "%", refRange: "36-46", flag: "normal" },
          { key: "wbc", label: "Total WBC count", value: "7.8", unit: "thousand/µL", refRange: "4.0-10.0", flag: "normal" },
          { key: "platelets", label: "Platelet count", value: "2.4", unit: "lakh/µL", refRange: "1.5-4.1", flag: "normal" },
        ],
        rawText: `LUCID MEDICAL DIAGNOSTICS (NABL)\nComplete Blood Count (CBC)\nRef by: Dr. S. Menon\n\nHaemoglobin        10.4 g/dL      (12.0-15.0)  L\nRBC count          4.3 million/uL (3.8-4.8)\nMCV                78 fL          (80-100)     L\nHaematocrit        36.2 %         (36-46)\nTotal WBC          7.8 thou/uL    (4.0-10.0)\nPlatelet count     2.4 lakh/uL    (1.5-4.1)\n\nSmear: mild microcytosis. Correlate clinically.`,
      };

    case "prescription":
      return {
        title: "Prescription · Dr. Meera Iyer",
        facility: "Sunrise Family Clinic",
        doctor: "Dr. Meera Iyer",
        eventDate: today,
        details: {
          doctor: { name: "Dr. Meera Iyer", qualification: "MBBS, MD (General Medicine)", regNo: "KMC 48213", clinic: "Sunrise Family Clinic, Indiranagar", phone: "+91 80 4123 7788" },
          complaints: ["Fever for 3 days", "Sore throat", "Body ache"],
          diagnosis: ["Acute pharyngitis"],
          vitals: [
            { label: "Temp", value: "100.6 °F" },
            { label: "BP", value: "118/76" },
            { label: "Pulse", value: "92 bpm" },
            { label: "SpO₂", value: "98%" },
          ],
          medicines: [
            { name: "Azithromycin", strength: "500 mg", form: "tablet", dose: "1 tablet", schedule: "1-0-0", timing: "after_food", durationDays: 3 },
            { name: "Paracetamol", strength: "650 mg", form: "tablet", dose: "1 tablet", schedule: "1-1-1", timing: "after_food", durationDays: 5, note: "Only if temperature is above 100 °F" },
            { name: "Chlorhexidine gargle", strength: "0.2%", form: "other", dose: "10 ml", schedule: "1-0-1", timing: "after_food", durationDays: 5, note: "Gargle, don't swallow" },
            { name: "Pantoprazole", strength: "40 mg", form: "tablet", dose: "1 tablet", schedule: "1-0-0", timing: "empty_stomach", durationDays: 5 },
          ],
          tests: ["Complete blood count (CBC)", "C-reactive protein (CRP)"],
          advice: ["Warm salt-water gargles, three times a day", "Plenty of fluids", "Rest your voice"],
          followUp: day(today, 5),
        },
        values: [],
        rawText: "Dr. Meera Iyer MBBS MD · Reg KMC 48213\nSunrise Family Clinic\n\nC/o fever x 3 days, sore throat\nDx: Acute pharyngitis\n\nRx\n1. Tab Azithromycin 500 1-0-0 x 3d A/F\n2. Tab Paracetamol 650 1-1-1 x 5d SOS\n3. Chlorhexidine gargle 1-0-1 x 5d\n4. Tab Pantoprazole 40 1-0-0 x 5d B/F\n\nInv: CBC, CRP\nReview after 5 days",
      };

    case "scan":
      return {
        title: "MRI lumbar spine",
        facility: "Aarthi Scans & Labs",
        doctor: "Dr. K. Prakash",
        eventDate: today,
        details: {
          modality: "mri",
          bodyPart: "Lumbar spine",
          technique: "Sagittal and axial T1 and T2 weighted images, 1.5 Tesla",
          contrast: false,
          clinicalNote: "Low back pain radiating to the left leg for 6 weeks.",
          findings: [
            "Normal lumbar lordosis is maintained.",
            "Vertebral bodies are normal in height and marrow signal.",
            "L4-L5: diffuse disc bulge with a left paracentral protrusion, indenting the thecal sac and touching the left traversing L5 nerve root.",
            "L5-S1: mild disc desiccation without significant bulge.",
            "Conus ends normally at L1.",
          ],
          impression: [
            "L4-L5 left paracentral disc protrusion contacting the left L5 nerve root.",
            "Early degenerative change at L5-S1.",
          ],
          radiologist: "Dr. K. Prakash, MD (Radiology)",
          referredBy: "Dr. A. Shetty (Orthopaedics)",
        },
        values: [],
        rawText: "AARTHI SCANS & LABS\nMRI LUMBAR SPINE (PLAIN)\n\nFINDINGS: ... L4-L5 diffuse disc bulge with left paracentral protrusion ...\n\nIMPRESSION: L4-L5 left paracentral disc protrusion contacting left L5 nerve root.",
      };

    case "discharge":
      return {
        title: "Discharge summary · Manipal Hospital",
        facility: "Manipal Hospital, Old Airport Road",
        doctor: "Dr. R. Kulkarni",
        eventDate: day(today, -1),
        details: {
          hospital: "Manipal Hospital, Old Airport Road",
          admittedOn: day(today, -4),
          dischargedOn: day(today, -1),
          ward: "General ward, Room 412",
          consultant: "Dr. R. Kulkarni, MS (General Surgery)",
          reason: "Pain in the right lower abdomen with fever and vomiting.",
          diagnosis: ["Acute appendicitis"],
          procedures: [{ name: "Laparoscopic appendicectomy", date: day(today, -3) }],
          course: "Admitted and started on IV antibiotics. Laparoscopic appendicectomy done under general anaesthesia on day 2. Recovery uneventful; tolerating a normal diet and walking independently at discharge.",
          medicines: [
            { name: "Cefuroxime", strength: "500 mg", form: "tablet", dose: "1 tablet", schedule: "1-0-1", timing: "after_food", durationDays: 5 },
            { name: "Paracetamol", strength: "650 mg", form: "tablet", dose: "1 tablet", schedule: "1-1-1", timing: "after_food", durationDays: 3 },
            { name: "Pantoprazole", strength: "40 mg", form: "tablet", dose: "1 tablet", schedule: "1-0-0", timing: "empty_stomach", durationDays: 5 },
          ],
          instructions: ["Keep the wound dry for 5 days", "No lifting over 5 kg for 4 weeks", "Soft, light diet for a week", "Walk a little every few hours"],
          warningSigns: ["Fever above 100.4 °F", "Redness, swelling or discharge from the wound", "Severe abdominal pain or vomiting"],
          followUp: { date: day(today, 6), with: "Dr. R. Kulkarni, Surgery OPD" },
        },
        values: [],
        rawText: "MANIPAL HOSPITAL · DISCHARGE SUMMARY\nDiagnosis: Acute appendicitis\nProcedure: Lap appendicectomy\nCondition at discharge: stable\nFollow up in Surgery OPD after 1 week",
      };

    case "bill":
      return {
        title: "Pharmacy bill · Apollo Pharmacy",
        facility: "Apollo Pharmacy, HSR Layout",
        doctor: null,
        eventDate: today,
        details: {
          billNo: "APH/HSR/2627/08841",
          vendor: "Apollo Pharmacy, HSR Layout",
          vendorKind: "pharmacy",
          gstin: "29AABCA1234F1Z5",
          items: [
            { name: "Azithromycin 500 mg (3 tab)", category: "Medicines", qty: 1, rate: 118.5, amount: 118.5 },
            { name: "Paracetamol 650 mg (15 tab)", category: "Medicines", qty: 1, rate: 33.6, amount: 33.6 },
            { name: "Chlorhexidine mouthwash 150 ml", category: "Medicines", qty: 1, rate: 92, amount: 92 },
            { name: "Pantoprazole 40 mg (15 tab)", category: "Medicines", qty: 1, rate: 145, amount: 145 },
            { name: "Digital thermometer", category: "Devices", qty: 1, rate: 249, amount: 249 },
          ],
          subtotal: 638.1,
          discount: 63.81,
          taxes: [
            { label: "CGST 6%", amount: 17.23 },
            { label: "SGST 6%", amount: 17.23 },
          ],
          total: 608.75,
          paid: 608.75,
          paymentMode: "UPI",
          status: "paid",
          claimable: false,
        },
        values: [],
        rawText: "APOLLO PHARMACY · HSR LAYOUT\nGSTIN 29AABCA1234F1Z5\nBill APH/HSR/2627/08841\n...\nNet payable 608.75 · Paid by UPI",
      };

    case "consultation_invoice":
      return {
        title: "Consultation · Dr. Meera Iyer",
        facility: "Sunrise Family Clinic",
        doctor: "Dr. Meera Iyer",
        eventDate: today,
        details: {
          invoiceNo: "SFC-2627-00413",
          issuedAt: `${today}T18:05:00+05:30`,
          doctor: { name: "Dr. Meera Iyer", specialty: "General physician", clinic: "Sunrise Family Clinic" },
          mode: "clinic",
          appointment: { day: today, slot: "6:00 pm – 6:15 pm" },
          lines: [
            { label: "Consultation fee", amount: 600 },
            { label: "Registration", amount: 100 },
          ],
          total: 700,
          status: "paid",
          paymentMode: "Card",
        },
        values: [],
        rawText: "SUNRISE FAMILY CLINIC\nReceipt SFC-2627-00413\nConsultation - Dr. Meera Iyer 600.00\nRegistration 100.00\nTotal 700.00 · Paid by card",
      };

    case "booking_invoice":
      return {
        title: "Lab booking · Healthians",
        facility: "Healthians",
        doctor: null,
        eventDate: today,
        details: {
          invoiceNo: "HLT-9921-4410",
          issuedAt: `${today}T09:30:00+05:30`,
          partner: "Healthians",
          tests: [
            { name: "Thyroid profile (T3, T4, TSH)", price: 499 },
            { name: "Vitamin D (25-OH)", price: 899 },
          ],
          collectionFee: 0,
          subtotal: 1398,
          total: 1398,
          status: "paid",
          slot: { date: day(today, 1), window: "6-8 am" },
        },
        values: [],
        rawText: "HEALTHIANS · BOOKING INVOICE HLT-9921-4410\nThyroid profile 499\nVitamin D 899\nTotal 1398 · Paid",
      };

    case "vaccination":
      return {
        title: "Hepatitis B vaccine · Dose 2",
        facility: "Rainbow Children's Hospital",
        doctor: "Dr. P. Shah",
        eventDate: today,
        details: {
          vaccine: "Hepatitis B (Engerix-B)",
          protectsAgainst: "Hepatitis B",
          dose: 2,
          doses: 3,
          givenOn: today,
          batch: "AHBVC482AA",
          site: "Left upper arm (deltoid)",
          givenBy: "Sr. Nirmala K., under Dr. P. Shah",
          centre: "Rainbow Children's Hospital, Marathahalli",
          nextDue: day(today, 150),
          certificateId: null,
        },
        values: [],
        rawText: "RAINBOW CHILDREN'S HOSPITAL\nImmunisation record\nHepatitis B - Dose 2\nBatch AHBVC482AA · Left deltoid\nNext dose due in 5 months",
      };

    case "insurance":
      return {
        title: "Family health insurance · Star Health",
        facility: "Star Health and Allied Insurance",
        doctor: null,
        eventDate: day(today, -200),
        details: {
          insurer: "Star Health and Allied Insurance",
          plan: "Family Health Optima",
          policyNo: "P/171115/01/2026/004821",
          policyType: "family_floater",
          start: day(today, -200),
          end: day(today, 164),
          sumInsured: 1000000,
          claimed: 145000,
          premium: { amount: 28450, frequency: "yearly" },
          members: [
            { name: "Athar", relation: "Self" },
            { name: "Sana", relation: "Spouse" },
            { name: "Amma", relation: "Mother" },
            { name: "Zoya", relation: "Daughter" },
          ],
          tpa: { name: "Star Health (in-house)", phone: "1800 425 2255" },
          cashless: true,
          coPay: "20% for members over 60",
          roomRent: "Up to 1% of sum insured per day",
          waitingPeriods: [
            { label: "Pre-existing conditions", until: day(today, 895) },
            { label: "Named illnesses (cataract, hernia)", until: day(today, 165) },
          ],
          claims: [{ id: "CLI/2026/081142", date: day(today, -40), amount: 145000, status: "settled" }],
        },
        values: [],
        rawText: "STAR HEALTH AND ALLIED INSURANCE\nFamily Health Optima · Policy P/171115/01/2026/004821\nSum insured Rs 10,00,000 · Floater\nInsured: Athar, Sana, Amma, Zoya",
      };

    case "medication":
      return {
        title: "Current medicines",
        facility: "MedPlus, Koramangala",
        doctor: "Dr. N. Raghavan",
        eventDate: today,
        details: {
          source: "pharmacy",
          pharmacy: "MedPlus, Koramangala",
          prescribedBy: "Dr. N. Raghavan (Endocrinology)",
          startedOn: today,
          medicines: [
            { name: "Metformin", strength: "500 mg", form: "tablet", dose: "1 tablet", schedule: "1-0-1", timing: "after_food", durationDays: 90, qty: 180, expiry: day(today, 540) },
            { name: "Thyronorm", strength: "50 mcg", form: "tablet", dose: "1 tablet", schedule: "1-0-0", timing: "empty_stomach", durationDays: 90, qty: 90, expiry: day(today, 400), note: "30 minutes before breakfast" },
            { name: "Atorvastatin", strength: "10 mg", form: "tablet", dose: "1 tablet", schedule: "0-0-1", timing: "bedtime", durationDays: 90, qty: 90, expiry: day(today, 610) },
          ],
        },
        values: [],
        rawText: "MEDPLUS KORAMANGALA\nMetformin 500 x180\nThyronorm 50mcg x90\nAtorvastatin 10 x90",
      };

    case "other":
      return { title: "Document", facility: null, doctor: null, eventDate: today, details: {}, values: [], rawText: "" };
  }
}

/*
 * Which kind of document a file probably is, from its name. A real reader
 * would look at the page; the mock can only look at the label. The person
 * can always say otherwise on the upload screen or on the record itself.
 */
const HINTS: [RegExp, DocType][] = [
  [/discharge|dischg/i, "discharge"],
  [/insur|policy|e-?card|tpa|mediclaim/i, "insurance"],
  [/vacc|immuni|vaccine|dose/i, "vaccination"],
  [/consult|opd.?receipt/i, "consultation_invoice"],
  [/booking|order/i, "booking_invoice"],
  [/bill|receipt|invoice/i, "bill"],
  [/x-?ray|mri|\bct\b|usg|ultrasound|sonograph|radiolog|ecg|echo|mammo/i, "scan"],
  [/rx|prescri|presc/i, "prescription"],
  [/medic|pharma|tablet|strip|meds/i, "medication"],
];

export function guessDocType(fileName: string): DocType {
  for (const [re, type] of HINTS) if (re.test(fileName)) return type;
  return "lab_report";
}
