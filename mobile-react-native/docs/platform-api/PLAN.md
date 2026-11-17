# Cheeku Platform API: the plan

Written 17 Nov 2026 for Archit (owner of the app-to-AI API layer and the
marketplace), from the code on `main` at eb613ff. Nothing in this file is built
yet. It plans one versioned API that lets other platforms (insurers, employers,
hospitals, clinics, fitness and wellness apps) use what Cheeku already does:
the conversation layer, care bookings through LabStack (labs, doctors,
pharmacy), records and memory, longevity areas, wearables and the daily care
plan. Each person's data stays isolated, consent comes first and payments are
safe.

Read alongside: `PLAN.md` (Rules 4, 5, 6, 12), `docs/labstack-api/INTEGRATION-PLAN.md`,
`docs/master/CONSUMER_APP_INFRA_AND_BASICS.md` (sections 4, 6, 7),
`docs/launch-tracker/README.md` (task ids used below).

---

## 0. The short version

1. **One core, two doors.** The business logic moves into shared modules
   (`supabase/functions/_shared/`). The app keeps its door (Supabase JWT, RLS,
   the `labstack` and `cheeku-chat` functions). Partners get a second door,
   `api.cheeku.ai/v1`, which calls the same modules. Nothing is written twice.
2. **Partners never get a database token.** They hold a short-lived opaque
   OAuth token. On every request the API checks the grant behind it and mints
   a 60-second internal JWT that names the tenant, the grant, the scopes and
   the exact family members. Postgres then enforces all of that itself with
   **restrictive RLS policies**. A bug in the API code still can't read past
   the grant.
3. **Consent is per partner, per family member, per scope.** It is given on a
   Cheeku-hosted screen, written to `consent_log`, shown in Settings, and can
   be revoked in one tap, which cuts access within a minute.
4. **Safety moves to the server for API traffic.** Today the phone runs the
   safety gate and builds the memory digest and the urgency floor. A partner
   can't be trusted to do that, so the API builds them on the server from
   the same code, kept in step by parity tests (as `rx-score` already does).
5. **Payments go only through a hosted checkout (Razorpay) or partner
   billing.** Prices are always set by the server, payment is verified on the
   server, the ledger is integer paise, and an order is placed with LabStack
   only after the money is captured.
6. **Events out are thin and signed.** A webhook says *what* changed, never
   the health detail. The partner then pulls the detail with its token, which
   re-checks the grant. This is the same "pull, don't trust" rule
   `labstack-webhook` already follows inbound.
7. **About 17 to 19 weeks** in six phases. Phase 0 is groundwork the launch
   needs anyway (separate environments, the RLS audit back to green, the
   definer review, LabStack live).

---

## 1. Where we start from

