# Cheeku Platform API: overview and rollout plan

For partner platforms: insurers, employers, hospitals, clinics, and fitness and
wellness apps. It describes what the Cheeku Platform API will offer, how
partners connect, how each person's data is kept isolated and under their
control, how payments work, and how the platform scales. Version 1, November
2026. This is a plan; the sandbox opens with Phase 1 (section 13).

---

## 0. In short

- **One versioned API** at `https://api.cheeku.ai/v1`. It gives partners what
  Cheeku already runs end to end for families:
  - conversations about a person's health;
  - care bookings: lab tests, doctor consultations and medicine delivery;
  - health records and results;
  - health areas;
  - activity and wearable data;
  - the daily care plan.
- **The same core as Cheeku's own app.** Partner calls run through the same
  services, safety rules and data rules as the app, so a partner never gets a
  weaker version of the platform.
- **The person stays in control.** Access is granted by the person, per
  partner, per family member and per kind of data, on a Cheeku screen. It can
  be revoked in one tap, which takes effect within a minute.
- **Isolation is enforced in the data layer itself**, not only in application
  code. It covers four levels: partner, family, family member and each record.
- **Payments** go through a hosted, PCI-DSS compliant checkout or through
  partner billing. Cheeku sets every price and verifies every payment on its
  side.
- **Events** are signed and carry no health details. Partners fetch the
  details with their own access, which is checked again at that moment.
- **Built to scale.** The API runs on stateless services across multiple zones
  in India, a highly available database with point-in-time recovery, durable
  queues and a protective edge network (section 12).

---

## 1. What partners can build

| Capability | What it does |
| --- | --- |
| **Conversations** | Ask Cheeku about a family member's health. Answers draw on that person's own records, readings and history, and say how urgent something looks in one of four levels. Cheeku never diagnoses, prescribes or gives doses. |
| **Lab tests** | Browse tests and packages, check serviceability by pincode, see real slots, and book home sample collection or a centre visit. Track it from booking to report, and reschedule, cancel or report a problem. |
| **Doctor consultations** | Search doctors by speciality, language and location, then book online (video or audio) or in-person visits. Also: instant "talk to a doctor now", joining the call, and the e-prescription afterwards. |
| **Medicines** | Search medicines, see same-salt alternatives, get an estimate, and order for home delivery or pickup, with a prescription attached when one is required. |
| **Appointments** | One timeline of lab visits and consultations for each family member. |
| **Health records** | Reports and prescriptions on file, their values, and sending a new report in. A new report waits until the person has checked it. |
| **Health areas** | Up to six areas (heart, sugar, sleep, movement, weight, check-ups), each marked on track, watch or act, with a plain reason and dates. There is no single score and no "health age". |
| **Activity and wearables** | Daily steps, sleep, heart rate, blood pressure, glucose, weight and workouts, read and written as daily summaries. |
| **Daily care plan** | Today's habits, reminders and follow-ups for a family member. |
| **Payments** | A checkout for the person, or billing to the partner. |
| **Events** | Real-time notice of status changes for bookings, payments and access. |

---

## 2. How partners connect

| Option | Example | How it works |
| --- | --- | --- |
| **Embed** | An insurer or employer offers Cheeku conversations and bookings to its members inside its own app | The partner invites its members. Each person signs in to Cheeku once (phone OTP) and grants access. The partner then calls the API on their behalf. Bookings can be billed to the partner. |
| **Connect** | A fitness app reads activity data, or a clinic books a test for an existing Cheeku user | "Connect with Cheeku": the person signs in and grants exactly the access the partner asks for. |

Both options use the same sign-in, consent and access rules, so a partner can
start with one and add the other later without rebuilding.

---

## 3. How it fits together

