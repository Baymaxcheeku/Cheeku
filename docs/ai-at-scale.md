# Cheeku AI at scale: the plan, end to end

The AI side of Cheeku built for millions of families: the conversation API the
model plugs into, uploaded documents read and filed against the right person,
and family context switching that works exactly as it does today. Then how we
prove all of it before launch, with sample inputs, thousands of concurrent
users and millions of requests.

Tracker: `perf-scale-plan`, `perf-loadtest` (Archit), with `ai-api-contract`,
`ai-memory-server`, `ai-ocr-pipeline`, `ai-serving`, `ai-routing`, `be-queue`
and `ops-envs`. Owners are named per phase in section 10.

The runnable half of this document is `loadtest/` (see its README). Every
number marked *measured* below came from it.

---

## 0. The short version

1. **Supabase stays the system of record**: Auth, Postgres, Storage, RLS and
   the triggers that already enforce plans, quota and consent. Nothing about
   who may see what moves out of the database.
2. **One new service: the AI gateway.** A container on Cloud Run in Mumbai
   (`asia-south1`), next to the model. It is the API the conversation plugs
   into: `POST /v1/turns`. It verifies the caller, decides whose memory the
   message goes to (the same rules as today), builds that one person's context
   on the server, calls the model, applies the safety floor and saves the turn.
3. **Memory is precomputed, not rebuilt per message.** A versioned snapshot per
   family member, refreshed when their records change and cached. A chat turn
   reads one cache key instead of aggregating thousands of rows.
4. **Models sit behind a router.** Gemini on Vertex AI in Mumbai at launch, our
   own fine-tuned model (`ai-model-ft`) when it is ready, the on-device
   stand-in as the last resort. The router owns capacity, retries and
   fallback, so the app never sees a provider.
5. **Documents are read asynchronously.** Upload stays phone to Storage; a
   queue feeds extraction workers; each report is checked against whose name
   is on it before anything reaches that person's memory.
6. **Tested before launch with a synthetic population**: 10,000 families with
   a canary code in every member's records, a fake model that behaves like a
   busy real one, and k6 runs from a smoke test up to a 3-hour soak of 1.08
   million turns. The run aborts on the first sign of one member's memory in
   another's context.

---

## 1. What exists today, and what stays

Today the whole chat pipeline runs on the phone (`mobile-react-native/src/lib/memory`):
safety gate, member switching (`memberIntent`), the memory bundle, thresholds,
the urgency ladder, the doctor script. The phone sends a finished
`ModelRequest` to the `cheeku-chat` Edge Function, which meters the call
(`claim_model_call`, migration 0035) and forwards it to `CHEEKU_MODEL_URL`.
Nothing is behind that URL yet, so every answer comes from the on-device
stand-in.

**What stays, unchanged:**

- The safety gate runs on the device first, before any network call (PLAN.md
  rule). Emergencies never reach a model. The gateway runs it again as a second
  line, never instead.
- The switching rules, word for word: names win over relationships, "the baby"
  means the one child under three, "for me" goes back to the account holder,
  two people named means stay put, a member the plan has paused is refused.
- The model contract: `ModelRequest` in, `ModelReply` out
  (`src/lib/memory/model.ts`). The model can raise the urgency tier, never
  lower it.
- Isolation in the database: `memory_bundle` and `chat_thread` refuse any
  profile the caller does not own or the plan does not cover.

**What changes, and why:**

| Today | At scale | Why |
|---|---|---|
| Context built on the phone | Built in the gateway | A tampered phone could send any digest; logic changes need an app release (no `expo-updates`) |
| `memory_bundle` (up to 3,000 entities, 2,000 facts) on every member opened, rebuilt on the phone | Versioned snapshot, cached, read by the gateway each turn | The heaviest read in the app; on the server it would sit on the hottest path |
| Burst limits counted in Postgres per call | Token buckets in Redis; daily allowance stays in Postgres | One less database write per model call at 500 calls a second |
| Extraction is a mock on the phone | Queue and workers on the server | Real OCR is slow, costly and must never block the upload |
| Doctor booking finds the member by first name | Profile id end to end | Two members named Arjun get each other's appointments |

---

## 2. How big: the capacity model

Assumptions, each one a knob to replace with real numbers after launch:

- 25% of monthly users open the app on a given day; each sends 4 messages.
- 77% of messages reach a model (78% *measured* on the sample set: the rest
  are bookings the rules answer, emergencies, hard stops and refused members).