| Area | Today (on `main`) | Gap for a partner API |
| --- | --- | --- |
| Conversation | `cheeku-chat` Edge Function (Gemini now, `CHEEKU_MODEL_URL` later). The memory digest, safety gate (`src/lib/safety/detect.ts`), urgency ladder and floor are built **on the phone** (`src/lib/memory`). Metered per user by `claim_model_call` (0035). | The digest and the floor must be built on the server. There's no streaming yet (`ai-chat-streaming`). |
| Labs, pharmacy, doctors | `labstack` gateway: allow-listed ops (`labs.*`, `pharma.*`, `consult.*`), checks the JWT, checks each member against `covered_profile_ids`, re-validates every field (`validate.ts`), keeps our own rows. `labstack-webhook` verifies, de-duplicates (`partner_events`) and pulls. Migration 0045. | Not live yet (needs 0045 and the secrets). Only the app can call it. `isPaymentRequired: false`, so nothing is charged. |
| Appointments | `consult_appointments` and `lab_bookings` on the server; older doctor appointments are still kept on the phone (`cheeku.appointments`). | `int-server-bookings`: one server timeline for the whole family. |
| Records and memory | `documents` (`processing` / `needs_review` / `filed`), `entities`, `memory_facts`, `open_loops`, the `memory_bundle` RPC. | The reader is a stand-in (Suraj's `ai-ocr-*` track). Values aren't coded (no LOINC). |
| Longevity | `src/lib/longevity/areas.ts`: six areas (heart, sugar, sleep, movement, weight, checkups), each on track, watch or act; no single score. Computed on the phone. | Needs a server copy. |
| Wearables | `wearable_days` (0044) with tight check constraints; `wearables-google`. | Partners can't be a source yet (`sources` is a fixed list). |
| Daily care | `today_actions`, `daily_logs`, the care sweep (0038), the notification inbox. | Read-only exposure is enough for v1. |
| Payments | Demo only (`activate_tier_demo`, 0012). | Everything. |
| Isolation | RLS on `auth.uid() = user_id` everywhere; family members separated by `covered_profile_ids`; gateways check ownership. | A third dimension is missing: **which partner, under which grant**. |
| Consent | `consent_log`, purposes, `record_consent` (0031), `account_activity`. | A purpose per partner, and a "Connected apps" screen. |

The isolation model, the gateway pattern, inbound webhook handling, metering
and consent already exist and are sound. The plan extends them; it doesn't
replace them.

---

## 2. Who calls the API

| Kind | Example | Who owns the person | How they connect |
| --- | --- | --- | --- |
| **Embed (B2B2C)** | An insurer or employer offers Cheeku chat and bookings to its members inside its own app | The partner brings the user; Cheeku holds the health memory | The partner invites; the person signs in to Cheeku (phone OTP) once and grants scopes; then the partner calls on their behalf |
| **Connect** | A fitness app, a hospital app or a clinic asks to read wearables or book a test for a Cheeku user | Cheeku | "Connect with Cheeku": OAuth authorisation code + PKCE, the person grants scopes |
| **Supply** | Labs, doctors and pharmacies through LabStack; later hospitals sending reports | n/a | Inbound only, as `labstack` and `labstack-webhook` do now |

Embed and Connect use **the same flow and the same grant model**. Embed only
adds tenant-side invitation and partner billing. Build one, get both.

**Recommendation for the first partner:** an employer or insurer wellness
programme (Embed). It brings a payer and a group of users together, and it
uses all three of chat, bookings and longevity areas. Founder docs already
point at employers and insurers.

---

## 3. The shape

```
 Partner platforms                                   Cheeku app (Expo)
   │ OAuth 2.1 token (opaque, 15 min)                  │ Supabase session JWT
   ▼                                                   ▼
 api.cheeku.ai  ── Cloudflare: TLS 1.2+, WAF, DDoS,     (unchanged: supabase-js,
   │               per-client rate limit,                RLS, labstack,
   │               edge cache for public catalogue only  cheeku-chat functions)
   ▼                                                   │
 `api` service (Hono router on Deno; one Edge Function now,│
   the same code on Cloud Run Mumbai when scale asks)    │
   ├─ 1 authenticate: token → grant (cached ≤ 60 s) → internal JWT (60 s)
   ├─ 2 validate: Zod schemas generated from openapi.yaml; unknown fields refused
   ├─ 3 idempotency key · tenant + user meters · audit row (no content)
   ├─ 4 domain modules  ◄────────── supabase/functions/_shared/ ──────────┘
   │     care · chat · records · longevity · wearables · payments · events
   ▼
 Postgres (RLS + restrictive grant guards) · Storage (signed URLs, 5 min) · Queues (pgmq)
   ├── LabStack (labs, pharmacy, doctors)      ◄── labstack-webhook (exists)
   ├── Model (Gemini → Cheeku's own model)
   ├── Razorpay (orders, hosted checkout, refunds) ◄── razorpay-webhook (new)
   └── webhook-dispatcher (new) ──► partner endpoints (thin, signed, retried)
```

**Why Hono on Deno.** It runs unchanged on Supabase Edge Functions,
Deno Deploy, Node (Cloud Run, Fly) and Cloudflare Workers. Start inside the
Supabase project with no new infrastructure. Move it to a container in Mumbai
when sustained traffic, long streams or a partner SLA need dedicated capacity.
The load test (`perf-loadtest`) decides when, not a guess today.

**Why not just let partners call the existing functions.** Those functions
trust a Supabase session JWT, which carries full account access. A partner
must hold something smaller: one tenant, some members, some scopes, and
revocable at once.

**The app is not moved onto the public API in v1.** It keeps its door. Both
doors share `_shared/`, so behaviour can't drift. Moving the app later is an
option, not a requirement.

---

## 4. Identity, consent and isolation

This section matters most. Get it right and the rest is plumbing.

### 4.1 Tenants, clients, grants

- **Tenant**: a partner organisation (insurer, employer, hospital, clinic,
  fitness). It has a status (`sandbox`, `live`, `suspended`), allowed scopes,
  a rate plan, a signed data processing agreement date and a billing mode.
- **Client**: an app of that tenant. It has redirect URIs and authenticates
  with **`private_key_jwt`** (the partner signs with its private key and we
  hold only the public key or JWKS URL). There are no shared client secrets to
  leak. Large partners can add mTLS.
- **Grant**: one person's decision. It records the tenant, our `user_id`, the
  **family members** it covers, the scopes, the purpose shown, the
  `consent_log` row, the expiry (default 12 months, renewable) and
  `revoked_at`.

### 4.2 Flows

| Flow | Used for | Notes |
| --- | --- | --- |
| Authorisation code + PKCE | Anything that touches a person's data | Hosted at `connect.cheeku.ai`, which is a route in the Expo web export (`app/connect/*`), so it reuses sign-in, the consent sheet and the design system. No implicit flow, no passwords. |
| Refresh token | Keeping access | Rotated on every use, stored hashed, reuse detection kills the family of tokens. |
| Client credentials (`private_key_jwt`) | Tenant-level calls with no person in them: catalogue, invitations, webhook endpoints, billing statements | Never returns personal data. |
| Revocation + introspection | Partner sign-out, our kill switch | RFC 7009 and 7662 shapes. |

Access tokens are **opaque references** (15 minutes), not JWTs, so revoking
works within the grant cache (≤ 60 s) rather than waiting for an expiry.

### 4.3 Scopes

Each scope is split into read and write, and each covers one kind of data.
Health scopes always name the family members they cover.

| Scope | Gives | Consent words (plain, per content system) |
| --- | --- | --- |
| `profile.basic` | First name, age band, sex, city. Never the phone or email. | "Your name and age" |
| `chat` | Ask Cheeku on the person's behalf and read the answers | "Ask Cheeku questions. Cheeku reads your records to answer; [Partner] sees the answers." |
| `chat.history.read` | Conversations started elsewhere (the app, other partners) | "Your past chats with Cheeku" |
| `records.read` / `records.write` | Record list, files and values / send in a report (waits for the person's check) | "Your reports and prescriptions" / "Add reports to your file" |
| `observations.read` | Lab values and readings, normalised | "Your test results and readings" |
| `medications.read` | The medicine list (no doses changed, ever) | "Your medicines list" |
| `longevity.read` | The six areas: mark, plain reason, signal dates | "Your health areas (on track, watch, act)" |
| `wearables.read` / `wearables.write` | Daily rollups / send daily rollups | "Steps, sleep and heart data" |
| `care.book` | Search, book, reschedule and cancel labs, consults and pharmacy orders | "Book tests, doctors and medicines for you" |
| `care.read` | Bookings **this partner** made | (part of `care.book`) |
| `care.history.read` | All bookings, however they were made | "All your bookings" |
| `payments` | Start a checkout for the person, see payment status | "Ask you to pay for bookings" |

**Default: a partner sees what it created.** History from the app or from
other partners needs its own `*.history.read` scope, ticked by the person.
Partners can't get a full export, account settings, notifications, locations,
insurance policies or consent records in v1.

### 4.4 Four layers of isolation

| Layer | Question it answers | Enforced by |
| --- | --- | --- |
| **Tenant** | Can partner A see anything of partner B? | Every API row carries `tenant_id`; the internal JWT carries `tid`; restrictive policies on `api_*` tables; separate sandbox project. |
| **Account** | Can this grant reach another family? | The internal JWT's `sub` is the one `user_id` on the grant; the existing RLS (`auth.uid() = user_id`) applies unchanged. |
| **Member** | Can it reach a family member who wasn't granted? | `pids` claim = grant members ∩ `covered_profile_ids` at mint time; restrictive policies check `profile_id = any(pids)`. Rule 4 stays true. |
| **Entry** | Can it read rows another source created, or write over the person's own? | `source_tenant_id` on every row a partner can create; history scopes; partner writes land as `needs_review` (Rule 12) and never overwrite a value the person confirmed. |

**The guard, in SQL.** Partners never see this token; the API mints it per
request with the project's signing key (`ops-auth-config` confirms which
Supabase signing-key option allows minting).

```sql
-- Claims the API puts in its 60-second JWT:
--   { "sub": <user_id>, "role": "authenticated",
--     "cheeku_api": { "tid": <tenant>, "gid": <grant>, "pids": [<profile ids>], "scp": [<scopes>] } }
create or replace function api_claims () returns jsonb
stable set search_path = public as $$
  select auth.jwt () -> 'cheeku_api';
$$ language sql;

-- The app's own sessions have no cheeku_api claim and pass untouched.
create or replace function api_allows (p_profile uuid, p_scope text) returns boolean
stable set search_path = public as $$
  select case
    when api_claims () is null then true
    else p_profile::text in (select jsonb_array_elements_text (api_claims () -> 'pids'))
         and (api_claims () -> 'scp') ? p_scope
  end;
$$ language sql;

-- One restrictive policy per command, so a read scope can never delete.
create policy api_guard_read on documents as restrictive for select to authenticated
  using (api_allows (profile_id, 'records.read'));
create policy api_guard_insert on documents as restrictive for insert to authenticated
  with check (api_allows (profile_id, 'records.write'));
create policy api_guard_update on documents as restrictive for update to authenticated
  using (api_allows (profile_id, 'records.write')) with check (api_allows (profile_id, 'records.write'));
create policy api_guard_delete on documents as restrictive for delete to authenticated
  using (api_claims () is null);   -- partners never delete a person's records
```

- **Default deny.** Every table that no scope maps to gets
  `as restrictive ... using (api_claims () is null)`. The RLS audit in
  `tests/db` gains a check that **every** table has either a mapped guard or
  the deny, so a new table can't ship open to partners. This is why fixing
  the 22 stale audit failures is Phase 0.
- **SECURITY DEFINER functions bypass RLS** (there are 67 definer sites
  across the migrations). The API calls an **allow-list** of RPCs only, and
  each one on that list calls `api_allows` itself. That is added to
  `sec-definer-review`.
- **Service-role paths** (the LabStack writes) stay where they are. The
  domain module checks the grant explicitly, just as `member()` in
  `labstack/index.ts` checks `covered_profile_ids` today; the API passes
  `pids` in place of `covered`.

### 4.5 Partners can't link people across partners

- Members are exposed under **pairwise ids** per tenant:
  `mem_` + base32(HMAC-SHA256(tenant pepper, profile_id)), stored in
  `api_subjects` for the reverse lookup. Two partners can't join their data
  on our id, and a partner never sees a Cheeku UUID for a person.
- Other resource ids (`lab_…`, `apt_…`, `rx_…`) are random and carry no
  identity, and a partner only ever sees those for members it holds.

### 4.6 Revoke, delete, export

- **Revoke** from Settings > Privacy > Connected apps (a new screen), or by the
  partner. It sets `revoked_at`, drops cached grants, kills refresh tokens,
  emits `grant.revoked`, and writes `account_activity`. Under the contract the
  partner must delete what it copied (DPA clause).
- **Withdrawing consent** for a purpose in the app revokes every grant that
  depends on it.
- **Account deletion** (`delete-account`) revokes every grant first, then
  erases as it does now.
- **Export** gains a "Connected apps and what they did" section from
  `api_audit`.
- **Children.** Members under 18 can only be granted by the account holder
  (parental consent under DPDP), and the consent screen says so.

---

## 5. API surface (v1)

### 5.1 Conventions

- Base `https://api.cheeku.ai/v1`, JSON, UTF-8. **`openapi.yaml` in this
  folder is the source of truth**; Zod validators and a TypeScript SDK are
  generated from it.
- **No health data in URLs** (Rule 5). Anything carrying a test, medicine,
  symptom or value goes in a POST body, even searches:
  `POST /v1/catalog/medicines/search`, not `?q=metformin`.
- **Idempotency.** Every POST that creates or charges takes
  `Idempotency-Key`. Stored for 24 h per tenant with a hash of the request.
  A replay returns the first response; the same key with a different body is
  a 409.
- **Pagination**: cursor, `limit` ≤ 50.
- **Errors**:
  `{ "error": { "code", "message", "field", "request_id" } }`. Codes extend
  the gateway's `Fail` codes (`invalid`, `unavailable`, `unauthorized`,
  `busy`, `failed`) with `forbidden_scope`, `not_found`, `conflict` and
  `rate_limited`. Messages are screen-ready and never name LabStack (as
  `partner.ts` does today).