```
  Partner app or platform
        │  HTTPS, OAuth 2.1 access token
        ▼
  ┌──────────────────────────────────────────────────────────────┐
  │  Cheeku edge                                                 │
  │  TLS · firewall · DDoS protection · rate limits per partner   │
  └──────────────────────────────────────────────────────────────┘
        ▼
  ┌──────────────────────────────────────────────────────────────┐
  │  Cheeku API                                                  │
  │  1. check the token and the person's grant                    │
  │  2. validate every field against the published schema         │
  │  3. idempotency · usage limits · audit record (no content)    │
  └──────────────────────────────────────────────────────────────┘
        ▼
  ┌───────────────┬──────────────┬──────────────┬─────────────┬───────────┐
  │ Conversations │ Care         │ Health data  │ Payments    │ Events    │
  │ safety first, │ labs, doctors│ records,     │ checkout,   │ signed,   │
  │ grounded in   │ medicines,   │ results,     │ partner     │ retried,  │
  │ the person's  │ managed end  │ areas,       │ billing,    │ no health │
  │ own history   │ to end       │ wearables    │ refunds     │ details   │
  └───────────────┴──────────────┴──────────────┴─────────────┴───────────┘
        ▼
  ┌──────────────────────────────────────────────────────────────┐
  │  Secure data layer (India)                                   │
  │  access rules per partner, grant, family member and record ·  │
  │  encrypted files behind short-lived links · audit trail        │
  └──────────────────────────────────────────────────────────────┘
```

Cheeku runs the whole booking experience: catalogue, availability, booking,
status, reports, prescriptions, support and payments. Partners see one Cheeku
API and one set of statuses whichever lab, doctor or pharmacy serves the
order.

---

## 4. Consent, access and data isolation

### 4.1 Partners, apps and grants

- **Partner**: an organisation with a signed data processing agreement, an
  agreed set of data it may ask for, a usage plan and a billing mode.
- **App**: a partner application registered with its redirect addresses and
  its public key. Apps prove who they are by signing with their private key
  (`private_key_jwt`), so no shared secret ever has to be sent or stored.
  Mutual TLS is available for partners who need it.
- **Grant**: one person's decision. It names the partner, the family members
  covered, the kinds of data, the purpose shown to the person and an expiry
  (12 months by default, renewable). It stays in force until the person
  revokes it.

### 4.2 Sign-in and authorisation

| Flow | Used for |
| --- | --- |
| **Authorisation code with PKCE** (OAuth 2.1) | Anything that involves a person. The person signs in and consents on a Cheeku-hosted screen; the partner never sees their Cheeku credentials. |
| **Refresh tokens** | Staying connected. Rotated on every use; reuse of an old one ends the whole session. |
| **Client credentials** | Partner-level calls with no person in them: catalogue, invitations, event endpoints, billing statements. These never return personal data. |
| **Revocation and introspection** | Signing out, and checking a token. |

Access tokens last 15 minutes and are checked against the grant on every
request, so a revoked grant stops working within a minute.

### 4.3 Kinds of data (scopes)

Every scope is shown to the person in plain words. Health scopes always name
the family members they cover.

| Scope | Gives | What the person reads |
| --- | --- | --- |
| `profile.basic` | First name, age band, sex, city. Never phone or email. | "Your name and age" |
| `chat` | Ask Cheeku on the person's behalf and read the answers | "Ask Cheeku questions. Cheeku reads your records to answer; [Partner] sees the answers." |
| `chat.history.read` | Conversations started elsewhere | "Your past chats with Cheeku" |
| `records.read` / `records.write` | Records, files and values / send in a report | "Your reports and prescriptions" / "Add reports to your file" |
| `observations.read` | Test results and readings | "Your test results and readings" |
| `medications.read` | The medicine list | "Your medicines list" |
| `longevity.read` | Health areas and the daily care plan | "Your health areas (on track, watch, act)" |
| `wearables.read` / `wearables.write` | Daily activity summaries | "Steps, sleep and heart data" |
| `care.book` | Book, reschedule and cancel lab tests, consultations and medicine orders | "Book tests, doctors and medicines for you" |
| `care.read` | Bookings this partner made | (part of `care.book`) |
| `care.history.read` | All bookings, however they were made | "All your bookings" |
| `payments` | Start a checkout, see payment status | "Ask you to pay for bookings" |

**By default, a partner sees what it created.** History from Cheeku's own app
or from other partners needs a separate history scope that the person ticks.

### 4.4 Four levels of isolation

| Level | The guarantee | How |
| --- | --- | --- |
| **Partner** | One partner never sees another partner's data, users or traffic. | Every partner record is tagged to the partner, and the access check runs in the data layer. Sandbox and production are fully separate environments. |
| **Family** | A grant never reaches another family. | Each request is bound to the one account on the grant. |
| **Family member** | A grant for one member never reveals another member, even in the same family. | Each request carries only the members on the grant, and every read and write is checked against them. |
| **Record** | A partner can't read records it has no history scope for, and can't overwrite what the person confirmed. | Every record carries its source. Partner-sent reports wait for the person's check, and partner-sent data never replaces the person's own. |