- India is one time zone, so traffic peaks hard: the busiest hour carries 12%
  of the day, and bursts inside it run at twice that hour's average.
- A model call takes 2.5 s on average without streaming.
- A model call is about 3,000 input tokens (the digest and history are p50 1.2k,
  p95 1.8k, *measured*; plus a system prompt of about 1.5k) and 400 output.
- Three uploads per monthly user per month, about 400 KB each after the phone
  resizes them.

| | 100k monthly | 1M monthly | 10M monthly |
|---|---:|---:|---:|
| Messages a day | 100,000 | 1,000,000 | 10,000,000 |
| Model calls a day | 77,000 | 770,000 | 7,700,000 |
| Peak model calls a second | 5 | 51 | 513 |
| Model calls in flight at peak | 13 | 130 | 1,300 |
| Peak tokens a minute | 1M | 10M | 105M |
| Input tokens a day | 0.23B | 2.3B | 23B |
| Uploads a day | 10,000 | 100,000 | 1,000,000 |
| Peak uploads a second | 0.7 | 7 | 67 |
| New storage a month | 120 GB | 1.2 TB | 12 TB |

Two things follow.

- **The database is not the bottleneck; the model is.** 513 calls a second is
  modest for Postgres if each turn reads a snapshot. 105M tokens a minute is
  something to reserve with the provider months ahead, in writing.
- **The sample run already covers 10M.** The local throughput run sent 500
  turns a second for 40 s with 1,194 calls in flight (*measured*), which is the
  10M-user evening peak in shape. Section 9 scales the same run to staging.

---

## 3. The architecture

```
 Phone (unchanged rules)                                         Mumbai (asia-south1)
 ┌──────────────────────────┐   HTTPS + Supabase JWT   ┌─────────────────────────────────────────┐
 │ safety gate (first)      │ ───────────────────────▶ │ AI GATEWAY  (Cloud Run, autoscaled)     │
 │ memberIntent (proposes)  │   POST /v1/turns         │  1 verify JWT (JWKS, in process)        │
 │ banner "Now in X's ..."  │ ◀─────────────────────── │  2 per-user limits (Redis buckets)      │
 └────────────┬─────────────┘   landed profile, reply  │  3 gate + hard stops again              │
              │                                        │  4 whose memory: memberIntent + plan    │
              │ upload (as today)                      │  5 snapshot for THAT profile (cache)    │
              ▼                                        │  6 planTurn → digest → model router     │
 ┌──────────────────────────┐                          │  7 tier = max(model, floor), script     │
 │ Supabase                 │ ◀── user-JWT writes ──── │  8 save turn (RLS + triggers decide)    │
 │  Auth · Postgres · RLS   │                          └──────────────┬──────────────────────────┘
 │  Storage (documents)     │                                         │
 │  triggers: plan, quota,  │                          ┌──────────────▼──────────────┐
 │  consent, seats          │                          │ MODEL ROUTER                 │
 │  memory_snapshots        │                          │  Gemini (Vertex, Mumbai)     │
 │  pgmq: extract, snapshot │                          │  cheeku-ft (own, in India)   │
 └──────┬───────────────────┘                          │  stand-in (rules, last)      │
        │ queue                                        └──────────────────────────────┘
        ▼
 ┌──────────────────────────┐   ┌──────────────────────┐
 │ EXTRACTION WORKERS       │   │ SNAPSHOT WORKERS      │
 │ read → validate → whose  │   │ rebuild on version    │
 │ → map → file → notify    │   │ bump, write + cache   │
 └──────────────────────────┘   └──────────────────────┘
```

### 3.1 The gateway

One stateless TypeScript service. TypeScript because the memory pipeline
already is, and the gateway runs **the same code**: `src/lib/memory` moves to a
shared package used by the app (for the instant switch banner and the gate)
and the gateway (for the answer). One version of the rules, in two places, with
the server's result winning.

- **Where:** Cloud Run in `asia-south1`, the same region as Vertex AI, so model
  calls never leave Mumbai and authenticate with a service account, not a key.
- **Scaling:** I/O bound, so 80 to 200 concurrent requests per instance; a
  floor of warm instances for the evening peak (no cold starts on the hot
  path); a ceiling as the cost guardrail.
- **Auth:** the Supabase access token, verified in process against the
  project's signing keys. Database reads and writes for the turn go **as the
  user** (their JWT through PostgREST/RPC), so RLS and every existing trigger
  stay the gate. The service-role key exists only in workers.