- **Versioning**: breaking changes only in `/v2`; additive changes in place;
  12 months' notice with `Deprecation` and `Sunset` headers.
- **Every response** carries `Cache-Control: no-store` except the public
  catalogue, plus a `Request-Id`.

### 5.2 Resources

| Group | Endpoints | Scope | Built on |
| --- | --- | --- | --- |
| Auth | `GET /oauth/authorize`, `POST /oauth/token`, `/oauth/revoke`, `/oauth/introspect` | n/a | new |
| Me | `GET /v1/me` (grant, members, scopes, expiry) | any | `api_grants` |
| Members | `GET /v1/members`, `GET /v1/members/{id}`; `POST /v1/invitations` (Embed, client credentials) | `profile.basic` | `profiles`, `covered_profile_ids` |
| Conversation | `POST /v1/members/{id}/conversations`; `POST /v1/conversations/{id}/messages` (JSON, or SSE with `Accept: text/event-stream`); `GET …/messages` | `chat` (+ `chat.history.read`) | `cheeku-chat`, `src/lib/memory`, `src/lib/safety` (server copies) |
| Catalogue | `GET /v1/catalog/lab-tests`, `/lab-packages`, `/specialities`; `POST /v1/catalog/doctors/search`, `/medicines/search` | client credentials or any | `lab_tests`, `labs.*`, `consult.*`, `pharma.search` ops |
| Availability | `POST /v1/availability/lab-slots`, `/doctor-slots`, `/serviceability` | `care.book` | `labs.slots`, `consult.slots`, `labs.serviceable`, `pharma.pharmacies` |
| Lab orders | `POST /v1/members/{id}/lab-orders`; `GET /v1/lab-orders/{id}`; `POST …/{id}/reschedule`, `…/cancel`, `…/problem`; `GET …/{id}/report` (signed URL) | `care.book` / `care.read` | `labs.place`, `labs.order`, `labs.reschedule`, `labs.cancel`, `labs.escalate` |
| Consultations | `POST /v1/members/{id}/consultations`; `POST /v1/members/{id}/instant-consultations`; `GET …/{id}`, `…/meeting-link`, `…/prescription`; reschedule, cancel | `care.book` / `care.read` | `consult.*` |
| Pharmacy | `POST /v1/members/{id}/pharmacy-estimates`, `…/pharmacy-orders`; `GET`, cancel | `care.book` / `care.read` | `pharma.*` |
| Appointments | `GET /v1/members/{id}/appointments` (labs + consults, one timeline) | `care.read` | after `int-server-bookings` |
| Records | `GET /v1/members/{id}/records`, `GET /v1/records/{id}` (+ file, 5-min signed URL); `POST /v1/members/{id}/records` (upload URL → reader → `needs_review`) | `records.*` | `documents`, Storage |
| Observations | `GET /v1/members/{id}/observations` (`from`, `to`, `kind`; no names in the URL) | `observations.read` | `entities`, readings |
| Medications | `GET /v1/members/{id}/medications` | `medications.read` | the medicine ledger |
| Longevity | `GET /v1/members/{id}/longevity/areas` | `longevity.read` | `areas.ts` (server copy) |
| Care plan | `GET /v1/members/{id}/care-plan/today` | `longevity.read` | `today_actions` |
| Wearables | `PUT /v1/members/{id}/wearables/days/{date}`; `GET …/wearables/days` | `wearables.*` | `wearable_days` |
| Payments | `GET /v1/payments/{id}`; created by the order calls (section 9) | `payments` | new |
| Webhooks | `POST/GET/DELETE /v1/webhook-endpoints`, `POST …/{id}/rotate-secret`, `POST /v1/events/{id}/redeliver` | client credentials | new |

