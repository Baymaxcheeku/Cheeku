/*
 * The demo family. Single source of truth for both `pnpm seed` and the mock AI
 * adapters, so a citation the chat mock returns always points at a document
 * that actually exists in the database.
 *
 * IDs are fixed, not generated. Deterministic ids mean a seeded database, a
 * mock response and a screenshot in a bug report all refer to the same row.
 *
 * This is synthetic data resembling real Indian lab reports. It is not, and
 * must never become, anyone's actual medical record.
 */

export type SeedEntity = {
  id: string;
  kind: "lab_value" | "medication" | "condition" | "vital" | "vaccine";
  name: string;
  canonicalName?: string;
  value?: number;
  valueText?: string;
  unit?: string;
  refRange?: string;
  flag?: "normal" | "high" | "low" | "caution";
  eventDate: string;
};

export type SeedDocument = {
  id: string;
  docType: "lab_report" | "prescription" | "discharge" | "scan" | "bill" | "vaccination" | "other";
  status: "processing" | "needs_review" | "filed";
  mimeType: "image/jpeg" | "image/png" | "image/heic" | "application/pdf";
  title: string;
  eventDate: string;
  facility: string;
  doctor?: string;
  confidence: number;
  rawText: string;
  entities: SeedEntity[];
};

export type SeedTimelineEvent = {
  id: string;
  kind: string;
  title: string;
  summary: string;
  eventDate: string;
  sourceDocumentId?: string;
};

export type SeedProfile = {
  id: string;
  name: string;
  dob: string;
  sex: "female" | "male" | "other" | "prefer_not_to_say";
  relationship: string;
  avatarRing: string;
  isPrimary: boolean;
  conditions: string[];
  medications: { name: string; dose: string; frequency: string }[];
  documents: SeedDocument[];
  timeline: SeedTimelineEvent[];
};

const id = (n: string) => `00000000-0000-4000-8000-${n.padStart(12, "0")}`;

