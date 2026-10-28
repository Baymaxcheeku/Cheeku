# Cheeku AI launch readiness: audit and 8-week plan

2026-10-09 · Athar Ali

## Summary

Cheeku AI can be in both stores by Wednesday 9 December, if four decisions land by 16 October: the final name, the legal entity and grievance officer, the OCR and model vendors, and developer account enrollment. The codebase is in better shape than most at this stage. Data isolation, consent and plan limits are enforced in the database, and 352 tests pass. But 16 launch blockers remain, and they cluster in five places:

1. **The AI is not real yet.** Document reading and chat answers both run on stand-ins (A1, A2).
2. **The edges are open.** The chat function takes the public key, there are no rate limits, email confirmation is off, and old credentials were never rotated (S1 to S4).
3. **Deletion is incomplete.** "Delete my account" leaves the login behind, which both stores reject (S5, ST3).
4. **No production setup.** There's one shared database with no backups plan and no crash reporting (B1, B2).
5. **Identity and paperwork.** The bundle ID still says Baymax, the legal entity is a placeholder, and store disclosures, a public policy URL and developer accounts are not started (ST1, ST4, ST5, P1, P3).

The biggest schedule risk is week 3: connecting real OCR and the model, then proving them on 50 real reports and a 200-question evaluation set. If that slips, move the launch, not the evaluation bar.

How to use this doc: each finding below has an ID (S for security, P privacy, B backend, A AI, ST store, Q quality). The 8-week checklist refers back to those IDs, and you tick items off as they're done.

## What ships at launch

The app has 60 screens built, but four of the features people will pay for still run on stand-ins. The two-month plan ships the core (records, memory, chat, family, consent) for real and labels anything with a stand-in behind it as "coming soon" rather than shipping fake bookings.

| Area | State in the code today | Launch call |
|---|---|---|
| Sign-up, sign-in, onboarding, consent | Real (Supabase Auth, migrations 0031 and 0032) | Ship |
| Records: upload, list, detail, health file | Real storage and database; **extraction is a mock** keyed on the file name (src/lib/ai/mock/extract.ts) | Ship only with real OCR |
| Ask Cheeku chat and memory layer | Real pipeline; **answers come from ****mockModel** unless EXPO_PUBLIC_CHAT_MODEL=edge and the cheeku-chat function is deployed | Ship only with the real model behind the safety gate |
| Family profiles, seats, plan scoping | Real, enforced by database triggers | Ship |
| Subscriptions | **Demo only**: activate_tier_demo grants a paid tier for free | Ship with store billing (App Store and Play) or launch free |
| Lab test booking | Real tables (migration 0027) but no partner API connected | Coming soon, or ship with one live partner |
| Doctor consults, appointments | **Sample doctors**; appointments kept only on the phone | Coming soon |
| Home services (nursing, ambulance and others) | Preview provider that "answers instantly and books nothing" | Coming soon |
| Push notifications | Local reminders work; remote push written but not deployed | Ship |
| App lock, offline reading, export, delete | Real | Ship |
| Product checker | Five canned scenarios (src/lib/ai/mock/scenarios.ts) | Remove from v1 |
| Knowledge articles | Real; nine need a clinician's review | Ship after review |

The legacy Next.js web app in the repo root is not a target (decided 2026-08-09) and is out of scope for this audit except where it shares the database.

## Security

The data model is well defended: every table has row-level security, all 30 privileged database functions either check the caller or are closed to the public, documents sit in a private 10 MB bucket behind 60-second signed links, and no secret key ships in the app. The gaps are at the edges: the AI endpoint, rate limits, auth settings and account deletion.