---

## 6. The conversation layer over the API

The chat is the most valuable thing to expose and the most dangerous. What
must hold:

1. **The safety gate runs on the server, before any model call**, for every
   API turn. `src/lib/safety/detect.ts`, `escalation.ts`, the frozen corpus and
   the memory ladder (`src/lib/memory/ladder.ts`, `thresholds.ts`,
   `symptoms.ts`) are pure TypeScript. Copy them into `_shared/safety` and
   `_shared/memory`, kept identical by a parity test as
   `src/lib/rx/engine-sync.test.ts` does for `rx-score`. Hard stops and
   emergencies are answered by rules (112, 108, Tele-MANAS) and never reach
   the model, exactly as on the phone.
2. **The server builds the memory digest** from `memory_bundle`, `entities`,
   `open_loops`, longevity areas and wearables. This is `ai-memory-server`
   (Suraj), which the app also wants for `perf-bundle`. A partner never sends
   memory or a floor; anything like that in the body is refused.
3. **The floor wins.** The answer's tier is the higher of the model's and the
   floor (unchanged rule). The response carries a `safety` block
   (`tier`, `reasons`, `emergency` numbers, `display: "required"`). The
   partner contract says the safety block and the "not a diagnosis" line are
   shown as given, never cut or reworded.
4. **Metering at two levels.** `claim_model_call` per person (unchanged) plus a
   per-tenant budget (`claim_api_call`, same advisory-lock pattern) so one
   partner can't run up the model bill. Restore the 6-a-minute and 60-an-hour
   limits before any partner is live (`PLAN.md` Open: they are lifted for
   demos now).
