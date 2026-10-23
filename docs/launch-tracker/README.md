# Launch tracker

The live tracker is **https://claude.ai/artifact/FWQhpm3j1KJWiNrCgpraHe** (private to the owner; share it from its Share menu).
It reads its tasks from the artifact's database, not from this folder. `tracker.html` is the page source and `seed.py` the audit that first filled it (commit db8cb79, 19 Oct 2026).

## Keeping it current (for Claude sessions)

When a change in this repo completes, starts or blocks a task below, update it in the tracker in the same session:

1. `ArtifactData` `get` on collection `tasks`, doc id from the table below, to read its `version`.
2. `ArtifactData` `update` with `if_version`: `{ status: "done" | "doing" | "blocked" | "todo", updatedAt, completedAt }` (completedAt only for done).
3. Add one `log` document: `{ at, taskId, title, from, to, by: "claude", note }`, where note names the commit.
4. New work the audit missed: `set` a new `tasks` document with the same fields (owner `athar` or `suraj`).

Never mark a task done that is only built in the web preview: device verification is part of done for app work.

## Task ids

Milestone `V2` holds ideas saved for after launch. The page shows them in their own group and leaves them out of the readiness numbers. Ideas from research go to a launch milestone only when they can ship before launch; the rest go to `V2` (see `docs/research/aq-ant-afu.md`).