| # | Finding | Evidence | Severity |
|---|---|---|---|
| S1 | The chat function accepts any valid token, and the app's public key is one. Anyone can call the AI without signing in, outside the chat quota, with an unbounded memory payload. | supabase/functions/cheeku-chat/index.ts checks only question length; no getUser, no quota, no rate limit | Blocker |
| S2 | No rate limiting anywhere: sign-in, sign-up, password reset, uploads, chat, privacy requests. | SECURITY.md known gaps; no limiter in code | Blocker |
| S3 | Email confirmation is off and the server-side minimum password is 6, so anyone can register an address they don't own. | SECURITY.md known gaps; Supabase dashboard settings | Blocker |
| S4 | The service key and database password were pasted into a chat transcript during setup and never rotated. | SECURITY.md known gaps | Blocker |
| S5 | "Delete my account" removes data but never deletes the login (auth.users), and runs as 8 separate client calls that can stop half way. Both stores require the account itself to go. | src/lib/account/actions.ts, deleteAccountData | Blocker |
| S6 | Demo functions are live: activate_tier_demo grants paid plans for free (behind a flag) and advance_lab_booking_demo moves bookings on. | Migrations 0012 and 0027 | High |
| S7 | Android backups are on by default, so the offline copy of records goes into Google backups. | app.json has no android.allowBackup: false | High |
| S8 | The deep-link scheme is still baymax and there are no universal links or app links, so any app can claim the scheme. | app.json scheme, no associatedDomains | Medium |
| S9 | The database policy test suite is red (14 failures), so it can't catch a real regression. The failures are intentional catalog reads and app_flags, not leaks. | src/lib/db/rls.test.ts (repo root) | Medium |
| S10 | No record of who opened which health record, and no stated rule for who on the team can use the Supabase dashboard. | SECURITY.md known gaps | Medium |
| S11 | Dependency audit: high-severity advisories in @xmldom/xmldom and others, all pulled in by build-time Expo tooling rather than app runtime code. | npm audit --omit=dev | Low |

Already right and worth keeping: object keys are generated as <user_id>/<profile_id>/<uuid>, plan limits and chat quotas are database triggers rather than app checks, photo location data is stripped on the phone, and the only logging in app code is one console.warn of an error code (app/profile.tsx:245).

## Privacy and compliance

The consent machinery is built and tested (migrations 0031 and 0032, the consent sheet, Privacy & consent, Storage & cache, export, withdrawal). What is missing is the company and people behind it: the legal entity, a grievance officer who answers, a lawyer's read, the store disclosures, and a clinical and regulatory position.

| # | Finding | Evidence | Severity |
|---|---|---|---|
| P1 | Company name, address, grievance officer and contact emails are placeholders, and every legal document shows a draft banner. The four texts have not had a lawyer's read. | src/lib/legal/entity.ts | Blocker |
| P2 | Privacy requests land in privacy_requests and nobody is told. There is no breach response plan, although India's DPDP Rules expect the Data Protection Board and affected users to be told promptly. | Migration 0031; no admin view or alert | Blocker |
| P3 | Store disclosures are not prepared: Apple privacy labels and privacy manifest, Google Play Data safety form, and Play's health apps declaration. | Not in repo | Blocker |
| P4 | The vendor list in the Privacy Policy must match real processors once chosen: Supabase, Expo push, the model host, the OCR provider, billing. Where data is stored (Supabase region) is not recorded anywhere. | documents.ts processors section | High |
| P5 | No retention rule. Data stays until the person deletes it. DPDP expects erasure once the purpose is served. | PRIVACY_NOTES.md known gaps | High |
| P6 | Children's records are added by a parent. DPDP has specific rules for children's data (parental consent, no tracking or targeted ads). The app needs a written position, and offers and research must exclude child profiles. | Family profiles, optional purposes | High |
| P7 | The triage tiers ("go now", "contact today"), hard-stop rules and clock-keyed thresholds need a clinician's sign-off, and the company needs a regulatory opinion on whether any feature counts as software as a medical device in India. | src/lib/memory/thresholds.ts, ladder.ts, symptoms.ts; PLAN.md Open | High |
| P8 | Bulk upload sends the original photo, with location data, if stripping fails, and says nothing. The policy says location is always removed. | src/lib/records/bulk-upload.ts | Medium |
| P9 | Nine knowledge articles carry a reviewed_on date that is a source check, not a medical review. | Migrations 0017 and 0021 | Medium |