These checks run where the data lives, for every read and every write, with a
default of **deny**. Anything not explicitly opened to partners stays closed.
A read permission can never delete anything, and partners can't delete a
person's records at all.

### 4.5 Privacy-preserving identifiers

Each partner sees a family member under an identifier made only for that
partner. Two partners can't match their data on a shared id, and no partner
ever sees Cheeku's internal identifiers.

### 4.6 Revoke, delete, export

- **Revoke**: the person can revoke from Cheeku's settings (Connected apps), or
  the partner can. Tokens stop within a minute and a `grant.revoked` event is
  sent. Under the agreement, the partner deletes what it holds for that
  purpose.
- **Withdrawing consent** in Cheeku revokes every grant that depends on it.
- **Deleting a Cheeku account** revokes all grants first, then erases the
  data.
- **Export**: a person's export lists which partners had access and what they
  did.
- **Children**: members under 18 can only be granted by the parent or
  guardian who holds the account.

---

## 5. Using the API

### 5.1 Conventions

- REST over HTTPS with JSON, described by a published **OpenAPI** document,
  with SDKs generated from it.
- **No health details in URLs.** Anything that names a test, medicine, symptom
  or value goes in the request body, searches included (for example
  `POST /v1/catalog/medicines/search`).
- **Idempotency**: every request that creates or charges takes an
  `Idempotency-Key`. A retry returns the first result; the same key with
  different content is refused.
- **Pagination**: cursor-based, up to 50 items.
- **Errors**: `{ "error": { "code", "message", "field", "request_id" } }`.
  The codes are `invalid`, `unauthorized`, `forbidden_scope`, `not_found`,
  `conflict`, `rate_limited`, `unavailable` and `failed`. Messages are written
  so they can be shown to the person as they are.
- **Versioning**: breaking changes only in a new major version; additions in
  place; at least 12 months' notice with `Deprecation` and `Sunset` headers.
- **Caching**: personal responses are `no-store`; every response carries a
  `Request-Id`.

### 5.2 Resources

| Group | Endpoints | Scope |
| --- | --- | --- |
| Auth | `GET /oauth/authorize`, `POST /oauth/token`, `/oauth/revoke`, `/oauth/introspect` | – |
| Me | `GET /v1/me` (grant, members, scopes, expiry) | any |
| Members | `GET /v1/members`, `GET /v1/members/{id}`; `POST /v1/invitations` (Embed) | `profile.basic` |
| Conversations | `POST /v1/members/{id}/conversations`; `POST /v1/conversations/{id}/messages` (JSON, or a stream with `Accept: text/event-stream`); `GET /v1/conversations/{id}/messages` | `chat` |
| Catalogue | `GET /v1/catalog/lab-tests`, `/lab-packages`, `/specialities`; `POST /v1/catalog/doctors/search`, `/medicines/search` | partner or any |
| Availability | `POST /v1/availability/lab-slots`, `/doctor-slots`, `/serviceability` | `care.book` |
| Lab orders | `POST /v1/members/{id}/lab-orders`; `GET /v1/lab-orders/{id}`; `POST …/reschedule`, `…/cancel`, `…/problem`; `GET …/report` | `care.book` / `care.read` |
| Consultations | `POST /v1/members/{id}/consultations`, `/instant-consultations`; `GET …/{id}`, `…/meeting-link`, `…/prescription`; reschedule, cancel | `care.book` / `care.read` |
| Medicines | `POST /v1/members/{id}/pharmacy-estimates`, `/pharmacy-orders`; `GET`, cancel | `care.book` / `care.read` |
| Appointments | `GET /v1/members/{id}/appointments` | `care.read` |
| Records | `GET /v1/members/{id}/records`, `GET /v1/records/{id}`; `POST /v1/members/{id}/records` | `records.*` |
| Results | `GET /v1/members/{id}/observations` | `observations.read` |
| Medicines list | `GET /v1/members/{id}/medications` | `medications.read` |
| Health areas | `GET /v1/members/{id}/longevity/areas`, `GET /v1/members/{id}/care-plan/today` | `longevity.read` |
| Wearables | `PUT /v1/members/{id}/wearables/days/{date}`; `GET /v1/members/{id}/wearables/days` | `wearables.*` |
| Payments | `GET /v1/payments/{id}` (payments start from the booking calls) | `payments` |
| Events | `POST/GET/DELETE /v1/webhook-endpoints`, `POST …/{id}/rotate-secret`, `POST /v1/events/{id}/redeliver` | partner |

