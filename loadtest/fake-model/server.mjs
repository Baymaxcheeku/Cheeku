#!/usr/bin/env node
/*
 * A FAKE MODEL THAT BEHAVES LIKE A BUSY REAL ONE.
 *
 *   node loadtest/fake-model/server.mjs            # port 8787
 *   CHEEKU_MODEL_URL=http://<host>:8787/chat       # point cheeku-chat (or the gateway) at it
 *
 * Load tests that pay for every token test the provider's bill, not our
 * system. This answers the model contract (ModelRequest in, ModelReply out,
 * see mobile-react-native/src/lib/memory/model.ts) with the latency, limits
 * and failures of a real one, so a million requests cost nothing and a
 * failure we inject is a failure we chose.
 *
 * It answers like a grounded model would: by name, citing the first record
 * in the digest. That record's facility carries the profile's canary, so the
 * reply carries it too, and a reply delivered to the wrong caller shows up as
 * a canary that does not belong.
 *
 * Knobs (environment):
 *   PORT=8787
 *   MEDIAN_MS=1800 P99_MS=9000          chat latency, log-normal between the two
 *   EXTRACT_MEDIAN_MS=6000 EXTRACT_P99_MS=20000
 *   MAX_INFLIGHT=0                      reserved capacity; beyond it, 429 (0 = unlimited)
 *   TPM_LIMIT=0                         input+output tokens a minute; beyond it, 429
 *   ERROR_RATE=0 RATE_LIMIT_RATE=0      share of calls answering 500 / 429 at random
 *   HANG_RATE=0 HANG_MS=40000           share of calls that stall, to exercise timeouts
 *   BAD_JSON_RATE=0                     share of replies that are not valid JSON
 *   LEAK_RATE=0                         share of replies built from the PREVIOUS caller's
 *                                       memory: a cross-wired cache, on purpose, to prove the
 *                                       isolation alarm fires (k6 must abort)
 *
 * GET /stats returns counters, the in-flight peak and the token rate.
 */
import { createServer } from "node:http";

const env = (k, d) => (process.env[k] === undefined ? d : Number(process.env[k]));
const PORT = env("PORT", 8787);
const CHAT = { median: env("MEDIAN_MS", 1800), p99: env("P99_MS", 9000) };
const EXTRACT = { median: env("EXTRACT_MEDIAN_MS", 6000), p99: env("EXTRACT_P99_MS", 20000) };
const MAX_INFLIGHT = env("MAX_INFLIGHT", 0);
const TPM_LIMIT = env("TPM_LIMIT", 0);
const ERROR_RATE = env("ERROR_RATE", 0);
const RATE_LIMIT_RATE = env("RATE_LIMIT_RATE", 0);
const HANG_RATE = env("HANG_RATE", 0);
const HANG_MS = env("HANG_MS", 40000);
const BAD_JSON_RATE = env("BAD_JSON_RATE", 0);
const LEAK_RATE = env("LEAK_RATE", 0);
let previous = null;

const stats = { requests: 0, ok: 0, rateLimited: 0, errors: 0, hangs: 0, badJson: 0, badRequest: 0, inflight: 0, peakInflight: 0, startedAt: new Date().toISOString() };
const minute = []; // [at, tokens]

/** A log-normal draw with the given median and 99th percentile. */
function latency({ median, p99 }) {
  const sigma = Math.log(Math.max(p99, median + 1) / median) / 2.326;
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return Math.round(median * Math.exp(sigma * z));
}

function tokensThisMinute(now) {
  while (minute.length && (minute[0]?.[0] ?? now) < now - 60_000) minute.shift();
  return minute.reduce((s, [, t]) => s + t, 0);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "content-type": "application/json", ...headers });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

function chatReply(req) {
  const m = req.memory;
  const name = m.person?.firstName ?? "them";
  const rec = Array.isArray(m.records) ? m.records[0] : null;
  const focus = (m.readings ?? []).find((r) => r.focus) ?? (m.readings ?? [])[0];
  const paragraphs = [
    rec ? `From ${name}'s ${rec.title.toLowerCase()} at ${rec.facility ?? "the lab"}${rec.date ? ` on ${rec.date}` : ""}, here is what stands out.` : `There is nothing in ${name}'s records about that yet.`,
    focus ? `${focus.name} was ${focus.latest.value}${focus.unit ? ` ${focus.unit}` : ""} on ${focus.latest.date}${focus.change ? ` (${focus.change})` : ""}.` : "Add a report and I can compare it with the next one.",
    "Worth raising with the doctor at the next visit.",
  ];
  return {
    paragraphs,
    citations: rec ? [{ documentId: rec.id, label: rec.title }] : [],
    followUps: ["What changed since last time?", "What should I ask the doctor?"],
    tier: req.floor?.tier ?? null,
    basis: rec ? "grounded" : "silent",
    careOffer: false,
    modelId: "fake-model",
  };
}

