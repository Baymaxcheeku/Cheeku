/*
 * Disposable demo documents, for looking at the records UI with real variety.
 *
 * NOT A MIGRATION. Migrations are schema and permanent; this is throwaway
 * content for one account on a development database. Run it, look at the
 * screens, delete it.
 *
 *   npx tsx --env-file-if-exists=.env.local scripts/seed-demo-documents.ts
 *   npx tsx --env-file-if-exists=.env.local scripts/seed-demo-documents.ts --clean
 *
 * Every row it writes is tagged in `raw_text` with the marker below, so
 * --clean removes exactly what this wrote and nothing a person uploaded.
 *
 * ┌─ WHAT THESE DOCUMENTS ARE NOT ───────────────────────────────────────────┐
 * │                                                                          │
 * │ There is no file behind them. `storage_path` points at nothing, so the   │
 * │ record DETAIL screen will fail to produce a signed URL and the original- │
 * │ document view will be empty. The list, the timeline, the health file and │
 * │ the dashboard all read from the row and the entities, so those are the   │
 * │ screens this is for.                                                     │
 * │                                                                          │
 * │ The values are plausible but invented. Do not read anything into them,   │
 * │ and do not leave them in an account anyone might mistake for their own.  │
 * │                                                                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

import { Client } from "pg";

const MARKER = "DEMO-SEED-DOCUMENTS";

type Entity = {
  kind: "lab_value" | "medication" | "vital" | "vaccine" | "condition";
  name: string;
  value?: number;
  valueText?: string;
  unit?: string;
  refRange?: string;
  flag?: "normal" | "high" | "low" | "caution";
};

type Doc = {
  who: "Athar" | "Ananya";
  docType: "lab_report" | "prescription" | "discharge" | "scan" | "vaccination" | "bill" | "other";
  title: string;
  eventDate: string;
  facility: string | null;
  doctor: string | null;
  status?: "filed" | "needs_review";
  entities?: Entity[];
};

/*
 * One of every document type, split across two people, spread over five months
 * so the timeline actually groups — a demo set that all lands on one day tells
 * you nothing about how the screen behaves.
 */
const DOCS: Doc[] = [
  {
    who: "Athar",
    docType: "prescription",
    title: "Metformin and Vitamin D",
    eventDate: "2026-07-28",
    facility: "Apollo Clinic, Indiranagar",
    doctor: "Dr Meera Rao",
    entities: [
      { kind: "medication", name: "Metformin", valueText: "500 mg, twice daily" },
      { kind: "medication", name: "Vitamin D3", valueText: "60,000 IU, weekly" },
    ],
  },
  {
    who: "Athar",
    docType: "scan",
    title: "Chest X-ray, PA view",
    eventDate: "2026-06-14",
    facility: "Lucid Medical Diagnostics",
    doctor: "Dr Sanjay Iyer",
    entities: [{ kind: "vital", name: "Reported finding", valueText: "No acute abnormality", flag: "normal" }],
  },
  {
    who: "Athar",
    docType: "vaccination",
    title: "Tdap booster",
    eventDate: "2026-05-02",
    facility: "Apollo Clinic, Indiranagar",
    doctor: null,
    entities: [{ kind: "vaccine", name: "Tdap", valueText: "Dose 1 of 1" }],
  },
  {
    who: "Athar",
    docType: "bill",
    title: "Consultation invoice",
    eventDate: "2026-07-28",
    facility: "Apollo Clinic, Indiranagar",
    doctor: null,
  },
  {
    who: "Ananya",
    docType: "lab_report",
    title: "Thyroid profile",
    eventDate: "2026-07-19",
    facility: "Lucid Medical Diagnostics",
    doctor: "Dr Meera Rao",
    entities: [
      { kind: "lab_value", name: "TSH", value: 5.4, unit: "mIU/L", refRange: "0.4-4.0", flag: "caution" },
      { kind: "lab_value", name: "Free T4", value: 1.1, unit: "ng/dL", refRange: "0.8-1.8", flag: "normal" },
    ],
  },
  {
    who: "Ananya",
    docType: "lab_report",
    title: "Vitamin B12 and D",
    eventDate: "2026-06-30",
    facility: "Lucid Medical Diagnostics",
    doctor: null,
    entities: [
      { kind: "lab_value", name: "Vitamin B12", value: 148, unit: "pg/mL", refRange: "200-900", flag: "low" },
      { kind: "lab_value", name: "Vitamin D", value: 22, unit: "ng/mL", refRange: "30-100", flag: "low" },
    ],
  },
  {
    who: "Ananya",
    docType: "discharge",
    title: "Day-care procedure summary",
    eventDate: "2026-04-11",
    facility: "Fortis Hospital, Bannerghatta",
    doctor: "Dr Kavita Nair",
    status: "needs_review",
  },
  {
    who: "Ananya",
    docType: "other",
    title: "Insurance card",
    eventDate: "2026-03-05",
    facility: null,
    doctor: null,
  },
];