5. **Streaming** through SSE (`ai-chat-streaming`): `delta` events, then a
   final `answer` event with citations, tier and actions. The final event is
   the one that counts; a dropped stream is answered again from the stored
   turn.
6. **Storage.** Turns are saved to `conversations` and `messages` with
   `source_tenant_id`, so the person sees them in the app too, under the
   partner's name. Nothing about a turn is logged. Photos follow the current
   rule: sent once, never stored, thumbnail only.
7. **Actions.** The model's `actions` (book a test, see a doctor) come back
   as structured suggestions. The partner decides how to show them and books
   through the care endpoints, with `care.book`.

---

## 7. Appointments and care bookings

- **Refactor first, then expose.** Move the op tables out of
  `supabase/functions/labstack/index.ts` into `_shared/care/` (labs, pharma,
  consult) with the `Ctx` changed from `{ uid, covered, holderId }` to
  `{ uid, pids, holderId, tenantId | null }`. The `labstack` function keeps
  its op names, so the app doesn't change. The API maps REST routes onto the
  same functions.
- **Every booking row gets `source_tenant_id`** (`lab_bookings`,
  `pharma_orders`, `consult_appointments`, `instant_consults`).
- **One timeline.** Finish `int-server-bookings` (doctor appointments off the
  phone) before exposing `/appointments`.
- **The referenceId stays ours**: our row is written first and its id is the
  LabStack `referenceId`, as now, so a timed-out call can be found again.
- **Status changes reach the partner** through the dispatcher (section 10),
  triggered from `refreshLab` / `refreshPharma` / `refreshConsult` in
  `partner.ts` (the one place every status change already passes through).
- **Ask LabStack before go-live** whether our agreement allows offering their
  catalogue and booking through third-party platforms, and on what terms.
  Add it to `docs/labstack-api/INTEGRATION-PLAN.md` section 10.

---

## 8. Health data: records, values, longevity, wearables

**Making sure the data is right.** Every value a partner reads or writes
carries:

