/*
 * CHAT LOAD, FROM THE SAMPLE INPUTS.
 *
 *   k6 run -e TARGET=model -e PROFILE=smoke loadtest/k6/chat.js
 *
 * TARGET says what is being hit:
 *   model     the model contract directly: the fake model, or the gateway's
 *             model adapter. Body = a ModelRequest from requests.jsonl.
 *   edge      today's path: the cheeku-chat Edge Function on STAGING, with a
 *             real JWT per synthetic account (TOKENS from seed/staging.ts).
 *             Exercises auth, the claim_model_call meter and the forward.
 *   gateway   the planned AI gateway, POST /v1/turns, from turns.jsonl:
 *             the server picks whose memory, builds the digest, answers. The
 *             contract is in docs/ai-at-scale.md; until the gateway exists
 *             this mode has nothing to hit.
 *
 * PROFILE says how hard (all override with VUS, RATE, DURATION):
 *   smoke       5 users, 1 minute: does it work at all
 *   load        ramp to VUS (2000) users, hold 30 minutes: an evening peak
 *   stress      climb to 20,000 users in steps: where does it bend
 *   spike       0 to VUS (5000) in 30 s: the push notification at 8 pm
 *   soak        RATE (100) turns a second for DURATION (3h): 1.08 million turns
 *   throughput  RATE (500) a second for DURATION (10m): raw capacity, no think time
 *
 * User profiles wait THINK_S (20 s, jittered) between messages, like a person
 * reading the answer. 5,000 such users send about 200 turns a second.
 *
 * THE ONE THRESHOLD THAT ABORTS: isolation_violations. A reply that carries a
 * canary from outside the caller's family is another account's memory, and
 * the run stops on the first one.
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";
import exec from "k6/execution";
import { Counter, Rate, Trend } from "k6/metrics";

const TARGET = __ENV.TARGET || "model";
const PROFILE = __ENV.PROFILE || "smoke";
const THINK_S = Number(__ENV.THINK_S || 20);
const OUT = __ENV.OUT || "../out";
const P95_MS = Number(__ENV.P95_MS || 8000);
// Share of turns the meter or the provider may refuse before the run fails.
const MAX_429 = Number(__ENV.MAX_429 || 0.05);
const TIMEOUT = __ENV.TIMEOUT || "30s";

const URL =
  __ENV.URL ||
  (TARGET === "model" ? "http://localhost:8787/chat" : TARGET === "edge" ? `${__ENV.SUPABASE_URL}/functions/v1/cheeku-chat` : `${__ENV.GATEWAY_URL}/v1/turns`);

const lines = (path) =>
  open(path)
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));

const data = new SharedArray("samples", () => {
  const rows = TARGET === "gateway" ? lines(`${OUT}/turns.jsonl`).filter((t) => t.expect.outcome !== "refused") : lines(`${OUT}/requests.jsonl`);
  const limit = Number(__ENV.SAMPLES || 0);
  return limit ? rows.slice(0, limit) : rows;
});

const tokens = TARGET === "model" ? {} : JSON.parse(open(__ENV.TOKENS || `${OUT}/tokens.json`));

const turnMs = new Trend("turn_ms", true);
const ok = new Rate("turn_ok");
const rateLimited = new Rate("rate_limited");
const fallback = new Rate("fallback");
const isolation = new Counter("isolation_violations");
const misfiled = new Counter("misfiled");
const wrongProfile = new Counter("wrong_profile");

const VUS = Number(__ENV.VUS || 0);
const RATE = Number(__ENV.RATE || 0);
const userFlow = { exec: "user" };
const PROFILES = {
  smoke: { ...userFlow, executor: "constant-vus", vus: VUS || 5, duration: __ENV.DURATION || "1m" },
  load: {
    ...userFlow,
    executor: "ramping-vus",
    stages: [
      { duration: "5m", target: VUS || 2000 },
      { duration: __ENV.DURATION || "30m", target: VUS || 2000 },
      { duration: "2m", target: 0 },
    ],
  },
  stress: {
    ...userFlow,
    executor: "ramping-vus",
    stages: [2000, 5000, 10000, 15000, VUS || 20000].flatMap((t) => [
      { duration: "3m", target: t },
      { duration: "5m", target: t },
    ]),
  },
  spike: {
    ...userFlow,
    executor: "ramping-vus",
    stages: [
      { duration: "30s", target: VUS || 5000 },
      { duration: __ENV.DURATION || "5m", target: VUS || 5000 },
      { duration: "30s", target: 0 },
    ],
  },
  soak: { exec: "turn", executor: "constant-arrival-rate", rate: RATE || 100, timeUnit: "1s", duration: __ENV.DURATION || "3h", preAllocatedVUs: (RATE || 100) * 10, maxVUs: (RATE || 100) * 40 },
  throughput: { exec: "turn", executor: "constant-arrival-rate", rate: RATE || 500, timeUnit: "1s", duration: __ENV.DURATION || "10m", preAllocatedVUs: (RATE || 500) * 10, maxVUs: (RATE || 500) * 40 },
};

if (!PROFILES[PROFILE]) throw new Error(`unknown PROFILE ${PROFILE}`);

export const options = {
  scenarios: { [PROFILE]: PROFILES[PROFILE] },
  thresholds: {
    isolation_violations: [{ threshold: "count==0", abortOnFail: true }],
    turn_ok: ["rate>0.99"],
    turn_ms: [`p(95)<${P95_MS}`, `p(99)<${P95_MS * 2}`],
    fallback: ["rate<0.02"],
    rate_limited: [`rate<${MAX_429}`],
    ...(TARGET === "gateway" ? { wrong_profile: ["count==0"] } : {}),
  },
  // 429 is the meter or the provider saying "slow down": counted, not a crash.
  summaryTrendStats: ["avg", "p(50)", "p(95)", "p(99)", "max"],
  discardResponseBodies: false,
};

http.setResponseCallback(http.expectedStatuses(200, 429));

function headers(account, id) {
  const h = { "content-type": "application/json" };
  if (TARGET !== "model") {
    const t = tokens[account];
    if (!t) throw new Error(`no token for account ${account}; run seed/staging.ts first`);
    h.authorization = `Bearer ${t.accessToken}`;
    if (__ENV.ANON_KEY) h.apikey = __ENV.ANON_KEY;
  }
  if (TARGET === "gateway") h["idempotency-key"] = id;
  return h;
}

const CANARY = /CNRY-[0-9a-f]{6}/g;

/** Every canary in the reply must be the expected member's; a family one is a misfile, any other a leak. */
function scan(body, own, family) {
  for (const c of new Set(String(body || "").match(CANARY) || [])) {
    if (c === own) continue;
    if (family && family.includes(c)) misfiled.add(1);
    else isolation.add(1);
  }
}