const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL ?? "aliathar241@gmail.com";

async function main() {
  const clean = process.argv.includes("--clean");
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const { rows: owners } = await client.query(
    `select u.id from auth.users u where u.email = $1`,
    [OWNER_EMAIL],
  );
  const userId = owners[0]?.id as string | undefined;
  if (!userId) throw new Error(`No account for ${OWNER_EMAIL}`);

  if (clean) {
    const { rowCount } = await client.query(
      `delete from documents where user_id = $1 and raw_text like $2`,
      [userId, `${MARKER}%`],
    );
    console.log(`removed ${rowCount} demo document(s)`);
    await client.end();
    return;
  }

  const { rows: profiles } = await client.query(
    `select id, name from profiles where user_id = $1 order by is_primary desc, created_at`,
    [userId],
  );

  // Entities cascade with the document, so a re-run cleans itself up first
  // rather than stacking a second identical set on top.
  await client.query(`delete from documents where user_id = $1 and raw_text like $2`, [
    userId,
    `${MARKER}%`,
  ]);

  let written = 0;
  for (const doc of DOCS) {
    const profile = profiles.find((p) => String(p.name).toLowerCase() === doc.who.toLowerCase());
    if (!profile) {
      console.log(`  skipped ${doc.title}: no profile named ${doc.who}`);
      continue;
    }

    const { rows } = await client.query(
      `insert into documents
         (profile_id, user_id, storage_path, mime_type, doc_type, status,
          event_date, facility, doctor, confidence, raw_text, extraction)
       values ($1,$2,$3,'application/pdf',$4,$5,$6,$7,$8,0.92,$9,$10)
       returning id`,
      [
        profile.id,
        userId,
        `${userId}/${profile.id}/demo-${Math.random().toString(36).slice(2)}.pdf`,
        doc.docType,
        doc.status ?? "filed",
        doc.eventDate,
        doc.facility,
        doc.doctor,
        `${MARKER} — invented content, no file behind it.`,
        JSON.stringify({ title: doc.title, fields: [], values: [] }),
      ],
    );

    const documentId = rows[0].id as string;

    for (const e of doc.entities ?? []) {
      await client.query(
        `insert into entities
           (profile_id, user_id, document_id, kind, name, canonical_name,
            value, value_text, unit, ref_range, flag, event_date)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          profile.id,
          userId,
          documentId,
          e.kind,
          e.name,
          e.name.toLowerCase(),
          e.value ?? null,
          e.valueText ?? null,
          e.unit ?? null,
          e.refRange ?? null,
          e.flag ?? null,
          doc.eventDate,
        ],
      );
    }

    written += 1;
    console.log(`  ${doc.who.padEnd(7)} ${doc.docType.padEnd(13)} ${doc.title}`);
  }

  console.log(`\nwrote ${written} demo document(s). Remove them with --clean.`);
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