Files (reports, prescriptions) are never sent inline. The API returns a
short-lived link (5 minutes) to download or upload, limited to PDF, JPG and
PNG of up to 10 MB.

---

## 6. Conversations

- **Safety comes first, on Cheeku's side, every time.** Before any answer is
  written, Cheeku checks the question and the person's history for anything
  urgent. Emergencies and hard stops get fixed, tested guidance (112, 108,
  Tele-MANAS) and are never left to open-ended wording.
- **Answers are grounded in the person's own records.** When the records don't
  cover a question, Cheeku says so rather than guessing.
- **Four urgency levels**: reassure, monitor, contact a doctor today, go now.
  Each answer carries a `safety` block with the level, the reasons and the
  emergency numbers, marked `display: required`. Partners show it as given,
  without cutting or rewording it, along with the line that Cheeku doesn't
  diagnose.
- **Never clinical decisions**: no diagnosis, no prescription, no dose changes.
- **Partners send questions, not context.** Cheeku assembles the person's
  context itself from what they have granted. Any attempt to supply history,
  urgency or instructions in the request is refused.
- **Streaming**: answers can stream as they are written, with a final message
  that holds the complete answer, the records it relied on, the urgency and
  any suggested next steps (for example "book an HbA1c test"). Next steps are
  booked through the care endpoints.
- **The person sees it too**: conversations held through a partner appear in
  the person's Cheeku app under the partner's name.
- **Fair use**: usage limits apply per person and per partner.

---

## 7. Care bookings

Cheeku manages every booking end to end: catalogue and prices, serviceability,
real slots, confirmation, status, reports, prescriptions, rescheduling,
cancellation, support and refunds. Partners work with one API and one set of
statuses, whichever lab, doctor or pharmacy serves the order.

| Booking | Statuses |
| --- | --- |
| Lab test | `pending`, `booked`, `collector_assigned`, `collector_on_the_way`, `sample_collected`, `processing`, `report_ready`; also `rescheduled`, `cancelled`, `missed`, `sample_rejected`, `partly_ready` |
| Consultation | `pending`, `booked`, `confirmed`, `rescheduled`, `in_progress`, `completed`, `cancelled`, `missed` |
| Instant consultation | `finding_doctor`, `doctor_assigned`, `expired`, `cancelled` |
| Medicine order | `pending`, `placed`, `confirmed`, `shipped`, `partly_delivered`, `delivered`, `cancelled` |

- **Booking is safe to retry**: every booking takes an idempotency key, so a
  timeout never creates a double booking.
- **Fast answer, final status by event**: a booking request returns within
  2 seconds. If confirmation takes longer, it comes back `pending` and an
  event follows.
- **Reports and prescriptions** from a booking are filed to the person's
  records automatically. Lab values become readable results, and health
  areas update.
- **Medicines** that need a prescription can't be ordered without one, and
  restricted medicines can't be ordered at all. Cheaper same-salt alternatives
  are shown, never swapped in silently.
- **Suggested tests**: when booking a consultation, the tests already due for
  the person can be passed to the doctor as suggestions.

---

## 8. Health data you can rely on

Every value the API returns, and every value a partner sends, carries:

- **its source**: a lab report, a reading the person entered, a device, or a
  named partner;
- **its date**: when it was measured, not when it arrived;
- **its status**: a report sent by a partner stays `needs_review` until the
  person checks it, and is never used before then;
- **freshness**: health areas ignore signals older than 18 months;
- **normalised units and codes**: values come in consistent units, with LOINC
  codes and FHIR R4 `Observation` shapes available for hospital and national
  health-record use.

**Wearables.** Days sent by a partner are checked against physiological
ranges, merged field by field with the person's own devices, and never
overwrite a value from the person's own phone.

**Health areas** come back as marks with reasons and dates, never as a score.
A partner that needs the raw values must also hold `observations.read`.

---

## 9. Payments