function sendOne() {
  const item = data[exec.scenario.iterationInTest % data.length];
  const isGateway = TARGET === "gateway";
  const body = isGateway ? JSON.stringify({ profileId: item.activeProfile, text: item.text, clientTurnId: item.id }) : JSON.stringify(item.body);
  const res = http.post(URL, body, { headers: headers(item.account, item.id), timeout: TIMEOUT, tags: { target: TARGET } });

  const limited = res.status === 429;
  rateLimited.add(limited);
  if (limited) return;

  // 503 is cheeku-chat's "use the stand-in": the person still gets an answer, from the phone.
  const isFallback = res.status === 503 || res.status === 502 || res.status === 504;
  fallback.add(isFallback);
  const good = check(res, {
    "status 200": (r) => r.status === 200,
    "has an answer": (r) => {
      if (r.status !== 200) return false;
      try {
        const j = r.json();
        const reply = isGateway ? j.reply : j;
        return item.expect && item.expect.outcome === "escalate" ? true : Array.isArray(reply.paragraphs) && reply.paragraphs.length > 0;
      } catch (e) {
        return false;
      }
    },
  });
  ok.add(good);
  if (res.status === 200) turnMs.add(res.timings.duration);
  scan(res.body, item.canary, item.family);

  if (isGateway && res.status === 200) {
    try {
      if (res.json().profileId !== item.expect.profile) wrongProfile.add(1);
    } catch (e) {
      wrongProfile.add(1);
    }
  }
}

/** A person: send, read the answer, send again. */
export function user() {
  sendOne();
  sleep(THINK_S * (0.5 + Math.random()));
}

/** A turn on the clock: arrival-rate profiles, no think time. */
export function turn() {
  sendOne();
}
