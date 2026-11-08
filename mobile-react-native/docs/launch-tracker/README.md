# Launch tracker

The live tracker is **https://claude.ai/artifact/FWQhpm3j1KJWiNrCgpraHe** (private to the owner; share it from its Share menu).
It reads its tasks from the artifact's database, not from this folder. `tracker.html` is the page source and `seed.py` the audit that first filled it (commit db8cb79, 19 Oct 2026).

## Keeping it current (for Claude sessions)

When a change in this repo completes, starts or blocks a task below, update it in the tracker in the same session:

1. `ArtifactData` `get` on collection `tasks`, doc id from the table below, to read its `version`.
2. `ArtifactData` `update` with `if_version`: `{ status: "done" | "doing" | "blocked" | "dependencies" | "future" | "v2" | "todo", updatedAt, completedAt }` (completedAt only for done). `dependencies` is waiting on another task or partner and still counts as launch work. `future` (Future scope) and `v2` park a task: it stays on the board and is left out of the readiness numbers.
3. Add one `log` document: `{ at, taskId, title, from, to, by: "claude", note }`, where note names the commit.
4. New work the audit missed: `set` a new `tasks` document with the same fields (owner `athar`, `archit` or `suraj`; optional `with`, a list of the others who work on it).
5. When a feature ships or changes state, keep **What's built** current: `set` or `update` its document in the `features` collection. The fields are `{ id, group, title, what, state, where, shipped, owner, next, order }`.
   - `group` is one of `accounts`, `records`, `ai`, `loop`, `care`, `design`, `platform` or `gtm`.
   - `state` is `live`, `built` (built, waiting for a phone check or a deploy), `standin` (works on sample data or a mock) or `partial`.
   - `next` lists the tracker task ids that carry the feature on. A `built` feature shows as Live by itself once all of its `next` tasks are done.
   - `docs/launch-tracker/features.json` is the copy in the repo. Change both together.

The **Completed in this tracker** list under What's built needs no upkeep: any task marked done appears there, newest first.

Never mark a task done that is only built in the web preview: device verification is part of done for app work.

## Who owns what (re-audit, 24 Oct 2026)

- **Athar**: the app, product and design. UI batches, the daily loop screens, store readiness, device QA, clinical content, hosting and naming decisions.
- **Archit** (joined 24 Oct): backend, security, sign-in (Google and Apple), database, scale, the app to AI API layer, and the LabStack marketplace end to end. His first task is `onb-archit`, then `ops-auth-config` and `ops-envs`.
- **Suraj**: the AI models and pipelines. Readers, memory, the model, serving, safety and evals. Archit sits alongside on the APIs and jobs those depend on.

Tasks keep one owner; `with` lists the others who work on it, and the page shows it under "Working with".

## Task ids

Milestone `V2` holds ideas saved for after launch. The page shows them in their own group and leaves them out of the readiness numbers. Ideas from research go to a launch milestone only when they can ship before launch; the rest go to `V2` (see `docs/research/aq-ant-afu.md`).