export const SEED_PROFILES: readonly SeedProfile[] = [
  {
    id: id("101"),
    name: "Athar",
    dob: "1990-03-14",
    sex: "male",
    relationship: "self",
    avatarRing: "brand-600",
    isPrimary: true,
    conditions: [],
    medications: [],
    documents: [
      {
        id: id("201"),
        docType: "lab_report",
        status: "filed",
        mimeType: "application/pdf",
        title: "Annual full-body health panel",
        eventDate: "2026-05-18",
        facility: "Apollo Diagnostics, Banjara Hills",
        doctor: "Dr. R. Kulkarni",
        confidence: 0.94,
        rawText:
          "COMPREHENSIVE HEALTH CHECK. Haemoglobin 14.8 g/dL (13.0-17.0). " +
          "Total Cholesterol 213 mg/dL (<200). LDL 138 mg/dL (<100). " +
          "HDL 46 mg/dL (>40). Fasting glucose 92 mg/dL (70-100). " +
          "TSH 2.1 uIU/mL (0.4-4.0). Vitamin D 22 ng/mL (30-100).",
        entities: [
          {
            id: id("301"),
            kind: "lab_value",
            name: "Haemoglobin",
            canonicalName: "hemoglobin",
            value: 14.8,
            unit: "g/dL",
            refRange: "13.0-17.0",
            flag: "normal",
            eventDate: "2026-05-18",
          },
          {
            id: id("302"),
            kind: "lab_value",
            name: "Total Cholesterol",
            canonicalName: "cholesterol_total",
            value: 213,
            unit: "mg/dL",
            refRange: "<200",
            flag: "high",
            eventDate: "2026-05-18",
          },
          {
            id: id("303"),
            kind: "lab_value",
            name: "LDL Cholesterol",
            canonicalName: "cholesterol_ldl",
            value: 138,
            unit: "mg/dL",
            refRange: "<100",
            flag: "high",
            eventDate: "2026-05-18",
          },
          {
            id: id("304"),
            kind: "lab_value",
            name: "Vitamin D (25-OH)",
            canonicalName: "vitamin_d",
            value: 22,
            unit: "ng/mL",
            refRange: "30-100",
            flag: "low",
            eventDate: "2026-05-18",
          },
          {
            id: id("305"),
            kind: "lab_value",
            name: "Fasting Glucose",
            canonicalName: "glucose_fasting",
            value: 92,
            unit: "mg/dL",
            refRange: "70-100",
            flag: "normal",
            eventDate: "2026-05-18",
          },
        ],
      },
    ],
    timeline: [
      {
        id: id("401"),
        kind: "lab_report",
        title: "Annual health panel",
        summary: "Most values in range. Cholesterol and LDL slightly above range; vitamin D low.",
        eventDate: "2026-05-18",
        sourceDocumentId: id("201"),
      },
    ],
  },
  {
    id: id("102"),
    name: "Ananya",
    dob: "1994-08-02",
    sex: "female",
    relationship: "spouse",
    avatarRing: "brand-400",
    isPrimary: false,
    conditions: ["PCOS", "Pregnancy, 24 weeks"],
    medications: [
      { name: "Folic acid", dose: "5 mg", frequency: "once daily" },
      { name: "Iron + folic acid", dose: "100 mg", frequency: "once daily" },
    ],
    documents: [
      {
        id: id("202"),
        docType: "scan",
        status: "filed",
        mimeType: "application/pdf",
        title: "20-week anomaly scan",
        eventDate: "2026-06-12",
        facility: "Rainbow Children's Hospital",
        doctor: "Dr. S. Menon",
        confidence: 0.91,
        rawText:
          "LEVEL II ULTRASOUND (ANOMALY SCAN). Single live intrauterine gestation. " +
          "Gestational age 20 weeks 2 days by biometry. Cardiac activity present, FHR 148 bpm. " +
          "No gross structural anomaly detected. Placenta anterior, upper segment, grade I. " +
          "Liquor adequate (AFI 14.2 cm). EFW 340 g.",
        entities: [
          {
            id: id("306"),
            kind: "vital",
            name: "Fetal heart rate",
            canonicalName: "fetal_heart_rate",
            value: 148,
            unit: "bpm",
            refRange: "110-160",
            flag: "normal",
            eventDate: "2026-06-12",
          },
          {
            id: id("307"),
            kind: "condition",
            name: "Gestational age",
            valueText: "20 weeks 2 days",
            flag: "normal",
            eventDate: "2026-06-12",
          },
        ],
      },
      {
        id: id("203"),
        docType: "lab_report",
        status: "filed",
        mimeType: "image/jpeg",
        title: "Complete blood count",
        eventDate: "2026-06-14",
        facility: "Vijaya Diagnostic Centre",
        doctor: "Dr. S. Menon",
        confidence: 0.88,
        rawText:
          "COMPLETE BLOOD COUNT. Haemoglobin 10.4 g/dL (12.0-15.0). " +
          "RBC 3.9 million/uL. WBC 8,200 /uL (4,000-11,000). " +
          "Platelets 2.4 lakh/uL (1.5-4.1). MCV 78 fL (80-100).",
        entities: [
          {
            id: id("308"),
            kind: "lab_value",
            name: "Haemoglobin",
            canonicalName: "hemoglobin",
            value: 10.4,
            unit: "g/dL",
            refRange: "12.0-15.0",
            flag: "low",
            eventDate: "2026-06-14",
          },
          {
            id: id("309"),
            kind: "lab_value",
            name: "MCV",
            canonicalName: "mcv",
            value: 78,
            unit: "fL",
            refRange: "80-100",
            flag: "low",
            eventDate: "2026-06-14",
          },
          {
            id: id("310"),
            kind: "lab_value",
            name: "Platelet count",
            canonicalName: "platelets",
            value: 2.4,
            unit: "lakh/uL",
            refRange: "1.5-4.1",
            flag: "normal",
            eventDate: "2026-06-14",
          },
        ],
      },
      {
        id: id("204"),
        docType: "prescription",
        // Handwritten. Deliberately left in needs_review so the amber
        // review path is visible in a fresh demo without uploading anything.
        status: "needs_review",
        mimeType: "image/jpeg",
        title: "Antenatal prescription (handwritten)",
        eventDate: "2026-06-14",
        facility: "Rainbow Children's Hospital",
        doctor: "Dr. S. Menon",
        confidence: 0.61,
        rawText:
          "Tab. Orofer XT 1-0-0 x 30 days. Tab. Folvite 5mg 1-0-0. " +
          "Cap. Shelcal 500 1-0-1. Review after 4 weeks.",
        entities: [
          {
            id: id("311"),
            kind: "medication",
            name: "Orofer XT",
            canonicalName: "ferrous_ascorbate",
            valueText: "1-0-0, 30 days",
            flag: "caution",
            eventDate: "2026-06-14",
          },
          {
            id: id("312"),
            kind: "medication",
            name: "Folvite 5mg",
            canonicalName: "folic_acid",
            valueText: "1-0-0",
            flag: "normal",
            eventDate: "2026-06-14",
          },
        ],
      },
      {
        id: id("205"),
        docType: "bill",
        status: "filed",
        mimeType: "application/pdf",
        title: "Ultrasound bill",
        eventDate: "2026-06-12",
        facility: "Rainbow Children's Hospital",
        confidence: 0.96,
        rawText: "Level II Ultrasound (Anomaly Scan), Rs. 3,200. GST included. Receipt 2026/06/4471.",
        entities: [],
      },
    ],
    timeline: [
      {
        id: id("402"),
        kind: "scan",
        title: "20-week anomaly scan",
        summary: "No structural anomaly detected. Growth appropriate for dates.",
        eventDate: "2026-06-12",
        sourceDocumentId: id("202"),
      },
      {
        id: id("403"),
        kind: "lab_report",
        title: "Complete blood count",
        summary: "Haemoglobin 10.4 g/dL, below the range quoted on the report.",
        eventDate: "2026-06-14",
        sourceDocumentId: id("203"),
      },
    ],
  },
  {
    id: id("103"),
    name: "Amma",
    dob: "1965-01-27",
    sex: "female",
    relationship: "mother",
    avatarRing: "brand-800",
    isPrimary: false,
    conditions: ["Type 2 diabetes", "Hypertension"],
    medications: [
      { name: "Metformin", dose: "500 mg", frequency: "twice daily" },
      { name: "Telmisartan", dose: "40 mg", frequency: "once daily" },
    ],
    documents: [
      // Three HbA1c reports across 18 months so the trend line and timeline
      // have something real to draw. Values drift up then improve.
      {
        id: id("206"),
        docType: "lab_report",
        status: "filed",
        mimeType: "application/pdf",
        title: "HbA1c: December 2024",
        eventDate: "2024-12-15",
        facility: "Lucid Medical Diagnostics",
        doctor: "Dr. P. Reddy",
        confidence: 0.95,
        rawText: "GLYCOSYLATED HAEMOGLOBIN (HbA1c) 7.4 % (Non-diabetic <5.7, Good control <7.0).",
        entities: [
          {
            id: id("313"),
            kind: "lab_value",
            name: "HbA1c",
            canonicalName: "hba1c",
            value: 7.4,
            unit: "%",
            refRange: "<7.0",
            flag: "high",
            eventDate: "2024-12-15",
          },
        ],
      },
      {
        id: id("207"),
        docType: "lab_report",
        status: "filed",
        mimeType: "application/pdf",
        title: "HbA1c: September 2025",
        eventDate: "2025-09-08",
        facility: "Lucid Medical Diagnostics",
        doctor: "Dr. P. Reddy",
        confidence: 0.95,
        rawText:
          "GLYCOSYLATED HAEMOGLOBIN (HbA1c) 8.1 % (Non-diabetic <5.7, Good control <7.0). " +
          "Fasting glucose 154 mg/dL (70-100).",
        entities: [
          {
            id: id("314"),
            kind: "lab_value",
            name: "HbA1c",
            canonicalName: "hba1c",
            value: 8.1,
            unit: "%",
            refRange: "<7.0",
            flag: "high",
            eventDate: "2025-09-08",
          },
          {
            id: id("315"),
            kind: "lab_value",
            name: "Fasting Glucose",
            canonicalName: "glucose_fasting",
            value: 154,
            unit: "mg/dL",
            refRange: "70-100",
            flag: "high",
            eventDate: "2025-09-08",
          },
        ],
      },
      {
        id: id("208"),
        docType: "lab_report",
        status: "filed",
        mimeType: "application/pdf",
        title: "HbA1c: June 2026",
        eventDate: "2026-06-30",
        facility: "Lucid Medical Diagnostics",
        doctor: "Dr. P. Reddy",
        confidence: 0.97,
        rawText:
          "GLYCOSYLATED HAEMOGLOBIN (HbA1c) 7.2 % (Non-diabetic <5.7, Good control <7.0). " +
          "Fasting glucose 128 mg/dL (70-100). Serum creatinine 0.9 mg/dL (0.6-1.1).",
        entities: [
          {
            id: id("316"),
            kind: "lab_value",
            name: "HbA1c",
            canonicalName: "hba1c",
            value: 7.2,
            unit: "%",
            refRange: "<7.0",
            flag: "high",
            eventDate: "2026-06-30",
          },
          {
            id: id("317"),
            kind: "lab_value",
            name: "Fasting Glucose",
            canonicalName: "glucose_fasting",
            value: 128,
            unit: "mg/dL",
            refRange: "70-100",
            flag: "high",
            eventDate: "2026-06-30",
          },
          {
            id: id("318"),
            kind: "lab_value",
            name: "Serum Creatinine",
            canonicalName: "creatinine",
            value: 0.9,
            unit: "mg/dL",
            refRange: "0.6-1.1",
            flag: "normal",
            eventDate: "2026-06-30",
          },
        ],
      },
      {
        id: id("209"),
        docType: "prescription",
        status: "filed",
        mimeType: "application/pdf",
        title: "Diabetes review prescription",
        eventDate: "2026-07-02",
        facility: "Care Hospitals, Hitech City",
        doctor: "Dr. P. Reddy",
        confidence: 0.93,
        rawText:
          "Tab. Metformin 500mg 1-0-1 after food. Tab. Telmisartan 40mg 1-0-0. " +
          "Continue for 3 months. Repeat HbA1c before next review.",
        entities: [
          {
            id: id("319"),
            kind: "medication",
            name: "Metformin 500mg",
            canonicalName: "metformin",
            valueText: "1-0-1 after food",
            flag: "normal",
            eventDate: "2026-07-02",
          },
          {
            id: id("320"),
            kind: "medication",
            name: "Telmisartan 40mg",
            canonicalName: "telmisartan",
            valueText: "1-0-0",
            flag: "normal",
            eventDate: "2026-07-02",
          },
        ],
      },
    ],
    timeline: [
      {
        id: id("404"),
        kind: "lab_report",
        title: "HbA1c 7.4%",
        summary: "First recorded reading in Baymax.",
        eventDate: "2024-12-15",
        sourceDocumentId: id("206"),
      },
      {
        id: id("405"),
        kind: "lab_report",
        title: "HbA1c 8.1%",
        summary: "Up 0.7 points from December 2024.",
        eventDate: "2025-09-08",
        sourceDocumentId: id("207"),
      },
      {
        id: id("406"),
        kind: "lab_report",
        title: "HbA1c 7.2%",
        summary: "Down 0.9 points from September 2025.",
        eventDate: "2026-06-30",
        sourceDocumentId: id("208"),
      },
      {
        id: id("407"),
        kind: "prescription",
        title: "Diabetes review",
        summary: "Metformin and telmisartan continued for 3 months.",
        eventDate: "2026-07-02",
        sourceDocumentId: id("209"),
      },
    ],
  },
];

export const SEED_DOCUMENTS = SEED_PROFILES.flatMap((p) =>
  p.documents.map((d) => ({ ...d, profileId: p.id })),
);