- **provenance**: `source` (`report`, `reading`, `device`, `partner:<tenant>`),
  the date it was measured and the document it came from;
- **status**: a partner-sent report is `needs_review` until the person checks
  it (Rule 12) and is never used as a signal before that;
- **freshness**: the longevity rule (a signal older than 18 months is dropped)
  applies to API answers too;
- **units and codes**: values are normalised (`ai-memory-normalise`). LOINC
  codes and a FHIR R4 `Observation` shape are optional in v1 and become the
  default when hospitals or ABDM need them.

**Wearables.** `PUT …/wearables/days/{date}` validates against the same
ranges as the `wearable_days` check constraints. `sources` gains `partner`,
plus a `partner_sources` column naming the tenant. A partner-sent day is
merged with the phone's day field by field (`src/modules/wearables/merge.ts`
rules) and never overwrites a value from the person's own phone.

**Longevity.** `areas.ts` moves to `_shared/longevity` (parity-tested). The
API returns the six areas with mark, reason and signal dates. There's no
score and no "health age": the decision of 11 Nov 2026 holds for partners
too. Insurers get areas, never raw values, unless the person also grants
`observations.read`.

---

## 9. Payments

**Three ways money moves.**

| Mode | When | How |
| --- | --- | --- |
| `checkout` | The person pays for a lab test, consult or medicines | Razorpay Order created by the server → hosted checkout or payment link (UPI, cards, netbanking) → verified → order placed |
| `partner_billed` | The employer or insurer pays | Debited from the tenant's prepaid wallet or credit line at placement; monthly GST invoice |
| `subscription` | Cheeku plans | App Store and Play billing through RevenueCat (`pay-subscriptions`), never through the API. Partners can **sponsor** plans (seat licences) through the tenant, which writes the entitlement on the server |

**Physical services** (lab collection, consults, medicines) can be paid
outside store billing. Digital Cheeku features inside the app can't
(Guideline 3.1.1, `PLAN.md` Phase 6).

**The `checkout` flow:**

1. `POST …/lab-orders` with `payment: { mode: "checkout" }`. The server prices
   the order from `lab_tests.base_price` plus markup from `app_config`
   (`pay-markup`); a client never names a price (as with fitness, Rule 10).
   Our row is written as `awaiting_payment`.
2. The server creates a Razorpay Order: amount in **paise (integer)**,
   `receipt` = our order id, description `Cheeku order LAB-7F3K`. **No test
   names, medicines or conditions in payment notes or descriptions**: those
   travel to the payment provider and onto statements (Rule 5).
3. The response carries `payment.checkout_url` and `expires_at` (15 minutes).
4. `razorpay-webhook` (new; `--no-verify-jwt`; checks `X-Razorpay-Signature`
   HMAC with the webhook secret, then de-duplicates on the event id like
   `partner_events`) gets `payment.captured` → writes the ledger → places the
   LabStack order → emits `payment.succeeded` and `lab_order.created`.
5. If placement fails after capture, the refund is automatic and
   `payment.refunded` is emitted.
6. Cancellation refunds follow rules in `app_config` (for example, full
   before collection is assigned), never a client decision.

**Rules that don't bend:**

- Card data never touches us: hosted checkout only (PCI DSS SAQ-A,
  `sec-payments-pci`). Store only provider ids. Razorpay, as a licensed payment
  aggregator, carries the RBI tokenisation and storage rules.
- **The payment is verified on the server only**, by signature and by fetching
  the payment from Razorpay. A client "success" is a hint, never the truth.
- A double-entry `ledger_entries` table in paise, append-only. A daily job
  reconciles Razorpay settlements, our ledger, tenant wallets and the
  LabStack wallet (`getBalance`).
- `activate_tier_demo` and `app_flags.demo_billing` are dropped before any
  partner is live (`sec-demo-billing`).
- Razorpay Route (split settlement to providers) is out of v1: Cheeku is the
  merchant of record and settles with LabStack.

---

## 10. Events out (webhooks to partners)

- **Thin payloads**, for example
  `{ "id": "evt_…", "type": "lab_order.status_changed", "created_at": "…", "data": { "member_id": "mem_…", "lab_order_id": "lab_…", "status": "SAMPLE_COLLECTED" } }`.
  There are no test names, values, symptoms or answers in them; the partner
  pulls the detail with its token, which re-checks the grant. A revoked grant
  gets nothing, even from a late event.
- **Types (v1)**: `lab_order.status_changed`, `lab_order.report_ready`,
  `consultation.status_changed`, `consultation.prescription_ready`,
  `pharmacy_order.status_changed`, `payment.succeeded`, `payment.failed`,
  `payment.refunded`, `grant.revoked`, `longevity.areas_changed`.