| Mode | When | How |
| --- | --- | --- |
| `checkout` | The person pays for a test, consultation or medicines | Cheeku returns a hosted checkout link (UPI, cards, net banking, wallets) that is valid for 15 minutes. The booking is confirmed once the payment is captured. |
| `partner_billed` | The partner pays, for example an employer or insurer covering its members | Charged to the partner's prepaid balance or credit line when the booking is placed; invoiced monthly with GST. |
| Sponsored plans | A partner pays for its members' Cheeku plans | Seats are assigned through the partner account. |

- **Cheeku sets every price.** A request never names a price. The amount comes
  from Cheeku's catalogue and the partner's agreed rates.
- **Verified on Cheeku's side only.** A payment counts only once Cheeku has
  confirmed it with the payment provider. A "success" from a device or
  browser is never trusted on its own.
- **No card data touches Cheeku or the partner.** Checkout is hosted by an
  RBI-licensed payment aggregator, so card handling stays within its PCI-DSS
  scope.
- **No health details in payments.** Descriptions read like
  `Cheeku order LAB-7F3K`, never a test, medicine or condition.
- **Automatic refunds** if a paid booking can't be confirmed. Cancellation
  refunds follow published rules (for example, a full refund before a
  collector is assigned).
- **Every rupee is accounted for**: amounts are kept in whole paise in an
  append-only, double-entry ledger, reconciled daily.

---

## 10. Events (webhooks)

- **No health details in events**, for example:
  `{ "id": "evt_…", "type": "lab_order.status_changed", "created_at": "…", "data": { "member_id": "mem_…", "lab_order_id": "lab_…", "status": "sample_collected" } }`.
  The partner fetches details with its access token, which checks the grant
  again. A revoked grant gets nothing, even from a late event.
- **Types**:
  - `lab_order.status_changed`, `lab_order.report_ready`;
  - `consultation.status_changed`, `consultation.prescription_ready`;
  - `pharmacy_order.status_changed`;
  - `payment.succeeded`, `payment.failed`, `payment.refunded`;
  - `grant.revoked`, `longevity.areas_changed`.
- **Signed**: `Cheeku-Signature: t=<unix time>,v1=<HMAC-SHA256 of t + "." + body>`.
  It is valid for 5 minutes, and two secrets stay active during rotation.
- **Reliable**: at least once delivery, retried with backoff for 24 hours (at
  1 min, 5 min, 30 min, 2 h, 6 h and 12 h). After that the endpoint is paused
  and the partner is told. Any event can be redelivered on request. Events
  carry ids, so partners can ignore repeats.
- **Safe**: Cheeku only sends to HTTPS addresses on the public internet and
  doesn't follow redirects.

---

## 11. Security and compliance

- **Standards**: OAuth 2.1 with PKCE, `private_key_jwt` client
  authentication, optional mutual TLS, exact redirect matching.
- **Tokens**: 15-minute access tokens checked against the grant on every
  request; rotating refresh tokens stored only as hashes.
- **Least access**: deny by default in the data layer, scope and family-member
  checks on every read and write, partner-specific identifiers.
- **Validation**: every field is checked against the published schema, and
  unknown fields are refused. Requests are capped at 256 KB; files go through
  short-lived links, are type-checked and have location metadata stripped.
- **Encryption**: TLS 1.2+ in transit and AES-256 at rest. Secrets are kept in
  a managed vault and rotated.
- **Audit**: every partner request is recorded with who, which grant, which
  endpoint, the result and timing, never the content. People can see which
  partners accessed their data.