| id | owner | priority | milestone | title |
|---|---|---|---|---|
| `ops-migrations` | Athar | P0 | M1 | Apply migrations 0031 to 0034 to production |
| `ops-push-webhook` | Athar | P0 | M1 | Wire the push sender so phones actually buzz |
| `ops-auth-config` | Athar | P0 | M1 | Put Supabase auth settings under version control |
| `ops-envs` | Athar | P1 | M1 | Separate staging and production |
| `ops-ci` | Athar | P1 | M1 | CI on every pull request |
| `ops-monitoring` | Athar | P0 | M2 | Crash and error reporting with health data scrubbed |
| `ops-backups` | Athar | P0 | M2 | Backups, point-in-time recovery and a restore drill |
| `ops-hosting-plans` | Athar | P0 | M3 | Move web hosting and Supabase off free plans before launch |
| `ops-rename` | Athar | P0 | M2 | Rename bundle ids from baymax before store listings |
| `sec-delete-auth` | Athar | P0 | M1 | Account deletion must remove the sign-in itself |
| `sec-demo-billing` | Athar | P0 | M2 | Remove the free demo upgrade before launch |
| `sec-lab-demo` | Athar | P0 | M2 | Stop lab bookings moving on the clock |
| `sec-listings` | Athar | P0 | M2 | Replace real lab brands that carry made-up prices |
| `sec-sample-data` | Athar | P0 | M2 | Keep sample doctors and sample reviews out of production |
| `sec-definer-review` | Athar | P0 | M2 | Review all 42 SECURITY DEFINER functions |
| `sec-offline-cache` | Athar | P1 | M2 | Encrypt the offline copy of records |
| `sec-dpdp` | Athar | P0 | M2 | DPDP readiness: owner, requests, legal text, breach plan |
| `sec-payments-pci` | Athar | P0 | M3 | Payments without touching card data |
| `sec-signed-urls` | Athar | P2 | M3 | Tighten signed URL lifetimes and caching |
| `sec-pentest` | Athar | P1 | M3 | External penetration test before public launch |
| `sec-photo-privacy` | Athar | P1 | M3 | Privacy blur before a photo is sent |
| `rl-chat-edge` | Athar | P0 | M1 | Rate-limit and meter the chat model call on the server |
| `rl-free-20` | Athar | P0 | M1 | Raise free chats from 5 to 20 a day |
| `rl-uploads` | Athar | P1 | M2 | Daily upload caps and storage quota per plan |
| `rl-auth` | Athar | P1 | M2 | Sign-up and sign-in abuse protection |
| `rl-rpc` | Athar | P1 | M2 | Throttle the heavy read RPCs |
| `pay-subscriptions` | Athar | P0 | M2 | Real subscriptions through App Store and Play billing |
| `pay-care` | Athar | P0 | M3 | Payments for lab tests and consults |
| `pay-markup` | Athar | P1 | M3 | Markup rules and a price breakdown |
| `int-lab-partner` | Athar | P0 | M3 | Lab partner integration end to end |
| `int-doctors` | Athar | P0 | M3 | Real doctor consults and video |
| `int-server-bookings` | Athar | P0 | M2 | Move appointments and service requests to the server |
| `int-services` | Athar | P1 | M3 | Services marketplace provider |
| `int-share-target` | Athar | P0 | M2 | WhatsApp and Files share-sheet target into Scan |
| `int-wearables` | Athar | P1 | M3 | Apple Health and Health Connect |
| `int-messaging` | Athar | P2 | M3 | WhatsApp and SMS for confirmations and caregiver alerts |
| `loop-meds` | Athar | P0 | M2 | Your medicines: doses, Taken, refills |
| `loop-notifs` | Athar | P0 | M2 | Six new notification kinds |
| `loop-cron` | Athar | P0 | M2 | Scheduled jobs for the daily loop |
| `loop-caregiver` | Athar | P0 | M3 | Caregiver view and parent alerts |
| `loop-scan-ux` | Athar | P0 | M2 | Scan: Report or Prescription, whose is it, confirm step |
| `loop-reading-v2` | Athar | P0 | M3 | Report reading v2 and prescription scorecard screens |
| `loop-chat-chips` | Athar | P1 | M3 | Chat: context chips and one next-step chip |
| `loop-onboarding` | Athar | P1 | M3 | Onboarding goals and permission asks |
| `loop-goal-cards` | Athar | P1 | M2 | Goal cards: pick a goal, get a check-in plan |
| `loop-consult-room` | Athar | P1 | M3 | Staged symptom check in chat |
| `loop-challenges` | Athar | P2 | M3 | Partner check-in challenges |
| `perf-home-rpc` | Athar | P1 | M2 | One call for Home on Today |
| `perf-bundle` | Athar | P1 | M2 | Stop shipping the whole memory to the phone |
| `perf-indexes` | Athar | P1 | M2 | Index review on production-sized data |
| `perf-images` | Athar | P2 | M3 | Light previews for report images |
| `perf-loadtest` | Athar | P1 | M3 | Load test with 10,000 simulated families |
| `cost-supabase` | Athar | P2 | M3 | Supabase plan sizing and storage hygiene |
| `cost-routing` | Athar | P1 | M2 | Send free-tier chats to the cheaper path |
| `qa-device` | Athar | P0 | M3 | On-device QA on iPhone and a low-end Android |
| `qa-e2e` | Athar | P1 | M3 | End-to-end tests for the main journey |
| `qa-store` | Athar | P0 | M3 | Store readiness |
| `qa-analytics` | Athar | P1 | M3 | Privacy-safe product analytics |
| `content-clinical` | Athar | P0 | M3 | Clinician sign-off on daily plan content and articles |
| `ai-ocr-report` | Suraj | P0 | M2 | Report reader: fine-tuned OCR and extraction |
| `ai-ocr-rx` | Suraj | P0 | M2 | Prescription reader, handwriting included |
| `ai-brand-salt` | Suraj | P0 | M2 | Brand to salt resolver |
| `ai-ocr-pipeline` | Suraj | P0 | M2 | Asynchronous extraction pipeline |
| `ai-ocr-eval` | Suraj | P0 | M2 | Reader evaluation set and review queue |
| `ai-memory-server` | Suraj | P0 | M2 | Build the memory context on the server |
| `ai-memory-tools` | Suraj | P1 | M3 | Memory as tools, with citations per claim |
| `ai-memory-normalise` | Suraj | P1 | M2 | Normalise and de-duplicate entities across reports |
| `ai-model-ft` | Suraj | P0 | M2 | Fine-tune the 15 to 22B India health model |
| `ai-serving` | Suraj | P0 | M2 | Inference serving in India |
| `ai-routing` | Suraj | P1 | M3 | Model routing and token budgets |
| `ai-rx-score` | Suraj | P0 | M3 | Prescription scorecard engine |
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
