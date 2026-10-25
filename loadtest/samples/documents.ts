import { pick, uuid, type Account, type Member, type Rng } from "./population";

/*
 * SAMPLE UPLOADS: REAL PDFS WITH AN ANSWER KEY.
 *
 * Each one is a one-page lab report built from a member's own lab values, so
 * the same file serves two tests: load (the storage bucket only takes JPEG,
 * PNG, HEIC and PDF, migration 0005) and accuracy (what an extractor should
 * read off it is known exactly).
 *
 * One in ten is uploaded under the WRONG member: the report names Imaad, the
 * upload was filed from Nisha's screen. Reading the patient name and saying
 * "this looks like Imaad's, move it?" is how the mapping step keeps one
 * person's results out of another's memory. `uploadedTo` is where it was
 * filed; `truth.profile` is where it belongs.
 */

export type SampleDocument = {
  id: string;
  account: string;
  uploadedTo: string;
  wrongPerson: boolean;
  canary: string;
  mimeType: "application/pdf";
  pdfBase64: string;
  truth: {
    profile: string;
    patientName: string;
    sex: string;
    ageYears: number;
    eventDate: string;
    facility: string;
    entities: { name: string; value: number; unit: string; refRange: string; flag: string }[];
  };
};

/** A minimal, valid single-page PDF of text lines (Helvetica, A4). */
export function pdf(lines: readonly string[]): Buffer {
  const esc = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`).replace(/[^\x20-\x7e]/g, "?");
  const text = lines.map((l, i) => `BT /F1 ${i === 0 ? 14 : 10} Tf 50 ${790 - i * 18} Td (${esc(l)}) Tj ET`).join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`,
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((o, i) => {
    offsets.push(Buffer.byteLength(out));
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

const pad = (s: string, n: number) => (s.length >= n ? `${s} ` : s + " ".repeat(n - s.length));

export function makeDocuments(r: Rng, population: readonly Account[], count: number): SampleDocument[] {
  const out: SampleDocument[] = [];
  while (out.length < count) {
    const a = pick(r, population);
    const patient = pick(r, a.members) as Member;
    const bundle = a.bundles[patient.id];
    const labs = (bundle?.documents ?? []).filter((d) => d.doc_type === "lab_report");
    if (!labs.length) continue;
    const doc = pick(r, labs);
    const values = (bundle?.entities ?? []).filter((e) => e.document_id === doc.id);
    if (!values.length) continue;

    const others = a.members.filter((m) => m.id !== patient.id);
    const wrong = others.length > 0 && r() < 0.1;
    const uploadedTo = wrong ? pick(r, others).id : patient.id;
    const entities = values.map((e) => ({ name: String(e.name), value: Number(e.value), unit: String(e.unit), refRange: String(e.ref_range), flag: String(e.flag) }));
    const age = Math.max(0, Math.floor(patient.ageYears));
    const lines = [
      // As written, never upper-cased: the canary inside must survive an extractor's read.
      String(doc.facility),
      "Department of Laboratory Medicine",
      `Patient: ${patient.name}    Age/Sex: ${age}/${patient.sex === "female" ? "F" : "M"}    Ref. by: Self`,
      `Collected: ${String(doc.event_date)}    Report ID: ${uuid(r).slice(0, 8).toUpperCase()}`,
      "",
      `${pad("Test", 28)}${pad("Result", 10)}${pad("Unit", 10)}Reference range`,
      ...entities.map((e) => `${pad(e.name, 28)}${pad(String(e.value) + (e.flag === "high" ? " H" : e.flag === "low" ? " L" : ""), 10)}${pad(e.unit, 10)}${e.refRange}`),
      "",
      "This is a computer generated report. Synthetic test data, not a real patient.",
    ];
    out.push({
      id: uuid(r),
      account: a.id,
      uploadedTo,
      wrongPerson: wrong,
      canary: patient.canary,
      mimeType: "application/pdf",
      pdfBase64: pdf(lines).toString("base64"),
      truth: { profile: patient.id, patientName: patient.name, sex: patient.sex, ageYears: age, eventDate: String(doc.event_date), facility: String(doc.facility), entities },
    });
  }
  return out;
}