function extraction(body) {
  return {
    documentId: body.documentId ?? null,
    docType: "lab_report",
    title: "Lab report",
    eventDate: new Date().toISOString().slice(0, 10),
    facility: body.facility ?? null,
    doctor: null,
    confidence: 0.9,
    rawText: null,
    // A fake cannot read the PDF; a real extractor fills these from the page.
    patient: { name: null, age: null },
    entities: [
      { kind: "lab_value", name: "HbA1c", value: 6.1, valueText: null, unit: "%", refRange: "4.0-5.6", flag: "high" },
      { kind: "lab_value", name: "Haemoglobin", value: 12.8, valueText: null, unit: "g/dL", refRange: "12.0-15.5", flag: "normal" },
    ],
  };
}

async function handle(req, res, raw) {
  const url = new URL(req.url ?? "/", "http://x");
  if (req.method === "GET" && url.pathname === "/healthz") return send(res, 200, { ok: true });
  if (req.method === "GET" && url.pathname === "/stats") return send(res, 200, { ...stats, tokensLastMinute: tokensThisMinute(Date.now()) });
  if (req.method !== "POST") return send(res, 405, { error: "method_not_allowed" });

  const isExtract = url.pathname === "/extract";
  if (!isExtract && url.pathname !== "/chat" && url.pathname !== "/") return send(res, 404, { error: "not_found" });

  stats.requests += 1;
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    stats.badRequest += 1;
    return send(res, 400, { error: "bad_request" });
  }
  if (!isExtract && (typeof body.question !== "string" || !body.memory || typeof body.memory !== "object")) {
    stats.badRequest += 1;
    return send(res, 400, { error: "bad_request" });
  }

  // Capacity: reserved throughput and a tokens-a-minute ceiling, like a real provider.
  const now = Date.now();
  const inTokens = Math.ceil(raw.length / 4) + 1500; // the system prompt the gateway would add
  if ((MAX_INFLIGHT && stats.inflight >= MAX_INFLIGHT) || (TPM_LIMIT && tokensThisMinute(now) + inTokens > TPM_LIMIT) || Math.random() < RATE_LIMIT_RATE) {
    stats.rateLimited += 1;
    return send(res, 429, { error: "rate_limited" }, { "retry-after": "2" });
  }
  minute.push([now, inTokens + 400]);

  stats.inflight += 1;
  stats.peakInflight = Math.max(stats.peakInflight, stats.inflight);
  try {
    if (Math.random() < HANG_RATE) {
      stats.hangs += 1;
      await sleep(HANG_MS);
      return send(res, 504, { error: "upstream_timeout" });
    }
    await sleep(latency(isExtract ? EXTRACT : CHAT));
    if (Math.random() < ERROR_RATE) {
      stats.errors += 1;
      return send(res, 500, { error: "model_error" });
    }
    if (Math.random() < BAD_JSON_RATE) {
      stats.badJson += 1;
      return send(res, 200, '{"paragraphs": ["half a repl');
    }
    stats.ok += 1;
    if (isExtract) return send(res, 200, extraction(body));
    const other = previous;
    previous = body;
    return send(res, 200, chatReply(other && Math.random() < LEAK_RATE ? other : body));
  } finally {
    stats.inflight -= 1;
  }
}

const server = createServer((req, res) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    handle(req, res, Buffer.concat(chunks).toString("utf8")).catch(() => send(res, 500, { error: "fake_model_crashed" }));
  });
});
server.keepAliveTimeout = 65_000;
server.headersTimeout = 70_000;
server.listen(PORT, () => console.log(`fake model on :${PORT} (median ${CHAT.median} ms, p99 ${CHAT.p99} ms, max in-flight ${MAX_INFLIGHT || "unlimited"})`));