- **Why not an Edge Function:** a turn is real CPU (parsing a memory, running
  the pipeline) and Edge Functions allow 2 s of CPU per request; the gateway
  also needs connection pools, an in-process cache, global concurrency limits
  per model and keyless access to Vertex. `cheeku-chat` stays as a thin shim
  during migration.

### 3.2 Memory snapshots

`memory_snapshots (profile_id, version, snapshot jsonb, built_at)`, one row per
member. The snapshot is what `buildContext` produces today from
`memory_bundle`, already reduced: series with deltas, the medicine ledger, open
loops, the notes that cross members (blood group only), the 20 most recent
records.

- **Version bump:** triggers on `documents`, `entities`, `memory_facts`,
  `open_loops`, `pregnancies` and `profiles` increment
  `profiles.memory_version` and enqueue a rebuild (debounced: ten values from
  one report rebuild once).
- **Read path:** Redis key `mem:{profile_id}:{version}`; on a miss, the row;
  on a stale row, the bundle (today's path) and a rebuild request. A turn never
  waits on a rebuild.
- **Same-turn facts:** a reading said in the message ("BP 132/84 today") is
  applied in memory before the model call, exactly as `planTurn` already does
  with `extraFacts`, then saved.
- **Read as the user:** `memory_snapshot(p_profile)` is a security-definer RPC
  with the same ownership and plan checks as `memory_bundle`. No service role
  on the chat path.

### 3.3 The model router

```
request ─▶ budget check (tokens, deadline) ─▶ primary ──429/5xx/timeout──▶ secondary ──▶ stand-in
                                               │ ok                          │ ok
                                               ▼                             ▼
                                         validate ModelReply (schema) ─fail▶ one retry ─fail▶ next
```

- **Adapters, one per model**, all speaking `ModelRequest`/`ModelReply`:
  `gemini-vertex` (a Flash-class model; the exact version pinned in config,
  never "latest"), `cheeku-ft` (our fine-tuned model once `ai-serving` is up),
  `stand-in` (today's `mockModel`, always available, no network).
- **Structured output:** `ModelReply` is the JSON schema the model must fill.
  Anything that fails validation is retried once, then falls to the next model.
  A half answer is never shown.
- **Capacity:** Provisioned Throughput on Vertex sized to the evening baseline,
  pay-as-you-go above it (Google calls this Dynamic Shared Quota: no fixed
  limit, but 429s when the shared pool is busy). A semaphore per model in the
  gateway holds in-flight calls to what was bought. A turn that cannot get a
  slot in 3 s goes to the secondary model, then the stand-in.
- **Data residency:** Google's data residency page lists Gemini models for
  in-region processing in Mumbai. In the same tables, Claude on Vertex is
  listed for Singapore, not Mumbai. So Claude can only be a fallback if we
  decide cross-border processing is acceptable for health data under our DPDP
  position. That decision belongs to `sec-dpdp`, not to this plan. Check both
  tables again before signing anything; they change.
- **Where `cheeku-ft` fits:** the fine-tuned model becomes the primary model
  per route (say, chat in Hindi first) when its evals pass (`ai-evals`).
  Gemini stays as the secondary. The router splits traffic by percentage, so
  rollout is a config change.
- **Token budget per turn:** the digest is capped (today 14 readings, 20
  records, 6 loops); history is the last 12 messages of that member's thread.
  The system prompt goes first and never changes per turn, so the provider's
  context caching can reuse it.

### 3.4 Limits and backpressure

| Limit | Where | Today |
|---|---|---|
| Free daily allowance (20) | Postgres: quota trigger + claim | Same |
| 6 a minute, 60 an hour per account | Redis token bucket in the gateway | Counted in `model_calls` |
| Paid fair use (300 a day) | Postgres, in the claim | Same |
| In-flight calls per model | Gateway semaphore | None |
| Global spend guard | Router: daily token ceiling per model, alerts at 70% | None |

Emergencies and hard stops bypass all of it: they are answered by rules before
any limit is read, and saved as `escalated`, which the quota trigger never
charges.

---

## 4. Switching between family members, at scale

**For the person using the app, nothing changes.** They type "Imaad has had a
cough since yesterday" from Nisha's thread; the chat moves to Imaad's memory,
shows "Now in Imaad's memory · Back to Nisha", and the answer is about Imaad.

What changes is who decides:

1. The phone runs `memberIntent` as it does now and moves the banner instantly,
   so it still feels immediate.
2. It sends `{profileId: <open thread>, text}` to the gateway.
3. The gateway runs **the same `memberIntent`** against the account's members,
   checks `covered_profile_ids`, and lands the turn. It answers with
   `profileId` (where it landed) and `switched` (from, to, why).
4. If the server disagrees with the phone, the server wins and the banner
   follows. Same code, same version: they should disagree only when the phone
   is out of date.

### 4.1 The isolation invariants

These hold at any scale, and the tests in section 9 check each one.

- **I1.** Every model request is built for exactly one `profile_id`, which the
  caller's JWT owns and the plan covers.
- **I2.** From relatives, only the name and blood group cross over (and the
  birth context a newborn inherits). Nothing else of theirs is ever in the digest.
- **I3.** Every cache key, queue message, vector query and log line that
  touches memory includes `profile_id`. A key without it is a bug.
- **I4.** The history sent to the model is that member's thread only.
- **I5.** Every write (messages, readings, bookings, extracted values) carries
  the landed `profile_id`, and the database's plan-scope triggers check it.
- **I6.** No health content and no names in logs, traces or metrics. Ids only.
- **I7.** When it is unclear who a message is about, ask; never guess.

### 4.2 What the sample set found

The sample generator (`loadtest/samples/build.ts`) runs today's `memberIntent`
against 20,000 messages with an answer key (*measured*, seed 42):

- **0 requests** carried another member's canary, out of 15,632 model calls.
  Isolation holds.
- **0 emergencies** reached the model, out of 687.
- **3.6% of turns about another person were filed under the wrong member**
  (274 of 7,527). Nearly all of them come from two gaps:
  - **Grandparents never match.** The app stores the relationship as
    "Grandparent". The words "dadi", "nani" and "grandma" are matched against
    `grand(mother|ma)`, which "grandparent" does not contain. So "Dadi has a
    cough" stays in the open thread. Fix: map "dadi/nani/grandma" onto
    Grandparent members who are female, and "dada/nana/grandpa" onto those who
    are male.
  - **"My" from inside a child's thread.** "What was my last HbA1c?" typed in
    Imaad's thread is about the parent typing it, but only "for me", "about
    me", "myself" and "my own" switch back. Fix: first-person health words
    ("my BP", "my sugar", "my last report") switch to the account holder.
- **9% of turns are ambiguous** (two people named, two sons and "my son", two
  members called Arjun). Today they stay in the open thread, which files the
  question under whoever was open. Recommended (a product call for Athar): a
  one-tap "Who is this about?" chooser instead of a silent stay.
- **Doctor bookings** find the member by first name (`app/book/slot.tsx`
  `memberFor`). They should carry the profile id from the chat card onwards.
- **An emergency about a paused member is not saved** (6 of 687). The gate
  runs first and shows the emergency screen, as it must. But `send()` in
  `app/(app)/ask.tsx` then stops at the plan check ("Imaad is paused on your
  plan"), so the turn is never written, against the rule that an escalation
  is always recorded. Fix: record the escalation in the open thread before
  checking the plan. The gateway does it in that order from the start.

Target before launch: misfiled at or below 0.5% on the sample set, with the
chooser counted as correct.

---

## 5. The API: `POST /v1/turns`

Versioned from the first day (`ai-api-contract`). The app sends only what a
person typed and which thread was open. Everything else is the server's.

```http
POST /v1/turns
Authorization: Bearer <Supabase access token>
Idempotency-Key: <clientTurnId>
Content-Type: application/json

{
  "profileId": "<open thread>",
  "text": "Imaad has had a cough since yesterday",
  "clientTurnId": "<uuid from the phone>",
  "about": { "documentId": "<uuid>" },
  "gate": { "status": "clear", "lexiconVersion": "2026-10-01" },
  "appVersion": "1.4.0"
}
```

```json
200 {
  "profileId": "<landed>",
  "switched": { "from": "<id>", "to": "<id>", "because": "named Imaad" },
  "status": "answered",
  "reply": { "paragraphs": ["..."], "citations": [{ "documentId": "...", "label": "..." }], "followUps": ["..."], "basis": "grounded" },
  "memory": { "v": 1, "tier": "monitor", "...": "TurnMemory, as stored on the message" },
  "messages": { "user": "<id>", "assistant": "<id>" },
  "modelId": "gemini-flash-2026-xx",
  "quota": { "remaining": 14 }
}
409 { "error": "member_paused", "name": "Imaad" }
429 { "error": "rate_limited", "reason": "per_minute", "retryAfter": 42 }
503 { "error": "degraded" }
```

- **The server saves the turn**: both messages in one insert, as the user, so
  a question is never saved without its answer and the quota trigger still
  spends exactly one chat.
- **Idempotent** on `clientTurnId`: a retry after a dropped connection returns
  the saved turn and is never charged twice. `GET /v1/turns/{clientTurnId}`
  fetches it.
- **503 means use the stand-in**, as it does today: the phone answers from its
  own copy of the rules, and the person still gets an answer.
- **Streaming** (`ai-chat-streaming`): the same request with
  `Accept: text/event-stream` sends `switched`, then `paragraph` events, then
  `done` with the full body above.
- **Bookings** from the chat card carry `profileId` through the booking flow,
  and the "Booked" entry stores it on `memory.event.profileId`.

Documents need no new client API: the upload is the phone's, as today. The
gateway adds `POST /v1/documents/{id}/reprocess` for a person who says "read it
again".

---

## 6. Documents: upload, read, file against the right person

```
phone ── PDF/photo ──▶ Storage  <user>/<profile>/<uuid>.<ext>   (as today, EXIF stripped)
      ── row ────────▶ documents (status 'processing')            consent + plan triggers
                         │ same transaction: pgmq.send('extract', {documentId})
                         ▼
               extraction worker (autoscaled on queue depth)
                 1 download (service role, signed, short-lived)
                 2 read: Gemini multimodal / ai-ocr-report, schema = extraction contract
                 3 validate: required fields, units, ranges; low confidence → flag, never guess
                 4 WHOSE IS IT: patient name, age and sex on the page vs the profile
                 5 map: analyte names → canonical keys (dictionary first, model second)
                 6 write entities, status 'filed' or 'needs_review'
                 7 bump memory_version → snapshot rebuild
                 8 push "Imaad's report is ready" (push-dispatch)
```

- **The queue is Postgres** (`pgmq`, which Supabase ships as Queues; confirm
  its current status on our plan before building). The enqueue then happens in
  the same transaction as the row, so an upload can never be saved without its
  job (`be-queue`). Visibility timeouts give retries; three failures go to a
  dead-letter queue and the row says "couldn't read this yet".
- **Step 4 is the mapping that matters.** A report naming Imaad, uploaded from
  Nisha's screen, is not filed into Nisha's memory. The worker writes
  `extraction.suggestedProfileId` and status `needs_review`, and the app asks
  "This looks like Imaad's report. Move it?" through the existing
  `move_document`. Never moved without a tap.
- **Normalisation** (`ai-memory-normalise`): "Hb", "Haemoglobin" and "HGB" all
  become `haemoglobin`, with the unit converted where it is safe. Names nobody
  recognises go to a review list that grows the dictionary.
- **Capacity:** at 10M monthly users, 67 uploads a second at peak, each about
  6 s to read, means about 400 reads in flight. Workers scale on queue age.
  Backfills and re-reads use the provider's batch mode, which is cheaper and
  can wait.

---

## 7. Reliability

| When this fails | What happens | What the person sees |
|---|---|---|
| Primary model 429 or slow | Semaphore wait ≤ 3 s, then secondary | A normal answer, maybe a second later |
| All models down | Stand-in answers from the same digest | An answer marked as general, never an error |
| Model returns invalid JSON | One retry, then the next model | A normal answer |
| Gateway down | The phone's own pipeline and stand-in (today's path) | An answer; it syncs when back |
| Redis down | Limits fall back to Postgres counts | Nothing |
| Snapshot stale or missing | Bundle read, rebuild queued | Nothing |
| Extraction fails 3 times | Dead-letter queue, row stays readable | "Couldn't read this yet. Tap to try again." |
| Database slow | Gateway sheds load to the stand-in past its deadline | An answer, then it saves on retry |

Timeouts are set from the outside in: phone 30 s > gateway 25 s > model call
20 s. A retry happens once, with jitter, and only for idempotent work.

---

## 8. Cost, safety, and watching it run

**Cost per day** = model calls × (input tokens × input price + output tokens ×
output price), minus what context caching saves. Take prices from the
provider's page on the day (`ai-cost-model`). The levers, in order:

1. Turns the rules answer cost nothing: bookings, emergencies, refusals (22%
   of the sample set).
2. The digest cap keeps input near 3,000 tokens.
3. The system prompt goes first and stays fixed, so it caches.
4. A Flash-class model for chat; a Pro-class model only for hard reads
   (handwriting) and offline evals.
5. Batch mode for anything that can wait.

**Safety:** the gateway adds an output guard (`ai-guardrails`) after the
model: no diagnosis, no dose, no medicine change, citations only to this
member's records (any other is dropped and logged as an incident). Input from
documents is data, never instructions (`ai-injection`).

**Service levels, and what alerts:**

| Signal | Target |
|---|---|
| Chat end to end, p95 / p99 | ≤ 6 s / ≤ 12 s (first paragraph ≤ 2 s once streaming) |
| Turns that get an answer (stand-in included) | ≥ 99.9% |
| Turns that fell back to the stand-in | ≤ 2% |
| Emergencies that reached a model | 0 |
| Answers with another member's canary or citation | 0 |
| Upload to filed, p95 | ≤ 60 s; queue age p95 ≤ 30 s |
| Spend vs daily token ceiling | alert at 70% |

Traces carry the stage timings (auth, limits, snapshot, digest, model, save)
and ids; never text (`ops-monitoring`).

---

## 9. Testing before launch

The rule: **test our system with a fake model at full size, and test the real
model at a size we can afford.** Testing everything against the real model
would only measure the provider's bill.

### 9.1 The kit (`loadtest/`)

| Piece | What it does | Verified here |
|---|---|---|
| `samples/build.ts` | Seeded population; sample messages with an answer key; runs the app's own `memberIntent` and `planTurn`; writes the exact `ModelRequest`s, the gateway inputs and PDF lab reports; reports switching accuracy and isolation | Yes: 20,000 turns in 10 s |
| `fake-model/server.mjs` | Model contract with real-looking latency, reserved capacity, token limits, 429s, 500s, hangs, broken JSON and a deliberate leak | Yes |
| `k6/chat.js` | Chat load against the model, `cheeku-chat` on staging, or the gateway; smoke, load, stress, spike, soak, throughput | Model mode yes; edge and gateway need staging |
| `k6/docs.js` | Extraction capacity, or the real upload path on staging | Extract mode yes |
| `seed/staging.ts` | 10,000 families into a staging project, with tokens for k6 | Needs staging (`ops-envs`) |
| `check/isolation.sql` | After a run: any answer, reading or booking in the wrong member's thread | Needs staging |

**The canary.** Every family member gets a code like `CNRY-3fa91c` in the
facility of each of their records. Records go into the digest, so the code goes
into the model's answer. A reply carrying a code from outside the caller's
family is another account's memory, and k6 aborts on the first one. A code from
the same family but the wrong member is a misfile, which is counted.
`LEAK_RATE` on the fake model proves the alarm works: at 5% it aborted the run
in about 2 s (*measured*).

### 9.2 The stages, in order

| # | Test | Against | Size | Pass |
|---|---|---|---|---|
| T1 | Unit and contract | `npx vitest run` (mobile), gateway tests | All | Green |
| T2 | Sample set | `samples/build.ts` | 20,000 turns, 2,000 families | 0 leaks, 0 emergencies to model, misfiled ≤ 0.5% |
| T3 | Model quality and safety evals | Each candidate model, through the router | 1,000 golden conversations + T2's requests | `ai-evals` gate: no diagnosis/dose, citations valid, tier never below the floor |
| T4 | Smoke | Staging, fake model | 5 users, 1 min | Everything green |
| T5 | Load | Staging, fake model | 5,000 users, 30 min (≈ 200 turns/s) | p95 ≤ 6 s, errors ≤ 1%, fallback ≤ 2% |
| T6 | Stress | Staging, fake model | Climb to 20,000 users | Find where it bends, and that it bends into the stand-in, not into errors |
| T7 | Spike | Staging, fake model | 0 → 10,000 users in 30 s | The 8 pm push notification: no 5xx storm, recovers in < 2 min |
| T8 | Soak | Staging, fake model | 100 turns/s for 3 h = **1.08M turns** (24 h = 8.6M) | No drift in p95, memory or connections; 0 leaks |
| T9 | Faults | Staging, fake model with `ERROR_RATE`, `HANG_RATE`, `MAX_INFLIGHT` | Load profile | Retries bounded, fallback works, nobody charged for a failed turn |
| T10 | Uploads | Staging, `docs.js` with `POLL=1` | 20 uploads/s for 10 min | Upload p95 ≤ 5 s, filed p95 ≤ 60 s, 0 stuck, every wrong-person report flagged |
| T11 | Real model capacity | Staging, real Gemini and `cheeku-ft` | Planned peak × 1.5 for 1 h | p95 holds with reserved capacity; 429s ≤ 1%; spend as forecast |
| T12 | Isolation audit | `check/isolation.sql` after T5 to T11 | Every saved turn | 0 rows |

T5 to T10 use the fake model, so they cost only the staging infrastructure.
T11 is the one run that pays per token; budget it from the capacity model
(about 1.5 × 51 calls a second × 3,400 tokens × 3,600 s ≈ 940M tokens for an
hour at the 1M-user peak).

**Mind the per-account limits when sizing a run.** Each synthetic account may
make 6 model calls a minute, 60 an hour and 300 a day, as in production. So a
3-hour soak at 100 turns a second needs at least 6,000 accounts (10,000 to be
comfortable). Alternatively, raise `app_config('chat_limits')` on staging for
an "overdrive" run; do both, because the limiter is part of what is under test.

**Run k6 from Mumbai**, on VMs or the k6 operator in the same region as the
gateway. Otherwise the run measures the internet between the load generator
and India. One k6 instance holds a few thousand user loops; use several
instances above that.

### 9.3 The launch gate

Ship when all of this is true, on the release candidate:

- [ ] T2: 0 leaks, 0 emergencies to the model, misfiled ≤ 0.5%
- [ ] T3: the `ai-evals` gate passes for the model in production
- [ ] T5, T7, T8: within the service levels in section 8
- [ ] T6: the breaking point is at least 3× the planned peak
- [ ] T9: every fault ends in an answer or an honest message, never a charge without an answer
- [ ] T10: every deliberately misfiled report was flagged
- [ ] T11: reserved capacity confirmed in writing by the provider for the launch peak × 2
- [ ] T12: zero rows

---

## 10. The order to build it

| Phase | What ships | Owner (with) | Done when |
|---|---|---|---|
| **P0** now | Staging project (`ops-envs`); seed 10,000 families; T2, T4, T5 against today's path (`TARGET=edge`); fix the grandparent and first-person switching gaps and the doctor booking id | Archit (Athar for the app fixes) | Baseline numbers recorded; misfiled ≤ 0.5% |
| **P1** | Gateway v0 behind `cheeku-chat` (`CHEEKU_MODEL_URL` points at it): router, Gemini adapter, schema validation, fallback, metrics. No app change | Archit (Suraj for prompts and adapter) | T5 to T9 at 2× the 1M-user peak, model mode |
| **P2** | Gateway v1 `POST /v1/turns`: server-side switching and context, snapshots, Redis limits, server-side save. App send path behind a flag; needs an app release | Archit (Suraj, `ai-memory-server`; Athar, app) | T5 to T9 and T12 in gateway mode |
| **P3** | Extraction pipeline: queue, workers, whose-is-it check, normalisation (`ai-ocr-pipeline`) | Suraj (Archit, `be-queue`) | T10, plus `ai-ocr-eval` accuracy on the sample PDFs and a consented real set |
| **P4** | Streaming, retrieval for long histories (pgvector, filtered by `profile_id` first), the "who is this about?" chooser, `cheeku-ft` as primary per route | Archit, Suraj, Athar | T11 and the launch gate |

**Retrieval, when histories grow past the digest cap.** pgvector on record text
and past answers, always `WHERE profile_id = $1` first. One person's corpus is
hundreds of rows, so an exact distance scan over that small set needs no
approximate index. The filter is also the isolation guarantee.

---

## 11. Decisions this needs

1. **Cloud provider for the gateway.** This plan assumes Google Cloud for Vertex
   AI in Mumbai. If the fine-tuned model is served elsewhere (`ai-serving`),
   put the gateway next to whichever model takes most of the traffic.
2. **Cross-border processing** for a fallback model outside India (`sec-dpdp`).
   Until that is decided: no fallback outside Mumbai.
3. **The ambiguity chooser** instead of a silent stay (Athar).
4. **Reserved model capacity**: how much, for how long, signed when.
5. **Supabase compute size and region.** The database should be in Mumbai too.
   Check the current project's region; moving one later is a migration.