- **Signing**: `Cheeku-Signature: t=<unix>,v1=<hex HMAC-SHA256(secret, t + "." + raw body)>`,
  5-minute tolerance, two active secrets during rotation (the same idea as
  LabStack's two keys).
- **Delivery**: written to a pgmq queue in the same transaction as the state
  change (outbox). The dispatcher retries at least once with backoff (1 m,
  5 m, 30 m, 2 h, 6 h, 12 h). After 24 h the endpoint is paused and the
  partner is emailed. Events can be redelivered on request.
- **SSRF guard**: HTTPS only. DNS is resolved and private, loopback,
  link-local and cloud-metadata addresses are refused. No redirects are
  followed. 10-second timeout, 64 KB cap on responses read.

---

## 11. Security checklist (API-specific, on top of section 6 of the infra doc)

- [ ] OAuth 2.1: PKCE required, no implicit, `private_key_jwt` client auth, exact redirect URI match, `state` and `nonce` checked.
- [ ] Opaque access tokens (15 min) and rotating refresh tokens stored as SHA-256 hashes; reuse detection.
- [ ] Internal JWT lives 60 s, never leaves the API, and carries `tid`, `gid`, `pids` and `scp`.
- [ ] Restrictive RLS guard per command on every exposed table; default deny on the rest; the audit test fails on any table without one.
- [ ] Definer RPCs callable through the API are on an allow-list, and each checks `api_allows`.
- [ ] Pairwise member ids per tenant.
- [ ] Zod validation from the OpenAPI spec; unknown fields refused; 256 KB body cap; files only through signed upload URLs (≤ 10 MB, pdf, jpg, png), scanned and EXIF-stripped.
- [ ] No health data in URLs, logs, payment notes, webhook payloads or analytics.
- [ ] `api_audit`: who, which grant, route template (not the raw URL), status, scope used, latency. No bodies. The person can see it.
- [ ] Rate limits per client, per tenant and per person; anomaly alerts (a sudden bulk read suspends the grant and pages the on-call).
- [ ] Cloudflare WAF and DDoS rules, TLS 1.2+, HSTS; optional IP allow-list and mTLS per tenant.
- [ ] Secrets in Supabase secrets or Vault (webhook secrets, peppers), rotation runbook (`sec-secrets`).
- [ ] Sandbox is a separate Supabase project with synthetic families only (`ops-envs`). No partner ever tests against production.
- [ ] External penetration test of the API before the first live partner (`sec-pentest`).
- [ ] The breach runbook covers partner tokens and grants, and the CERT-In 6-hour reporting window (`docs/privacy/breach-runbook.md`).
- [ ] Every partner signs a DPA (purpose, retention, deletion on revoke, no onward sale, no model training on our data, India-resident processing if they need it).
- [ ] Data stays in India: Supabase region and model serving (`ai-serving`); confirm the Gemini region and terms for API traffic.

---

## 12. Scale

- **Stateless API**, scaled sideways. Postgres connections go through
  Supavisor in transaction mode.
- **One query path per request**: each endpoint uses at most one RPC or one
  indexed read. Add `(tenant_id, …)` indexes on the new columns and review
  them with production-sized data (`perf-indexes`).
- **Cache only what is public**: the catalogue (tests, packages,
  specialities) at the edge for 10 minutes, refreshed by the nightly
  `admin.syncCatalogue`. Personal data is never cached outside the request.
- **Async for anything slow**: report reading (`ai-ocr-pipeline`), webhooks
  out, catalogue sync and reconciliation go through queues (`be-queue`),
  each job idempotent.
- **Protect the partners we depend on**: timeouts (LabStack 25 s, already
  set), a circuit breaker per upstream, a bulkhead so a slow LabStack doesn't
  starve chat, and `gl-monitor` alerts.
- **Grow tables on purpose**: `api_audit`, `api_usage`, `webhook_deliveries`
  and `partner_events` are partitioned by month with retention jobs
  (`db-retention`).
- **SLOs for v1**: 99.9 % monthly availability; p95 under 300 ms for reads,
  under 1.5 s for bookings excluding upstream time, and first chat token
  under 2 s.
- **Load test** at 10,000 simulated families plus 3 partners
  (`perf-loadtest`), then the 100,000 plan (`perf-scale-plan`). That is when
  to decide on moving the API from Edge Functions to Cloud Run (Mumbai) and
  adding a read replica.

---

## 13. Database changes (sketch, migrations 0046 to 0049)

Same rules as every migration here: safe to run twice, SQL-editor step files
under about 3,000 characters, and a read-only check query.

| Migration | Adds |
| --- | --- |
| 0046 `api_core` | `api_tenants`, `api_clients` (public JWK or JWKS URL, redirect URIs, allowed scopes), `api_grants`, `api_subjects` (pairwise ids), `api_refresh_tokens` (hashed, family id), `api_idempotency` (24 h), `api_usage` (per minute, no content), `api_audit` (partitioned). RLS: none readable by `anon`; the person reads their own grants and audit. A new purpose in `optional_purposes()`: `partner_sharing`, with the tenant on each `consent_log` row. |
| 0047 `api_guards` | `api_claims()`, `api_allows()`, the restrictive per-command guards on `profiles`, `documents`, `entities`, `memory_facts`, `conversations`, `messages`, `lab_bookings`, `pharma_orders`, `consult_appointments`, `instant_consults`, `wearable_days`, `today_actions`; default deny on every other table. |
| 0048 `api_provenance` | `source_tenant_id` on the tables above; `wearable_days.sources` allows `partner`; `claim_api_call()` (tenant meter, `app_config('api_limits')`). |
| 0049 `payments` | `payments`, `refunds`, `ledger_entries` (paise, append-only), `tenant_wallets`, `webhook_endpoints` (secret in Vault), `webhook_deliveries`, the pgmq queues; `awaiting_payment` added to the booking statuses. |

---

## 14. Phases

Weeks assume Archit full time, with Suraj on the memory and safety port.
These are estimates, not promises.

| Phase | Weeks | What | Tracker ids |
| --- | --- | --- | --- |
| **0 Ground** | 2 | Staging and sandbox projects; CI; secrets inventory; definer review; RLS audit back to green (22 failures, plus `insurance_policies`); demo billing and lab clock removed; queues; 0045 applied and LabStack UAT end to end | `ops-envs`, `ops-ci`, `sec-secrets`, `sec-definer-review`, `sec-demo-billing`, `sec-lab-demo`, `be-queue`, `int-lab-partner` |
| **1 Front door** | 3 | 0046 and 0047; OAuth server; `connect.cheeku.ai` consent screens; token exchange and internal JWT; idempotency, meters and audit; `openapi.yaml`, generated Zod and SDK; `/v1/me`, `/v1/members`; Settings > Connected apps in the app | new: `api-foundation`, `api-consent`, `api-isolation`; `be-edge-standards`, `ai-api-contract` |
| **2 Care and money** | 4 | `_shared/care` refactor; catalogue, availability, lab orders, consults, pharmacy, appointments; server bookings; 0048 and 0049; Razorpay checkout, webhook, ledger, refunds, reconciliation; partner billing; webhooks out | new: `api-care`, `api-webhooks-out`; `int-server-bookings`, `pay-care`, `pay-markup`, `sec-payments-pci` |
| **3 Conversation** | 3 to 4 | Server safety gate and ladder (parity tests); server memory digest; chat endpoint with SSE; tenant model budget; limits restored | new: `api-chat`; `ai-memory-server`, `ai-chat-streaming`, `rl-chat-edge` |
| **4 Health data** | 3 | Records read and ingest (review first); observations; medications; longevity areas on the server; care plan; wearables in and out; optional FHIR shapes | new: `api-health-data`; `ai-memory-normalise` |
| **5 Harden and pilot** | 2 to 3 | Load test; pen test; partitions and retention; SLO dashboards and alerts; partner onboarding runbook; first pilot partner in sandbox, then live | new: `api-pilot`; `perf-loadtest`, `sec-pentest`, `db-retention`, `ops-monitoring` |

**Total: about 17 to 19 weeks.** Phases 3 and 4 can overlap with Phase 2 once
Phase 1 is in, if Suraj takes the safety and memory ports.

**Done means**, for each phase: typecheck and tests green, the RLS audit
green including the new guards, a scenario script on a local Postgres
proving that a token for member A of family X reads nothing of member B or
of family Y, and (for any app screen) a device check by Athar.

---

## 15. Decisions for the owner

1. **First partner type.** The recommendation is an employer or insurer
   wellness programme (section 2). It decides whether Phase 3 (chat) or
   Phase 4 (health data) comes first after care.
2. **History visibility.** The recommendation is that partners see only what
   they created unless the person ticks a history scope (section 4.3).
3. **Who pays by default** in partner flows: the person (`checkout`) or the
   partner (`partner_billed`)? And who is merchant of record: the
   recommendation is Cheeku, settling with LabStack.
4. **LabStack terms** for redistribution through third-party platforms, and
   their payment model (`isPaymentRequired` link vs our own checkout), which is
   already open in INTEGRATION-PLAN section 10.
5. **Liability and the safety block** inside another company's app: contract
   wording, and whether a partner using the urgency tier for triage changes
   the product's regulatory position. Ask a lawyer before the first live
   partner.
6. **Where the API runs at scale** (stay on Edge Functions or move to Cloud
   Run in Mumbai). Decide with the Phase 5 load test numbers.

---

## 16. Not in v1

- Partners writing medicines, doses, conditions or anything clinical (Rule 6).
- Bulk or population exports, research datasets and model training on partner traffic.
- ABDM / ABHA linking (`v2-insurance-pay`); the FHIR shapes in Phase 4 prepare for it.
- Insurance policies, locations, notifications and consent records through the API.
- Doctor-side or provider-side APIs (`v2-doctor-twins`).
- Moving the Cheeku app itself onto the public API.