- **Abuse protection**: rate limits per app, per partner and per person, and
  anomaly detection (for example, a sudden bulk read suspends the grant and
  alerts Cheeku's on-call team).
- **Testing**: an independent penetration test before the first live partner,
  then yearly and after major changes.
- **India first**: personal and health data is stored and processed in India.
- **Law and regulation**: built for the Digital Personal Data Protection Act,
  2023 (consent, purpose limits, children's data, erasure, breach notice).
  Incidents are reported within CERT-In's 6-hour window. Payments follow RBI
  rules through a licensed aggregator. Medicine orders follow prescription
  rules.
- **Agreements**: every partner signs a data processing agreement. It covers
  purpose, retention, deletion on revoke, no onward sale, no re-identification
  and no use of Cheeku data to train systems.

---

## 12. Cloud infrastructure and scale

| Layer | How it works |
| --- | --- |
| **Edge** | A global edge network terminates TLS close to the user and filters attacks (firewall, DDoS protection, bot rules). It applies per-partner rate limits before traffic reaches Cheeku. Only the public catalogue is cached here; personal data never is. |
| **API services** | Stateless services that hold no session on the server. They run across at least two availability zones in an India region and scale out automatically on load and latency. Deploys roll out gradually with automatic rollback, so there is no downtime. |
| **Separated workloads** | Conversations, care, health data, payments and events run as separate services with their own capacity, timeouts and circuit breakers. A slow booking provider can't slow conversations, and a traffic spike from one partner can't starve another. |
| **Database** | A managed relational database with a standby in a second zone and automatic failover. Read replicas take heavy reads. Connection pooling keeps thousands of requests on a small, steady set of connections. Point-in-time recovery is enabled. |
| **Files** | Encrypted object storage, reachable only through links that expire in minutes. |
| **Background work** | Durable queues for events, report processing, catalogue updates and reconciliation. Every job can safely run twice. Failed jobs retry and then go to a holding queue for review. |
| **Event delivery** | Events are written in the same transaction as the change they describe (the outbox pattern), so no change is lost and none is announced twice. |
| **Caching** | Short in-memory caches for grant checks (at most 60 seconds) and the catalogue. Personal data is never cached outside a request. |
| **Growth** | High-volume logs are partitioned by month and pruned by retention rules. Indexes are reviewed against production-sized data. |
| **Backups and recovery** | Continuous encrypted backups with a second copy in another Indian region. Target recovery point: 5 minutes. Target recovery time: 4 hours. Restore drills are run every quarter. |
| **Observability** | Metrics, traces and structured logs with no personal content. Dashboards per partner, round-the-clock alerting and a public status page. |

**Service targets for version 1:**

| Measure | Target |
| --- | --- |
| Availability | 99.9 % monthly |
| Reads (p95) | under 300 ms |
| Booking requests (p95) | under 2 s (final status by event) |
| First words of a conversation answer | under 2 s |
| Event delivery (p95) | under 30 s from the change |

**Capacity.** The platform is load tested before general availability with
10,000 simulated families and several partners. It is then planned for
100,000 families by scaling out: more API instances, more read replicas and
more queue workers. There is no redesign along the way. Partners with larger
programmes agree dedicated capacity and limits in their agreement.

**Default limits** (raised by agreement): 50 requests a second per app, 600 a
minute per person across all partners, and conversation and booking limits
per person per day. Responses over a limit return `429` with `Retry-After`.

---

## 13. Rollout

| Phase | About | What partners get |
| --- | --- | --- |
| **1 Foundation** | 5 weeks | Sandbox with synthetic families, OpenAPI document, SDK, sign-in and consent, members, the Connected apps screen in Cheeku |
| **2 Care and payments** | 4 weeks | Catalogue, availability, lab tests, consultations, medicines, appointments, checkout and partner billing, events |
| **3 Conversations** | 3 to 4 weeks | Conversations with streaming and the safety block |
| **4 Health data** | 3 weeks | Records (read and send), results, medicines list, health areas, daily care plan, wearables |
| **5 Pilot and launch** | 2 to 3 weeks | Load and penetration tests passed, first pilot partner live, then general availability |

About four to five months from start to general availability. Phases 3 and 4
can overlap with Phase 2. The sandbox opens at the end of Phase 1, so partners
can build while later phases land.

---

## 14. Partner onboarding

1. Sign the partner agreement and the data processing agreement.
2. Complete the security questionnaire.
3. Register the app: redirect addresses, public key, requested scopes, event
   address.
4. Build in the sandbox against synthetic families. Real data never enters it.
5. Pass the certification checks:
   - consent flow;
   - the safety block shown as given;
   - event signatures verified;
   - idempotency keys used;
   - revoke handled and data deleted.
6. Go-live review, then production keys.
7. A pilot group of members, then the full programme.

**What partners agree to:**

- show the safety block unchanged;
- use data only for the purpose the person agreed to;
- delete it when access is revoked;
- don't re-identify, sell or train on it;
- verify every event signature;
- keep keys secure and rotate them.

---

## 15. Not in version 1

- Partners writing medicines, doses, conditions or any clinical decision.
- Bulk or population-level data exports.
- National health ID (ABHA) linking. The FHIR shapes in section 8 prepare for
  it.
- Insurance policies, locations, notifications and consent records.
- Doctor-facing or provider-facing APIs.
