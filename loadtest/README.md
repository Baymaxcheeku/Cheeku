# Load test kit for the AI

Sample inputs, a fake model and k6 scripts that test the chat and the document
pipeline at the size in `docs/ai-at-scale.md`: thousands of people at once,
millions of turns, and the one failure that matters most (one person's memory
in another's context) caught on the first occurrence.

```
samples/       population.ts  seeded families, each member with a canary code in their records
               turns.ts       sample messages, each with who it is about and where it must land
               documents.ts   one-page PDF lab reports with what they say and whose they are
               build.ts       runs the app's own memberIntent + planTurn over all of it
fake-model/    server.mjs     the model contract, with real latency, limits and failures
k6/            chat.js        chat load: model | edge | gateway, smoke to soak
               docs.js        uploads: extraction capacity, or the real upload path on staging
seed/          staging.ts     the population into a STAGING project, plus tokens for k6
check/         isolation.sql  after a run: anything filed under the wrong member
out/                          generated, gitignored
```

Needs Node 22 and [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) v1 or later.
Nothing to install for the rest: `npx tsx` runs the TypeScript, the fake
model has no dependencies. Run every command from the repo root.

## 1. Make the sample inputs (any laptop, no secrets)

```bash
npx tsx --tsconfig loadtest/tsconfig.json loadtest/samples/build.ts \
  --accounts 2000 --turns 20000 --docs 2000 --seed 42
```

Ten seconds. Read `loadtest/out/report.md`: it says whether any request carried
another member's canary or any emergency reached the model (either one fails
the build), and how often the switching rules filed a message under the wrong
person, with the first misses quoted. Same seed, same output, so a miss can
be replayed.

What comes out:

| File | One line is | Used by |
|---|---|---|
| `requests.jsonl` | a `ModelRequest` exactly as the phone sends it to `cheeku-chat` today, with its account, profile and canary | `chat.js` model and edge |
| `turns.jsonl` | a typed message, the open thread, the answer key, the expected and family canaries | `chat.js` gateway |
| `documents.jsonl` | a PDF (base64), where it was uploaded, whose it really is, every value on it | `docs.js`, extraction evals |
| `population.json` | every family and every member's memory | `seed/staging.ts` |

About 5 KB per request; keep `--turns` at 20,000 or below for k6 (it holds the
file in memory once, shared by every virtual user).

## 2. Run it locally against the fake model

```bash
node loadtest/fake-model/server.mjs &                     # :8787, median 1.8 s, p99 9 s
k6 run -e TARGET=model -e PROFILE=smoke loadtest/k6/chat.js
k6 run -e TARGET=model -e PROFILE=throughput -e RATE=500 -e DURATION=1m -e SAMPLES=2000 loadtest/k6/chat.js
k6 run -e TARGET=extract -e RATE=20 -e DURATION=2m loadtest/k6/docs.js
```

What one cloud session measured on 2026-10-25: 500 turns a second for 40 s,
20,000 turns, 1,194 model calls in flight at the peak, p95 5.7 s (the fake's
own latency), 0 isolation violations.

**Prove the alarm works** before trusting a green run:

```bash
LEAK_RATE=0.05 node loadtest/fake-model/server.mjs &
k6 run -e TARGET=model -e PROFILE=smoke -e VUS=50 loadtest/k6/chat.js   # must exit 99
```

Other fake-model knobs, all environment variables: `MEDIAN_MS`, `P99_MS`,
`MAX_INFLIGHT` (reserved capacity; 429 beyond it), `TPM_LIMIT`, `ERROR_RATE`,
`RATE_LIMIT_RATE`, `HANG_RATE`, `BAD_JSON_RATE`. `GET :8787/stats` shows the
in-flight peak and the token rate.

## 3. Profiles

`-e PROFILE=` on `chat.js`. Override sizes with `VUS`, `RATE`, `DURATION`, and think
time with `THINK_S` (default 20 s, the time a person spends reading the answer).

| Profile | Shape | Turns |
|---|---|---|
| `smoke` | 5 users, 1 min | ~15 |
| `load` | ramp to 2,000 users, hold 30 min | ~170,000 |
| `stress` | climb 2,000 → 20,000 users in 8-minute steps | until it bends |
| `spike` | 0 → 5,000 users in 30 s, hold 5 min | ~70,000 |
| `soak` | 100 turns/s for 3 h | **1,080,000** |
| `throughput` | 500 turns/s for 10 min, no think time | 300,000 |

Thresholds (the run fails if any is crossed): `isolation_violations == 0`
(aborts at once), `turn_ok > 99%`, `turn_ms p95 < P95_MS` (8 s) and p99 under
twice that, `fallback < 2%`, `rate_limited < MAX_429` (5%). Gateway mode adds
`wrong_profile == 0`.

## 4. Staging

Needs a staging Supabase project (`ops-envs`). **Never production**: the
seeder refuses unless `LOADTEST_ALLOW` is the project ref, typed out.

```bash
export SUPABASE_URL=https://<ref>.supabase.co SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=...
export SUPABASE_JWT_SECRET=...      # optional: mint 6-hour tokens instead of signing in
LOADTEST_ALLOW=<ref> npx tsx --tsconfig loadtest/tsconfig.json loadtest/seed/staging.ts --concurrency 8
```

Then point `cheeku-chat` at a fake model you host near it
(`supabase secrets set CHEEKU_MODEL_URL=https://<fake>/chat`) and run today's
path end to end: auth, the `claim_model_call` meter, the forward.

```bash
k6 run -e TARGET=edge -e PROFILE=load -e SUPABASE_URL=$SUPABASE_URL -e ANON_KEY=$SUPABASE_ANON_KEY loadtest/k6/chat.js
k6 run -e TARGET=staging -e RATE=20 -e SUPABASE_URL=$SUPABASE_URL -e ANON_KEY=$SUPABASE_ANON_KEY loadtest/k6/docs.js
```

When the gateway exists: `-e TARGET=gateway -e GATEWAY_URL=https://...`, and
`docs.js` with `-e POLL=1` once the extraction pipeline moves rows off
`processing`.

After any run that saved messages, run `check/isolation.sql` in the staging SQL
editor. Every query should return zero rows.

Clean up: `npx tsx --tsconfig loadtest/tsconfig.json loadtest/seed/staging.ts --reset`
deletes every seeded user, and everything cascades with them.

**Per-account limits are real on staging.** Each synthetic account may make 6
model calls a minute, 60 an hour and 300 a day. A 3-hour soak at 100 turns a
second therefore needs at least 6,000 accounts; seed 10,000. Or raise
`app_config('chat_limits')` on staging for a separate overdrive run.

**Run k6 near the system under test**: in Mumbai, on VMs or with the
[k6 operator](https://grafana.com/docs/k6/latest/testing-guides/running-distributed-tests/)
on Kubernetes. One k6 process holds a few thousand user loops; use several
above that.

## What was and was not verified

Verified in a cloud session on 2026-10-25: `samples/build.ts` (20,000 turns,
type-checked with the mobile sources it imports), the fake model, `chat.js`
model mode (smoke, throughput, the leak alarm, a capacity cap), `docs.js`
extract mode, and that the generated PDFs parse (`pdftotext`).

Not verified, because no staging project exists yet: `seed/staging.ts` against
a live project, `chat.js` edge and gateway modes, `docs.js` staging mode,
`check/isolation.sql`. Read them before the first run, and expect to fix
something small.
