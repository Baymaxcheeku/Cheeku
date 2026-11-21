// Reading an uploaded file: what it is, and what it says.
//
// THE "+" UPLOAD (2026-11-21). Until now the add-a-record screen never looked
// at the picture: a stand-in guessed the type from the file name and filled in
// sample text, so a photo of dinner opened as a prescription. This reads the
// file itself, with the same Gemini key the chat uses.
//
// The app uploads the file to its own private folder first; this function
// fetches it back WITH THE CALLER'S OWN TOKEN, so storage's row-level security
// decides whether they may read it. Nothing here can open anyone else's file.
// The file is not stored, copied or logged here.
//
// It says WHAT KIND OF THING the picture is before it reads it as a record:
// a lab report, a prescription, a bill... or a meal, a medicine strip, or
// something that isn't health paperwork at all. The app files the first kind
// and routes the rest (a meal to Today's plan, anything else to the chat).
//
// It reads; it never interprets. Values and flags are what the page printed.
// A date is only filled in when the page shows one.
//
// Keep this file free of imports so it can be joined into the paste file.

export const READ_TYPES = [
  "lab_report", "prescription", "discharge", "scan", "bill", "consultation_invoice", "booking_invoice",
  "vaccination", "insurance", "medication", "other_health", "meal", "not_health",
] as const;

export const READ_PROMPT = `You read one uploaded file for an Indian family health app and return JSON only.

First decide KIND:
- lab_report: blood, urine or other test results with values.
- prescription: a doctor's prescription, printed or handwritten.
- discharge: a hospital discharge summary.
- scan: an imaging report (X-ray, ultrasound, CT, MRI, ECG, echo).
- bill: a pharmacy or hospital bill. consultation_invoice: a doctor's consultation bill. booking_invoice: a lab or service booking receipt.
- vaccination: a vaccination card or record. insurance: a health insurance policy or card.
- medication: a photo of a medicine box, strip or bottle.
- other_health: health paperwork that fits none of the above.
- meal: a photo of food or a drink.
- not_health: anything else (a person, a place, a screenshot of something unrelated, a blank page).

Then read only what is printed or written. Never guess a value, a date, a name or a diagnosis.
- title: a short plain title, e.g. "Complete blood count", "Prescription from Dr Mehta", "Dinner: dal, rice, sabzi".
- eventDate: the date on the document as YYYY-MM-DD, or null if none is shown.
- facility: the lab, hospital, clinic or pharmacy name, or null. doctor: the doctor's name, or null. patientName: as printed, or null.
- values (lab_report, scan with numbers): each test with name, value, unit, the printed reference range, and flag: "high" or "low" only when outside the printed range or marked so on the page, "normal" when inside it, else null.
- medicines (prescription, medication, bill): name, strength, form (tablet, capsule, syrup, injection, drops, inhaler, cream, sachet, other), dose, schedule as [morning, afternoon, night] counts (e.g. 1-0-1 is [1,0,1]), timing (before_food, after_food, with_food, empty_stomach, bedtime, any), durationDays, asNeeded.
- foods (meal only): short everyday names of what is on the plate, e.g. "roti", "dal", "rice", "sabzi", "salad", "curd", "chai".
- summary: one plain sentence saying what this is, for the family's chat memory. No advice.
- confidence: 0 to 1, how clearly you could read it (handwriting and blur lower it).
- rawText: the readable text, up to 3000 characters, or "" for a photo with no text.`;

export const READ_SCHEMA = {
  type: "object",
  properties: {
    kind: { type: "string", enum: [...READ_TYPES] },
    title: { type: "string" },
    eventDate: { type: ["string", "null"] },
    facility: { type: ["string", "null"] },
    doctor: { type: ["string", "null"] },
    patientName: { type: ["string", "null"] },
    values: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          value: { type: "string" },
          unit: { type: ["string", "null"] },
          refRange: { type: ["string", "null"] },
          flag: { type: ["string", "null"], enum: ["normal", "high", "low", null] },
        },
        required: ["name", "value"],
      },
    },
    medicines: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          strength: { type: ["string", "null"] },
          form: { type: ["string", "null"] },
          dose: { type: ["string", "null"] },
          schedule: { type: "array", items: { type: "number" } },
          timing: { type: ["string", "null"] },
          durationDays: { type: ["number", "null"] },
          asNeeded: { type: "boolean" },
        },
        required: ["name"],
      },
    },
    foods: { type: "array", items: { type: "string" } },
    summary: { type: "string" },
    confidence: { type: "number" },
    rawText: { type: "string" },
  },
  required: ["kind", "title", "summary", "confidence"],
};

/** Files the reader accepts, by what storage says they are. */
export const READ_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"]);
/** 10 MB, the upload limit. Base64 is a third bigger. */
export const READ_MAX_BYTES = 10 * 1024 * 1024;

/** A storage path inside the documents bucket: no traversal, no leading slash. */
export function safePath(v: unknown): string | null {
  if (typeof v !== "string" || !v || v.length > 300) return null;
  if (v.startsWith("/") || v.includes("..") || v.includes("\\") || !/^[A-Za-z0-9._\-/]+$/.test(v)) return null;
  return v;
}

export function toBase64(bytes: Uint8Array): string {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(s);
}

const str = (v: unknown, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/** The model's reply, cleaned to exactly what the app reads. */
export function shapeRead(out: Record<string, unknown>) {
  const kind = (READ_TYPES as readonly string[]).includes(out.kind as string) ? (out.kind as string) : "other_health";
  const date = str(out.eventDate, 10);
  const conf = typeof out.confidence === "number" ? Math.max(0, Math.min(1, out.confidence)) : 0.5;
  const values = (Array.isArray(out.values) ? out.values : []).slice(0, 60).flatMap((v) => {
    const o = (v ?? {}) as Record<string, unknown>;
    const name = str(o.name, 120);
    const value = str(o.value, 60);
    return name && value ? [{ name, value, unit: str(o.unit, 30), refRange: str(o.refRange, 60), flag: ["normal", "high", "low"].includes(o.flag as string) ? o.flag : null }] : [];
  });
  const medicines = (Array.isArray(out.medicines) ? out.medicines : []).slice(0, 30).flatMap((m) => {
    const o = (m ?? {}) as Record<string, unknown>;
    const name = str(o.name, 120);
    if (!name) return [];
    const sched = Array.isArray(o.schedule) ? o.schedule.slice(0, 3).map((n) => (typeof n === "number" && n >= 0 ? Math.min(6, n) : 0)) : [];
    return [{
      name, strength: str(o.strength, 40), form: str(o.form, 20), dose: str(o.dose, 40),
      schedule: sched.length === 3 ? sched : [0, 0, 0], timing: str(o.timing, 20), durationDays: typeof o.durationDays === "number" ? o.durationDays : null, asNeeded: o.asNeeded === true,
    }];
  });
  return {
    kind,
    title: str(out.title, 120) ?? "Document",
    eventDate: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
    facility: str(out.facility, 120),
    doctor: str(out.doctor, 120),
    patientName: str(out.patientName, 120),
    values,
    medicines,
    foods: (Array.isArray(out.foods) ? out.foods : []).flatMap((f) => (typeof f === "string" && f.trim() ? [f.trim().slice(0, 40)] : [])).slice(0, 12),
    summary: str(out.summary, 300) ?? "",
    confidence: conf,
    rawText: typeof out.rawText === "string" ? out.rawText.slice(0, 3000) : "",
  };
}