Not legal advice: P6 and P7 need a lawyer and a regulatory consultant, and this plan gives them a slot in week 2.

## Backend robustness and data integrity

The schema is the strongest part of the codebase: 32 migrations, a runner that applies each file in its own transaction (scripts/migrate.ts), and the rules that matter (plan limits, quotas, consent) enforced by triggers. What's missing is the production setup around it: a separate production database, backups, crash visibility, and a repeatable deploy.

| # | Finding | Evidence | Severity |
|---|---|---|---|
| B1 | There is one Supabase project, used for development and demo data (including a duplicate demo profile). Launch needs a separate production project on a paid plan with point-in-time recovery and a restore you have actually tested. | SHIPPING.md Phase 0; PLAN.md Open | Blocker |
| B2 | No error boundary anywhere in the app, and no crash or error reporting. A crash in any screen shows a blank screen and nobody finds out. | No ErrorBoundary export in app/; no Sentry or equivalent in package.json | Blocker |
| B3 | Edge functions, their secrets and the push database webhook are deployed by hand, with steps only in code comments. | supabase/functions/*/index.ts headers | High |
| B4 | Migrations 0031 and 0032 are not applied anywhere yet. No rehearsal of the full chain on a copy of real data, and no written rule that applied migrations are never edited. | PLAN.md Open | High |
| B5 | The Supabase client has no request timeout, so a request on a dying network can hang forever. This already caused the endless photo-save spinner fixed on 2026-09-30. | src/lib/supabase/client.ts | High |
| B6 | The records list and the chat memory bundle load every document and value for a profile with no limit. Fine at 50 records, slow and costly at 500. | src/lib/records/queries.ts:134; memory_bundle in migration 0030 | Medium |
| B7 | Appointments and service requests are stored only on the phone, so they're lost on reinstall or a new phone. Acceptable while those features say "coming soon"; not when real. | src/lib/booking/appointments.ts | Medium |
| B8 | scripts/migrate.ts --reset drops only the first 9 tables. It is guarded to empty databases, but it no longer matches the schema. | scripts/migrate.ts APP_TABLES | Low |

## Scaling and performance

Nothing in the architecture stops 1M users: reads are row-scoped and indexed, the screens were cut from 160 to 58 database calls on 2026-10-06, and there are no servers of our own to scale. The real limits are, in order: the AI model's cost and capacity, storage growth, open realtime connections, and one push call per notification.

| Stage | What strains first | What to do before reaching it |
|---|---|---|
| Launch to 10k users | Model latency and cost per chat; cold edge functions; a mid-size Supabase compute tier | Per-user rate limits (S1, S2); a cost alert on the model host; load-test chat at 50 concurrent turns; Supabase Pro with point-in-time recovery |
| 10k to 100k | Storage, at roughly 30 MB per user (assumes 20 photos at 1.5 MB each, so about 3 TB); realtime connections, since every open app holds one inbox channel; the records list and memory bundle growing per profile | Thumbnails and a lower re-encode size for photos; page the records list and window the memory bundle (B6); raise the realtime connection limit, or poll the inbox while the app is in the background |
| 100k to 1M | Model hosting throughput; Postgres write volume on messages and notifications; broadcast pushes (one function call per inbox row) | Autoscaling model endpoint with a queue and a graceful "busy" reply; partition or archive old messages and notifications; batch push sends (Expo accepts 100 per request); a read replica for heavy reads |

Two numbers to get before launch, because the plan's pricing depends on them: the model's cost per chat turn, and the OCR cost per page. Neither exists yet, because both features still run on stand-ins.

## AI, OCR and clinical safety

The safety design is sound: an emergency check runs on the phone before any network call, in English and Hinglish (254-line lexicon, 30 safety tests), and the app takes the higher of the model's caution tier and its own floor, so a model can make an answer more careful but never less. The two engines it wraps, the chat model and the document reader, are not connected yet, and launch depends on both.

| # | Finding | Evidence | Severity |
|---|---|---|---|
| A1 | Document reading is a mock that returns canned values keyed on the file name. Real OCR and extraction for Indian lab reports, prescriptions and discharge summaries is the largest single piece of launch work. | src/lib/ai/mock/extract.ts, used by src/lib/records/upload.ts:129 | Blocker |
| A2 | The chat model is not live. The app defaults to the stand-in unless EXPO_PUBLIC_CHAT_MODEL=edge, and the fine-tuned model behind CHEEKU_MODEL_URL is not deployed. | src/lib/memory/models.ts | Blocker |
| A3 | When the real model fails, the app silently answers with the stand-in. People could get a scripted answer without knowing. It should say it is offline or degraded instead. | edgeModel() fallback in models.ts | High |
| A4 | No evaluation set for the model: no fixed set of questions (including emergencies, pregnancy, children and medicines) scored before each model release. | No eval harness in repo | High |
| A5 | The full health memory goes to the model host on every turn. The host needs a data processing agreement, an India-compatible region, no training on user data, and no logging of request bodies. | cheeku-chat forwards body whole | High |
| A6 | Clinical sign-off is outstanding for the thresholds, hard-stop rules, symptom models and nine articles (see P7, P9). | PLAN.md Open | High |
| A7 | Extracted values need a confidence rule people can see: low-confidence readings go to review instead of being filed as fact. The routing exists (routeFor) but is tuned for the mock. | routeFor in extract.ts | Medium |

## App Store and Play Store readiness

The app has the native features that keep it clear of Apple's "website in a shell" rejection: app lock, push, offline reading, camera capture. The store blockers are identity, payments, account deletion and paperwork, and two of them have long lead times that start this week: developer account verification and the bundle ID.

| # | Finding | Evidence | Severity |
|---|---|---|---|
| ST1 | The bundle ID and package are com.baymax.app, the slug and scheme are baymax. A bundle ID can't be changed after the store records exist, and "Baymax" is a Disney character. | app.json | Blocker |
| ST2 | Paid plans need Apple in-app purchase and Google Play Billing (Apple guideline 3.1.1). Today the paywall calls the demo grant. | src/lib/billing/subscribe.ts; SHIPPING.md Blocker 2 | Blocker if charging at launch |
| ST3 | Account deletion must delete the account itself (Apple 5.1.1(v)), and Play also wants a web page where people can ask for deletion without the app. | S5; no website | Blocker |
| ST4 | Both stores need a public privacy policy URL and a support URL. The policy only exists inside the app. | src/lib/legal/documents.ts | Blocker |
| ST5 | Developer accounts: Apple and Google organization accounts need a D-U-N-S number, which can take weeks. A new Play account registered as a person must also run a closed test with 12 testers for 14 days before production. | Not started | Blocker (lead time) |
| ST6 | Push isn't wired for builds: no EAS project ID in app.json, no APNs key or FCM credentials, function not deployed. | PLAN.md Phase 5 | High |
| ST7 | The sign-in screen shows Google, Apple and Phone buttons marked "Soon". Reviewers flag dead buttons, and if Google sign-in ships, Apple requires Sign in with Apple too (guideline 4.8). | app/sign-in.tsx:342 | High |
| ST8 | Health app review: a clear "not medical advice" statement, sources shown for health content (Apple 1.4.1), a demo account with sample records for the reviewer, and review notes explaining the triage tiers. | Not prepared | High |
| ST9 | Store paperwork: Apple privacy labels and privacy manifest, export compliance flag (ITSAppUsesNonExemptEncryption), age rating questionnaire, Play Data safety form, Play health apps declaration, target API level check. | Not in app.json | High |
| ST10 | Store listing assets: iPhone screenshots, Play feature graphic, short and long descriptions, keywords, preview video (the demo videos can be cut down). | Not prepared | Medium |
| ST11 | Photos come from the camera or gallery. There is no native document scanner (edge detection, flattening), which PLAN.md Phase 5 lists and which makes OCR far more accurate. | No scanner module in package.json | Medium |

## Quality, testing, observability and release

The logic is well tested (352 unit tests, typecheck and lint clean), but nothing tests the app as a person uses it, nothing runs automatically on a push, and there's no way to see crashes or ship a hotfix without a store review.

| # | Finding | Evidence | Severity |
|---|---|---|---|
| Q1 | No CI. Tests, typecheck and lint run only when someone remembers. | No .github/workflows | High |
| Q2 | No end-to-end tests of the core journeys (sign up, consent, upload, ask, family, delete). | No Maestro, Detox or Playwright in the mobile app | High |
| Q3 | No crash reporting or performance monitoring (see B2). | package.json | Blocker |
| Q4 | No over-the-air update path. eas.json names update channels, but expo-updates isn't installed, so every fix needs a full store review. | package.json, eas.json | High |
| Q5 | No device test matrix. Most users in India will be on mid and low-end Android phones, and the app runs Lottie animations, Reanimated and glass effects on almost every screen. | PROGRESS.md: several bugs only showed on a real phone | High |
| Q6 | No product analytics at all (a deliberate privacy choice), so you won't see where people drop out of sign-up or upload. A small, health-data-free event set would answer that without breaking the promise. | PRIVACY_NOTES.md "No third parties" | Medium (decision) |
| Q7 | Accessibility is partial: 101 of 123 screen and component files set accessibility roles or labels. No screen-reader or large-text pass has been done. | Grep of app/ and src/ | Medium |
| Q8 | No support tooling: help tickets land in support_tickets and privacy requests in privacy_requests, with no inbox, alert or owner for either. | Migrations 0010 and 0031 | Medium |

## The 8-week checklist

Work top to bottom; each item names the finding it closes and what "done" means. Week 1 is front-loaded with the items that have outside lead times (accounts, legal, vendors), so they run in the background while engineering works through weeks 2 to 5.

_[chart: launch plan · 7 workstreams, submission and launch dates]_

The AI engines get one week on paper; it's the item most likely to need a second, which would push submission into week 8 and launch to mid-December.

### Week 1 · 12 to 16 Oct · Foundations and long-lead items

- [ ] **Pick the final name and bundle ID**, then change name, slug, scheme, bundleIdentifier and package in app.json (ST1). Done when a build installs under the new ID.
- [ ] **Start Apple and Google organization enrollment**, including the D-U-N-S number (ST5). Done when both requests are submitted.
- [ ] **Confirm the legal entity and name a grievance officer**, then fill src/lib/legal/entity.ts (P1). Done when the draft banner disappears.
- [ ] **Create the production Supabase project** on a paid plan, Mumbai region, point-in-time recovery on (B1). Done when it exists, empty, with backups confirmed.
- [ ] **Rotate the service key and database password** on the current project (S4). Done when the old values are rejected.
- [ ] **Choose the OCR provider and the model host**, and request their data processing agreements (A1, A2, A5). Done when both are chosen in writing.
- [ ] **Set up CI** on GitHub Actions: typecheck, lint, unit tests, and the database policy test with an explicit allowlist for catalog tables (Q1, S9). Done when a pull request shows a green check.
- [ ] **Add crash reporting and a root error boundary**, with health data scrubbed from reports (B2, Q3). Done when a test crash shows up in the dashboard with no record content in it.
- [ ] **Install ****expo-updates** and wire the channels already in eas.json (Q4). Done when a preview build picks up an update without reinstalling.

### Week 2 · 19 to 23 Oct · Security hardening

- [ ] **Lock down the chat function**: verify the signed-in user, enforce the plan quota on the server, rate-limit per user, cap the request body (S1). Done when a call with only the public key gets 401.
- [ ] **Add rate limits**: Supabase Auth limits for sign-in, sign-up and reset; a per-user limit for uploads, privacy requests and functions (S2). Done when the 21st rapid sign-in attempt is refused.
- [ ] **Auth settings**: email confirmation on with real SMTP, minimum password 10, leaked-password check on (S3). Done when a new sign-up must confirm by email.
- [ ] **Server-side account deletion**: one function that removes files, rows and the login together (S5, ST3). Done when a deleted account cannot sign in again and leaves no files.
- [ ] **Pre-launch cleanup migration**: drop activate_tier_demo, advance_lab_booking_demo and the demo flag (S6). Done when calling either returns "function not found".
- [ ] **Turn off Android backup** (android.allowBackup: false) (S7). Done when the setting is in the built manifest.
- [ ] **Add a request timeout** to the Supabase client (B5). Done when a request on a dead network ends with a message within 20 seconds.
- [ ] **Brief a lawyer** on the four documents, children's data and the medical-device question (P1, P6, P7). Done when the engagement is signed.
- [ ] **Brief a clinician** on thresholds, hard-stop rules, symptom models and the nine articles (A6, P9). Done when the review is booked.

### Week 3 · 26 to 30 Oct · The AI engines

- [ ] **Replace the mock extractor** with the chosen OCR and extraction, keeping routeFor so low-confidence readings go to review (A1, A7). Done when 50 real Indian lab reports extract with the agreed accuracy.
- [ ] **Add a native document scanner** to the upload flow (ST11). Done when a scanned page is cropped and flattened before upload.
- [ ] **Connect the model** behind cheeku-chat and set EXPO_PUBLIC_CHAT_MODEL=edge (A2). Done when a chat turn on staging is answered by the real model.
- [ ] **Replace the silent fallback** with an honest "Cheeku is having trouble answering" state (A3). Done when stopping the model host shows that message, never a stand-in answer.
- [ ] **Build the evaluation set**: about 200 questions, including emergencies, pregnancy, children and medicines, with a pass bar the clinician agrees (A4). Done when the model passes it and the score is recorded.

### Week 4 · 2 to 6 Nov · Payments, scope and native features

- [ ] **Decide paid or free at launch** (ST2). If paid: RevenueCat, products in both stores, webhooks writing subscriptions. Done when a sandbox purchase unlocks the plan, or the paywall is hidden.
- [ ] **Trim to launch scope**: doctors, home services and (without a partner) lab booking say "coming soon"; remove the product checker and the "Soon" sign-in buttons (ST7). Done when no screen books or answers something fake.
- [ ] **Push live**: EAS project ID, APNs key, FCM credentials, deploy push-dispatch and its webhook (ST6). Done when an inbox row buzzes a real phone.
- [ ] **Universal links and app links** on the new domain, replacing the baymax scheme (S8). Done when a record link opens the app.
- [ ] **Page the records list and window the memory bundle** (B6). Done when a profile with 500 records opens in under 2 seconds.
- [ ] **Warn on a failed location strip in bulk upload** (P8). Done when bulk upload names any photo sent with location data.

### Week 5 · 9 to 13 Nov · Quality and production database

- [ ] **End-to-end tests** in Maestro for six journeys: sign up with consent, upload, ask, add family member, export, delete account (Q2). Done when they run in CI on every pull request.
- [ ] **Device pass** on 2 iPhones and 3 Android phones, including one under ₹12,000 (Q5). Done when each journey works and scrolls smoothly on all five.
- [ ] **Accessibility pass** with VoiceOver, TalkBack and the largest text size (Q7). Done when every journey can be finished with a screen reader.
- [ ] **Load test** chat and upload on staging at 50 concurrent users (scaling). Done when the slowest 5% of chat turns finish within 10 seconds.
- [ ] **Apply all migrations to production and rehearse a restore** (B1, B4). Done when a restored copy matches the original.
- [ ] **Write the deploy runbook**: functions, secrets, webhooks, migration order (B3). Done when someone else deploys staging from it alone.

### Week 6 · 16 to 20 Nov · Compliance, store paperwork and beta

- [ ] **Publish a small website**: privacy policy, terms, support and an account deletion request page (ST3, ST4). Done when all four URLs load publicly.
- [ ] **Store disclosures**: Apple privacy labels and privacy manifest, export compliance flag, age rating, Play Data safety and health apps declaration (P3, ST9). Done when both consoles show no missing sections.
- [ ] **Final legal texts in the app**: if the lawyer changed them, bump versions and add their hashes in a new migration (P1). Done when the in-app texts match the website.
- [ ] **Requests and incidents have an owner**: an alert for every privacy request and support ticket, and a one-page breach response plan (P2, Q8). Done when a test request reaches the officer's inbox.
- [ ] **Write the retention rule** and add it to the Privacy Policy (P5). Done when it's in the published policy.
- [ ] **Store listing assets**: screenshots, feature graphic, descriptions, preview video (ST10). Done when both listings are complete in draft.
- [ ] **Start the closed beta**: TestFlight and Play closed testing, at least 20 testers (ST5). Done when 20 people have installed it.

### Week 7 · 23 to 27 Nov · Beta fixes and submission

- [ ] **Fix beta issues** until crash-free sessions are at least 99.5% over 3 days. Done when the dashboard shows it.
- [ ] **Prepare App Review**: a demo account with sample records, review notes on the triage tiers and the "not medical advice" stance (ST8). Done when both are in the review fields.
- [ ] **Submit iOS and Android** for review by Friday 27 Nov. Done when both are "in review".

### Week 8 · 30 Nov to 4 Dec · Review and launch readiness

- [ ] **Answer review feedback** within a day and resubmit. Done when both builds are approved.
- [ ] **Smoke test the approved builds** against production: every journey from the E2E list. Done when all six pass on store builds.
- [ ] **Operations ready**: cost alerts on the model host and Supabase, an on-call rota for launch week, a status page or a pinned support message. Done when the alerts have fired once in a test.

## Launch week and the first 30 days

Launch on Wednesday 9 December with a staged release, so a bad build reaches a few people, not everyone: Apple's 7-day phased release, and Play at 10%, then 50%, then 100%.

- [ ] **Launch day**: release both stores; the on-call person watches crashes, chat errors and sign-ups for the first 6 hours.
- [ ] **Daily for the first 2 weeks**: crash-free sessions, failed uploads, model errors and cost per day, new privacy requests and support tickets. Hotfix through expo-updates where the fix is JavaScript only.
- [ ] **Day 7**: widen the Play rollout to 100% if crash-free sessions are 99.5% or better.
- [ ] **By day 14**: add the record-access log (S10) and the written rule for who on the team may open the Supabase dashboard.
- [ ] **By day 30**: run the retention rule as a scheduled job (P5); do the 10k-user items in the scaling table; switch on the first "coming soon" feature that has a real partner contract behind it.

## Decisions and inputs needed from you

Eight answers unblock the plan. The first four are needed in week 1, because everything after them waits on their lead times.

| # | Decision | Needed by | Recommendation |
|---|---|---|---|
| 1 | Final app name and the domain for links and the website | 14 Oct | Cheeku AI, if the trademark search is clear |
| 2 | Legal entity, registered address, grievance officer and privacy email | 16 Oct | Name a real person with time to answer within days, not the 90-day limit |
| 3 | OCR provider and model host, with where each stores data | 16 Oct | Vendors that sign a data processing agreement, process in India and don't train on your data |
| 4 | Paid plans at launch, or free first | 30 Oct | Free at launch with generous limits; turn on store billing after 30 days of real usage data |
| 5 | Lab booking at launch with one real partner, or "coming soon" | 30 Oct | Ship only if the partner API is live and tested by week 4 |
| 6 | A small, health-data-free analytics event set (Q6) | 6 Nov | Yes: about 10 funnel events, no record content, stated in the Privacy Policy |
| 7 | Retention rule for inactive accounts (P5) | 13 Nov | Notify after 3 years inactive, delete 90 days later unless they sign in |
| 8 | Lawyer and clinician to engage | 16 Oct | One health-tech privacy lawyer and one practising physician for a fixed-scope review |

Also needed: access to the Apple and Google developer accounts once they exist, and 20 friendly testers for the closed beta from week 6.