| id | owner | priority | milestone | title |
|---|---|---|---|---|
| `ops-migrations` | Athar | P0 | M1 | Apply migrations 0031 to 0034 to production |
| `ops-push-webhook` | Archit | P0 | M1 | Wire the push sender so phones actually buzz |
| `ops-auth-config` | Archit | P0 | M1 | Put Supabase auth settings under version control |
| `ops-envs` | Archit | P1 | M1 | Separate staging and production |
| `ops-ci` | Archit | P1 | M1 | CI on every pull request |
| `ops-monitoring` | Archit | P0 | M2 | Crash and error reporting with health data scrubbed |
| `ops-backups` | Archit | P0 | M2 | Backups, point-in-time recovery and a restore drill |
| `ops-hosting-plans` | Athar | P0 | M3 | Move web hosting and Supabase off free plans before launch |
| `ops-rename` | Athar | P0 | M2 | Rename bundle ids from baymax before store listings |
| `sec-delete-auth` | Athar | P0 | M1 | Account deletion must remove the sign-in itself |
| `sec-demo-billing` | Archit | P0 | M2 | Remove the free demo upgrade before launch |
| `sec-lab-demo` | Archit | P0 | M2 | Stop lab bookings moving on the clock |
| `sec-listings` | Archit | P0 | M2 | Replace real lab brands that carry made-up prices |
| `sec-sample-data` | Archit | P0 | M2 | Keep sample doctors and sample reviews out of production |
| `sec-definer-review` | Archit | P0 | M2 | Review all 42 SECURITY DEFINER functions |
| `sec-offline-cache` | Archit | P1 | M2 | Encrypt the offline copy of records |
| `sec-dpdp` | Athar | P0 | M2 | DPDP readiness: owner, requests, legal text, breach plan |
| `sec-payments-pci` | Archit | P0 | M3 | Payments without touching card data |
| `sec-signed-urls` | Archit | P2 | M3 | Tighten signed URL lifetimes and caching |
| `sec-pentest` | Archit | P1 | M3 | External penetration test before public launch |
| `sec-photo-privacy` | Athar | P1 | M3 | Privacy blur before a photo is sent |
| `rl-chat-edge` | Athar | P0 | M1 | Rate-limit and meter the chat model call on the server |
| `rl-free-20` | Athar | P0 | M1 | Raise free chats from 5 to 20 a day |
| `rl-uploads` | Archit | P1 | M2 | Daily upload caps and storage quota per plan |
| `rl-auth` | Archit | P1 | M2 | Sign-up and sign-in abuse protection |
| `rl-rpc` | Archit | P1 | M2 | Throttle the heavy read RPCs |
| `pay-subscriptions` | Archit | P0 | M2 | Real subscriptions through App Store and Play billing |
| `pay-care` | Archit | P0 | M3 | Payments for lab tests and consults |
| `pay-markup` | Archit | P1 | M3 | Markup rules and a price breakdown |
| `int-lab-partner` | Archit | P0 | M3 | Lab partner integration end to end |
| `int-doctors` | Archit | P0 | M3 | Real doctor consults and video |
| `int-server-bookings` | Archit | P0 | M2 | Move appointments and service requests to the server |
| `int-services` | Archit | P1 | M3 | Services marketplace provider |
| `int-ola-maps` | Athar | P1 | M3 | Ola Maps API key and integration |
| `int-fitness` | Archit | P0 | M3 | Fitness partner master API: studios, sessions, booking, check-in, payouts |
| `int-share-target` | Athar | P0 | M2 | WhatsApp and Files share-sheet target into Scan |
| `int-wearables` | Athar | P1 | M3 | Apple Health and Health Connect |
| `int-messaging` | Archit | P2 | M3 | WhatsApp and SMS for confirmations and caregiver alerts |
| `loop-meds` | Athar | P0 | M2 | Your medicines: doses, Taken, refills |
| `loop-nudges` | Athar | P0 | M2 | Local nudges for doses, habits and bookings |
| `loop-notifs` | Archit | P0 | M2 | Six new notification kinds |
| `loop-cron` | Archit | P0 | M2 | Scheduled jobs for the daily loop |
| `loop-caregiver` | Athar | P0 | M3 | Caregiver view and parent alerts |
| `loop-fitness` | Athar | P0 | M3 | Fitness classes: discover, match, book, remind |
| `loc-live` | Athar | P0 | M3 | Live location, saved per member, nearby across services |
| `loop-scan-ux` | Athar | P0 | M2 | Scan: Report or Prescription, whose is it, confirm step |
| `loop-reading-v2` | Athar | P0 | M3 | Report reading v2 and prescription scorecard screens |
| `loop-chat-chips` | Athar | P1 | M3 | Chat: context chips and one next-step chip |
| `loop-onboarding` | Athar | P1 | M3 | Onboarding goals and permission asks |
| `loop-goal-cards` | Athar | P1 | M2 | Goal cards: pick a goal, get a check-in plan |
| `loop-consult-room` | Athar | P1 | M3 | Staged symptom check in chat |
| `loop-challenges` | Athar | P2 | M3 | Partner check-in challenges |
| `perf-home-rpc` | Archit | P1 | M2 | One call for Home on Today |
| `perf-bundle` | Archit | P1 | M2 | Stop shipping the whole memory to the phone |
| `perf-indexes` | Archit | P1 | M2 | Index review on production-sized data |
| `perf-images` | Archit | P2 | M3 | Light previews for report images |
| `perf-loadtest` | Archit | P1 | M3 | Load test with 10,000 simulated families |
| `cost-supabase` | Archit | P2 | M3 | Supabase plan sizing and storage hygiene |
| `cost-routing` | Archit | P1 | M2 | Send free-tier chats to the cheaper path |
| `qa-device` | Athar | P0 | M3 | On-device QA on iPhone and a low-end Android |
| `qa-e2e` | Archit | P1 | M3 | End-to-end tests for the main journey |
| `qa-store` | Athar | P0 | M3 | Store readiness |
| `qa-analytics` | Archit | P1 | M3 | Privacy-safe product analytics |
| `content-clinical` | Athar | P0 | M3 | Clinician sign-off on daily plan content and articles |
| `onb-archit` | Archit | P0 | M1 | Archit's access and first week |
| `auth-social` | Archit | P0 | M2 | Sign in with Google and Apple |
| `auth-sessions` | Archit | P1 | M2 | Sessions, devices and account recovery |
| `sec-secrets` | Archit | P0 | M2 | Secrets inventory and rotation |
| `be-queue` | Archit | P0 | M2 | Background jobs and queues |
| `be-edge-standards` | Archit | P1 | M2 | Edge Function standards |
| `db-retention` | Archit | P1 | M3 | Data retention and purge jobs |
| `perf-scale-plan` | Archit | P1 | M3 | Scale plan for 100,000 families |
| `ai-api-contract` | Archit | P0 | M2 | One versioned contract between the app and the AI |
| `ai-chat-streaming` | Archit | P1 | M2 | Stream chat answers end to end |
| `ai-ocr-report` | Suraj | P0 | M2 | Report reader: fine-tuned OCR and extraction |
| `ai-ocr-rx` | Suraj | P0 | M2 | Prescription reader, handwriting included |
| `ai-brand-salt` | Suraj | P0 | M2 | Brand to salt resolver |
| `ai-ocr-pipeline` | Suraj | P0 | M2 | Asynchronous extraction pipeline |
| `ai-ocr-eval` | Suraj | P0 | M2 | Reader evaluation set and review queue |
| `ai-memory-server` | Suraj | P0 | M2 | Build the memory context on the server |
| `ai-memory-tools` | Archit | P1 | M3 | Memory as tools, with citations per claim |
| `ai-memory-normalise` | Suraj | P1 | M2 | Normalise and de-duplicate entities across reports |
| `ai-model-ft` | Suraj | P0 | M2 | Fine-tune the 15 to 22B India health model |
| `ai-serving` | Suraj | P0 | M2 | Inference serving in India |
| `ai-routing` | Suraj | P1 | M3 | Model routing and token budgets |
| `ai-rx-score` | Suraj | P0 | M3 | Prescription scorecard engine |
| `profile-insurance` | Athar | P1 | M3 | Insurance: family policies and cover in chat |
| `ai-insurance-read` | Suraj | P2 | M3 | Read insurance policies into fields |
| `partner-insurance-feed` | Archit | P3 | M4 | Fetch existing insurance from a partner |
| `ai-meal-vision` | Suraj | P1 | M3 | Read meal photos |
| `ai-med-box` | Suraj | P1 | M3 | Medicine box photo to the medicine list |
| `ai-moe-eval` | Suraj | P1 | M2 | Benchmark an open medical MoE against our model plan |
| `ai-guardrails` | Suraj | P0 | M2 | Output guard on every answer |
| `ai-evals` | Suraj | P0 | M2 | Clinical eval harness and release gate |
| `ai-injection` | Suraj | P0 | M2 | Prompt-injection defence |
| `ai-data-governance` | Suraj | P0 | M2 | Training data governance |
| `ai-clinical-signoff` | Suraj | P0 | M2 | Clinical sign-off on thresholds, hard stops and symptoms |
| `ai-cost-model` | Suraj | P1 | M2 | Cost per chat and per page read |
| `v2-doctor-twins` | Athar | P2 | V2 | Doctor AI twins and a doctor-side app |
| `v2-elder-mode` | Athar | P2 | V2 | Elder mode and Indian languages |
| `v2-insurance-pay` | Athar | P2 | V2 | Pay and claim with insurance and ABHA |
| `v2-proof-counters` | Athar | P2 | V2 | Public proof counters |
| `done-rls` | Athar | P0 | shipped | Row-level security on all 32 tables |
| `done-consent` | Athar | P0 | shipped | Consent ledger, re-consent gate and privacy settings |
| `done-family` | Athar | P0 | shipped | Family members, plans and switching |
| `done-memory` | Athar | P0 | shipped | On-device memory layer and safety router |
| `done-records` | Athar | P0 | shipped | Records: 11 types, detail pages, move and delete |
| `done-today` | Athar | P0 | shipped | Home stages and Today |
| `done-plan` | Athar | P0 | shipped | Today's action plan across five pillars |
| `done-inbox` | Athar | P0 | shipped | Notification inbox and on-phone reminders |
| `done-chat-relay` | Athar | P0 | shipped | Chat relay ready for Suraj's model |
