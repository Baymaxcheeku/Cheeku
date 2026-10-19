# LabStack partnership tracker

The live tracker is **https://claude.ai/artifact/47jpFQDfdqQLKUPdNeatV1** (private to the owner; share it from its Share menu). It is internal only: keep LabStack's name out of decks and anything customer facing.

Varun, LabStack's founder, agreed on a call to open the LabStack network (lab tests, doctor consultations, medicine delivery) to Cheeku through LabStack's APIs, once the app and the longevity use case are ready. This tracker holds what we prepare before that and what each integration phase needs.

`tracker.html` is the page source and `seed.py` writes the data set (48 tasks, 36 API capabilities, 21 questions for LabStack). The page reads everything from the artifact's database, not from this folder.

## What is in it

- **Plan**: tasks in seven phases, `p0` Prepare now, `p1` Access and docs, `p2` Lab tests, `p3` Consultations, `p4` Medicines, `p5` Payments, `p6` Go-live. Owners are `athar`, `suraj`, `founder` or `labstack`.
- **API inventory** (`apis`): one row per capability we need from LabStack. States: `confirm` (not known), `overview` (LabStack's overview lists it, path not read yet), `documented` (endpoint known), `gap`, `built`, `tested`, `live`.
- **Questions for LabStack** (`questions`): what to settle with Varun before the deep dive. Answers are typed into the page.
- **Linked launch tasks** (`linked`): a mirror of the launch tracker tasks this work feeds, with a `syncedAt` time.

### What the API overviews told us (19 Oct)

The full docs run to about 90 pages per API and wait until the integration starts. The overviews settled these points:

- **Auth** (all three APIs): an API key in the `ls-api-key` header on every call. A store can hold two live keys, so rotate before revoking; keys can carry an expiry; an expired or revoked key gets unauthorized.
- **Labs**: availability checks, package catalog, requests (enquiries), order management, report retrieval, health camps. Webhooks not mentioned.
- **Consultation**: speciality discovery, provider search, appointment booking, document management, video consultations, instant consults (`getInstantStatus`). Instant consult webhooks go to a URL and signing secret we give; delivery is at least once (key on `requestId` plus `event`) and is dropped after retries, so a webhook is a prompt to pull.
- **Pharma**: serviceability, catalogue search and prices, estimates, orders, prescriptions, cancellation; every order change goes to our pharmacy webhook. `GET /api/pharma/v1.0/catalog/getAlternatives` takes `drugMasterId` (and optionally `lsPharmacyId`) and returns same-salt brands and packs; nothing is substituted automatically; `notForSale: true` marks Schedule X and habit-forming drugs.

API docs (blocked from the cloud sessions so far; the hosts need adding under the environment's allowed domains):
- https://labstack.in/solutions/api-solutions
- Labs: https://integration.labstack.in/api-docs/labs
- Consultation: https://integration.labstack.in/api-docs/provider
- Pharma: https://integration.labstack.in/api-docs/pharma

## Keeping it in sync (for Claude sessions)

Artifacts cannot read each other's database, so the two trackers are kept in step by hand:

1. When work here moves a partnership task, `ArtifactData` `get` it from `tasks` for its `version`, then `update` with `if_version`: `{ status, updatedAt, completedAt }`, and add a `log` document `{ at, kind: "task", ref, title, from, to, by: "claude", note }`.
2. If that task lists `mainTaskIds`, update those tasks in the launch tracker (https://claude.ai/artifact/FWQhpm3j1KJWiNrCgpraHe, protocol in `docs/launch-tracker/README.md`), then copy their new status into this tracker's `linked/<id>` with a fresh `syncedAt`.
3. After reading LabStack's docs, fill `apis/<id>`: `endpoint` (method and path, like `POST /v1/orders`), `notes`, and `state: "documented"` (or `"gap"` when the capability is missing), and log it.
4. When a question is answered on a call, write `answer` and `answered: true` on `questions/<id>`.

Phase `currentPhase` lives on `meta/deal`; move it when a phase starts.

## Task ids

| id | phase | owner | priority | title | launch tracker |
|---|---|---|---|---|---|
| `pre-gateway` | p0 | Athar | P0 | Server-side partner gateway, so the app never calls LabStack directly | `int-lab-partner`, `int-services` |
| `pre-orders-table` | p0 | Athar | P0 | One partner_orders table for labs, consults and medicines | `int-server-bookings` |
| `pre-status-model` | p0 | Athar | P0 | Our canonical order status model | - |
| `pre-webhook-receiver` | p0 | Athar | P0 | Webhook receiver: verify, de-duplicate, then pull | `sec-lab-demo` |
| `pre-data-minimum` | p0 | Athar | P0 | Decide the minimum data each booking sends | - |
| `pre-flags` | p0 | Athar | P0 | Keep preview providers behind a switch; remove real brand names | `sec-listings`, `sec-sample-data` |
| `pre-results-ingest` | p0 | Suraj | P0 | Route partner lab results into memory | `ai-ocr-pipeline`, `ai-ocr-report` |
| `pre-rx-ingest` | p0 | Suraj | P1 | Route consult prescriptions into the medicine ledger | `ai-ocr-rx`, `ai-rx-score` |
| `pre-salt-sku` | p0 | Suraj | P1 | Brand to salt resolver doubles as the medicine matcher | `ai-brand-salt` |
| `pre-what-to-book` | p0 | Suraj | P1 | Longevity engine decides what to book | `ai-memory-tools` |
| `pre-questions` | p0 | Founder | P1 | Send Varun the question list before the deep dive | - |
| `acc-agreement` | p1 | Founder | P0 | Partnership agreement and data processing agreement | `sec-dpdp`, `pay-care` |
| `acc-commercials` | p1 | Founder | P0 | Commercial terms | `pay-markup`, `pay-care` |
| `acc-sandbox` | p1 | Labstack | P0 | Sandbox access and credentials | - |
| `acc-docs-review` | p1 | Athar | P0 | Read the three API docs and fill the inventory | - |
| `acc-webhooks` | p1 | Labstack | P0 | Agree webhook events, signing and retries | - |
| `acc-support` | p1 | Founder | P1 | Escalation contacts and SLAs | - |
| `lab-catalogue` | p2 | Athar | P0 | Sync the test catalogue, packages and prices | `int-lab-partner`, `pay-markup` |
| `lab-serviceability` | p2 | Athar | P0 | Pincode serviceability and live slots | - |
| `lab-order` | p2 | Athar | P0 | Create orders through the gateway | - |
| `lab-status` | p2 | Athar | P0 | Status from LabStack only | `sec-lab-demo` |
| `lab-reports` | p2 | Suraj | P0 | Reports land in the right member's records | `ai-ocr-pipeline` |
| `lab-reschedule` | p2 | Athar | P1 | Reschedule and cancel with LabStack's rules | - |
| `lab-phlebo` | p2 | Athar | P1 | Collector details in the booking card | - |
| `lab-enquiry` | p2 | Athar | P2 | Lab requests for anything not bookable online | - |
| `lab-camps` | p2 | Founder | P2 | Longevity camps for housing societies and offices | - |
| `lab-chat-card` | p2 | Athar | P1 | Chat booking card uses the live catalogue | - |
| `con-directory` | p3 | Athar | P0 | Replace sample doctors with LabStack's directory | `int-doctors`, `sec-sample-data` |
| `con-book` | p3 | Athar | P0 | Book, pay and confirm a consult | `int-server-bookings` |
| `con-video` | p3 | Athar | P0 | Join the video call | - |
| `con-instant` | p3 | Athar | P1 | Instant consult from chat | `int-doctors` |
| `con-preconsult` | p3 | Athar | P1 | Send the pre-consultation note with consent | - |
| `con-erx` | p3 | Suraj | P0 | E-prescription back into memory | `ai-rx-score` |
| `con-guidelines` | p3 | Founder | P0 | Telemedicine Practice Guidelines check | - |
| `ph-search` | p4 | Suraj | P1 | Medicine search by brand or salt | `ai-brand-salt` |
| `ph-rx-check` | p4 | Athar | P0 | Prescription upload and verification | - |
| `ph-order` | p4 | Athar | P0 | Cart, order, delivery tracking and cancellation | `int-services` |
| `ph-refill` | p4 | Athar | P1 | Refill reminder to one-tap reorder | `loop-meds` |
| `ph-generics` | p4 | Suraj | P1 | Generic options shown neutrally | - |
| `pay-collect` | p5 | Athar | P0 | Collect payment for partner orders | `pay-care`, `sec-payments-pci` |
| `pay-recon` | p5 | Athar | P0 | Daily reconciliation | - |
| `pay-refunds` | p5 | Athar | P1 | Refunds and cancellation fees | - |
| `pay-invoices` | p5 | Athar | P1 | GST invoices filed into records | - |
| `gl-uat` | p6 | Athar | P0 | End-to-end test in the sandbox | - |
| `gl-monitor` | p6 | Athar | P0 | Partner API monitoring and a safe fallback | - |
| `gl-support` | p6 | Founder | P0 | Support playbook | - |
| `gl-rollout` | p6 | Founder | P1 | Start in one or two cities with beta families | - |
| `gl-metrics` | p6 | Athar | P1 | Booking funnel and revenue metrics | - |
