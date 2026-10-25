/*
 * UPLOAD LOAD, FROM THE SAMPLE PDFS.
 *
 *   k6 run -e TARGET=extract -e RATE=20 loadtest/k6/docs.js
 *
 * TARGET:
 *   extract   the extraction contract directly (the fake model's /extract, or
 *             the extraction worker's adapter): raw capacity of the reader.
 *   staging   the real upload path on STAGING, as the phone does it today
 *             (mobile-react-native/src/lib/records/upload.ts): the PDF into
 *             the documents bucket under <user>/<profile>/<uuid>.pdf, then the
 *             documents row with the user's own JWT, through RLS, the plan
 *             trigger (0011) and the consent guard (0031). With POLL=1 it then
 *             waits for the server-side extraction pipeline in
 *             docs/ai-at-scale.md to move the row off 'processing', and
 *             records how long that took. Until that pipeline exists, leave
 *             POLL off: nothing on the server moves the status today.
 *
 * Uploads arrive at RATE a second for DURATION (default 20/s for 10m: 12,000
 * reports, roughly a busy hour at a million monthly users).
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";
import encoding from "k6/encoding";
import exec from "k6/execution";
import { Counter, Rate, Trend } from "k6/metrics";

const TARGET = __ENV.TARGET || "extract";
const OUT = __ENV.OUT || "../out";
const RATE = Number(__ENV.RATE || 20);
const POLL = __ENV.POLL === "1";
const POLL_MAX_S = Number(__ENV.POLL_MAX_S || 180);
const SUPABASE_URL = __ENV.SUPABASE_URL;
const URL = __ENV.URL || "http://localhost:8787/extract";
// Extraction runs in the background, so it gets a reading budget; an upload is
// a person waiting on a spinner.
const P95_MS = Number(__ENV.P95_MS || (TARGET === "extract" ? 30000 : 5000));

const docs = new SharedArray("documents", () =>
  open(`${OUT}/documents.jsonl`)
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l)),
);
const tokens = TARGET === "staging" ? JSON.parse(open(__ENV.TOKENS || `${OUT}/tokens.json`)) : {};

const uploadMs = new Trend("upload_ms", true);
const toFiledS = new Trend("time_to_filed_s");
const ok = new Rate("upload_ok");
const stuck = new Counter("stuck_processing");
const misrouted = new Counter("wrong_person_not_flagged");

export const options = {
  scenarios: {
    uploads: { executor: "constant-arrival-rate", rate: RATE, timeUnit: "1s", duration: __ENV.DURATION || "10m", preAllocatedVUs: RATE * 10, maxVUs: RATE * (POLL ? 200 : 30) },
  },
  thresholds: {
    upload_ok: ["rate>0.99"],
    upload_ms: [`p(95)<${P95_MS}`],
    ...(POLL ? { time_to_filed_s: ["p(95)<60"], stuck_processing: ["count==0"] } : {}),
  },
  summaryTrendStats: ["avg", "p(50)", "p(95)", "p(99)", "max"],
};

function uuid() {
  const h = "0123456789abcdef";
  let s = "";
  for (let i = 0; i < 32; i += 1) s += i === 12 ? "4" : i === 16 ? h[8 + Math.floor(Math.random() * 4)] : h[Math.floor(Math.random() * 16)];
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

function extract(d) {
  const res = http.post(URL, JSON.stringify({ documentId: d.id, mimeType: d.mimeType, fileBase64: d.pdfBase64 }), { headers: { "content-type": "application/json" }, timeout: "60s" });
  const good = check(res, { "read values": (r) => r.status === 200 && Array.isArray(r.json("entities")) });
  ok.add(good);
  if (res.status === 200) uploadMs.add(res.timings.duration);
}

function staging(d) {
  const t = tokens[d.account];
  if (!t) throw new Error(`no token for account ${d.account}; run seed/staging.ts first`);
  const auth = { authorization: `Bearer ${t.accessToken}`, apikey: __ENV.ANON_KEY };
  const id = uuid();
  const path = `${t.userId}/${d.uploadedTo}/${id}.pdf`;

  const started = Date.now();
  const put = http.post(`${SUPABASE_URL}/storage/v1/object/documents/${path}`, encoding.b64decode(d.pdfBase64, "std"), { headers: { ...auth, "content-type": d.mimeType, "x-upsert": "false" }, timeout: "60s" });
  const row = put.status === 200
    ? http.post(`${SUPABASE_URL}/rest/v1/documents`, JSON.stringify({ id, profile_id: d.uploadedTo, user_id: t.userId, storage_path: path, mime_type: d.mimeType, doc_type: "lab_report", status: "processing" }), { headers: { ...auth, "content-type": "application/json", prefer: "return=minimal" } })
    : null;
  const good = check(put, { "stored": (r) => r.status === 200 }) && check(row, { "filed row": (r) => r !== null && r.status === 201 });
  ok.add(good);
  if (!good) return;
  uploadMs.add(Date.now() - started);

  if (!POLL) return;
  for (let waited = 0; waited < POLL_MAX_S; waited += 2) {
    sleep(2);
    const r = http.get(`${SUPABASE_URL}/rest/v1/documents?id=eq.${id}&select=status,profile_id,extraction`, { headers: auth, tags: { name: "poll" } });
    const doc = r.status === 200 ? r.json()[0] : null;
    if (doc && doc.status !== "processing") {
      toFiledS.add((Date.now() - started) / 1000);
      // The pipeline should notice a report that names someone else.
      const suggested = doc.extraction && doc.extraction.suggestedProfileId;
      if (d.wrongPerson && suggested !== d.truth.profile) misrouted.add(1);
      return;
    }
  }
  stuck.add(1);
}

export default function () {
  const d = docs[exec.scenario.iterationInTest % docs.length];
  if (TARGET === "staging") staging(d);
  else extract(d);
}
