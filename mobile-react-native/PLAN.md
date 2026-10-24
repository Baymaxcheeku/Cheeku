# Execution plan — React Native app

The native build of the app that lives in the repo root as a Next.js web app.

**THE WEB APP IS NO LONGER A TARGET.** Decided 2026-08-09: Baymax ships
exclusively as a mobile app on the App Store and Play Store. The Next.js build
stays as the reference for screens, flows and product rules that were decided
and reviewed there, and it is not maintained. Do not port mobile work back to
it, and do not treat a difference between the two as a mobile bug — including
the tier-2 caution UI, the subscription screen and the family tray, none of
which exist on web and none of which will.

Read alongside:

- `../PROGRESS.md` — build log, every design decision with its reasoning
- `../SHIPPING.md` — store submission constraints, including two blockers
- `../REACT_NATIVE_BUILD.md` — the full brief this plan executes
- `TOOLCHAIN.md` — install hazards specific to this package

---

## Status

### Screen inventory

**Keep this table honest, and check it before declaring a phase done.** Phase 4
was called complete once on the strength of the commit log, which read
"settings hub with working export and account deletion" — true, and the six
screens the hub links to were stubs. A phase heading cannot tell you that; this
can. `stub` means the route renders `ComingLater`, so navigation works and
nothing lies about having data.

| Screen | State | Web counterpart |
| --- | --- | --- |
| `/welcome` `/sign-in` `/who` `/profile` `/first-upload` | done | — |
| `/plan` | done — opens the real chooser | `billing/paywall.tsx` |
| `/home` `/records` `/records/[id]` `/scan` `/ask` | done | — |
| `/home` stages: starter, building, Today (step, streak, due, family alerts, unlock moment) | done 2026-10-13, needs migration 0033 | — |
| `/today` action plan: five pillar switches, steps with screenshot, meal photos with plate read, readings, sleep rating, guided breathing, plan settings | done 2026-10-13, needs migration 0034 | — |
| `/settings` hub, export, delete | done | — |
| `/settings/security` | done, rebuilt 2026-10-08 (auto-lock delay, other devices, activity) | `settings/security` (134) |
| `/settings/privacy` | done 2026-10-08, needs migration 0031 | — |
| `/settings/storage` | done 2026-10-08 | — |
| `/legal/[doc]` (terms, privacy, health consent, storage notice) | done 2026-10-08 | — |
| Consent sheet (sign-up box, re-consent gate) | done 2026-10-08, needs migration 0031 | — |
| `/settings/personal` | done | `personal-info-form.tsx` (149) |
| `/settings/health` | done | `health-profile-form.tsx` (170) |
| `/settings/notifications` | done, rewritten 2026-09-30 | `notification-toggles.tsx` (210) |
| `/notifications` inbox | done 2026-09-30, needs migration 0024 | — |
| `/family`, `/family/add`, `/family/[id]` | done 2026-09-30, needs migration 0025 | — |
| `/settings/language` | done | `settings/language` (91) |
| `/settings/help` | done | `help` + `report-issue` (395) |
| `/settings/about` | done | `settings/about` (342) |
| Paywall | done | `billing/paywall.tsx` (609) |
| Add a family member | done | — |

**Phase 4 is complete.** The three gaps this table was written to catch — a
grey notice where the paywall belonged, padlocked rows that opened nothing, and
a completeness meter counting a form that did not exist — are all closed.

### Toolchain

**Phase 0 complete.** Scaffold, toolchain, shared logic, design tokens.

| | |
| --- | --- |
| Expo SDK | 57, React Native 0.86, React 19.2.3, new architecture on |
| Router | expo-router, typed routes |
| Styling | NativeWind 4.2.6, tokens ported from `globals.css` |
| Backend | `@supabase/supabase-js`, sessions in SecureStore |
| Tests | 103 ported tests passing, including the 300-phrase safety corpus |
| Bundle | `expo export --platform ios` succeeds |

**Ported and passing (`src/lib/`):** the safety gate and its frozen corpus,
plans and tiers, record types, date grouping, filters, insight, the journeys,
notification derivation, the avatar generator, Zod schemas, and the complete
mock AI — extractor, answer engine, knowledge corpus, product scenarios.

**One deliberate change during the port.** `profiles/avatar.ts` returned a
base64 `data:` URI for an `<img src>`. React Native has neither `Buffer` nor
`<img>`, so it now returns raw SVG for `react-native-svg`'s `SvgXml`. Same
generator, same seeds, same faces.

---

## Phase 1 — shell and auth (2 weeks)

Screens: `/` splash · `/welcome` (4-panel carousel, journey picker) ·
`/sign-in` · `/who` · `/profile` · `/first-upload` · `/plan`

1. Port the motion vocabulary. `../src/components/ui/motion.tsx` is the whole
   set: `Drift`, `Settle`, `PulseRing`, `StaggerList`, `PopIn`, `PressRow`,
   `Meter`, `SpringSwitch`, `TapToWiggle`. Rewrite once in Reanimated and every
   screen follows. Honour `useReducedMotion` explicitly — Reanimated does not
   inherit the OS setting.
2. Port the primitives: `Button`, `Field`, `Sheet`. The web `Sheet` is a portal
   working around a stacking-context trap that does not exist here; use
   `@gorhom/bottom-sheet` or a plain modal instead.
3. Port the Sprout mascot to `react-native-svg`. Gradients port; filters do
   not. `../src/components/illustrations/sprout-flat.tsx` is the filter-free
   fallback if the shading does not survive.
4. Supabase auth against the existing project. Session in SecureStore, already
   wired in `src/lib/supabase/client.ts`.
5. Journey selection persists locally, not to a cookie. **It is a
   personalisation hint, never a clinical fact** — nothing downstream may read
   it as history or feed it to the model.

## Phase 2 — memory core (3 weeks)

Screens: `/scan` · `/scan/review` · `/records` · `/records/[id]` · `/home`

1. `expo-image-picker` for camera and library. Strip EXIF before upload — a
   photo of a prescription carries the GPS of the house it was taken in.
2. Upload to Supabase Storage. **The object key is server-generated** as
   `<user_id>/<profile_id>/<uuid>.<ext>`; storage policies match on the first
   segment, so a client-supplied path is a client-supplied authorisation
   decision.
3. Records list and timeline behind one segmented toggle, as on web.
4. Record detail keeps the structured/original toggle. Extraction can be wrong,
   and a screen that only shows the machine's reading with no way back to the
   page the lab printed is asking to be trusted more than it has earned.
5. Home: greeting, family switcher, insight row, Ask box, health summary.

## Phase 3 — the companion (2.5 weeks)

Screens: `/ask`, emergency escalation, family switcher

1. **The safety gate runs on device, before any network call, in the one send
   path.** Ported unchanged. Do not add a second route to the model.
2. Citations are tappable through to the record. A citation that cannot be
   checked is decoration.
3. Escalation still records the turn. An escalation that leaves no record is
   not auditable.
4. Family switcher enforces plan-scoped access — see Phase 4.

## Phase 4 — account (2.5 weeks)

Screens: `/settings` and its seven sub-screens, paywall, export, delete

1. **Plan-scoped profile access.** A family shares one `user_id`, so RLS cannot
   separate members. Every read path derives from `selectableProfiles()`.
   Locked members are preserved and shown as padlocks, never deleted.

2. **Entitlement-gated WRITES — done, in the database rather than an Edge
   Function.** This was the one place the port lost a guarantee the web build
   had: on web the plan checks ran in server actions the client could not
   reach, and here they ran on the device.

   Migrations `0011_entitlement_enforcement.sql` and `0013_profile_seat_limit.sql`
   close all three as triggers:

   - `documents_plan_scope_trigger` — refuses a document filed against a
     profile the plan does not cover.
   - `messages_chat_quota_trigger` — spends one chat per user message, under a
     row lock. Assistant replies and escalations are free.
   - `profiles_seat_limit_trigger` — refuses a profile beyond the plan's seats.
     The first profile on an account is always allowed, whatever the plan says:
     onboarding creates it before any subscription row exists, and an account
     that cannot create its own profile has no way forward and no way to ask
     for help.

   A trigger rather than the Edge Function this plan originally called for,
   because both decisions are already writes to tables the database owns. A
   function the client chooses to invoke is not a check; a trigger runs on every
   insert whatever the client does. It is also atomic, which the web
   `consumeChat` was not — it read, compared, then wrote, so two racing sends
   both passed the comparison. And there is no second deployment target.

   The client keeps its copy of each check. Those are the error messages now,
   not the gates: they name the plan and offer the upgrade where a trigger can
   only refuse.
3. Export and delete must both work. Stores require in-app account deletion.
4. Health profile completeness meter counts from the saved record, not live
   input.

## Phase 5 — native capability (3 weeks)

Not polish. Without these, App Store Guideline 4.2 rejects the app as a website
in a shell. See `../SHIPPING.md`.

1. Push: APNs and FCM. **Partly done 2026-09-30.** Appointment reminders are
   local notifications and need no credentials. Remote push is written end to
   end (token registry in migration 0024, `supabase/functions/push-dispatch`)
   and waits on three things: an EAS project id in app.json, APNs/FCM keys in
   EAS, and deploying the function plus its Database Webhook.
2. Biometric app lock (`expo-local-authentication`).
3. Native document scanner, not a file input.
4. Offline read of fetched records. A medical app that is blank on a train is
   worse than one that says "last synced 09:14".
5. Universal Links and App Links so `/records/<id>` opens in the app.

## Phase 6 — billing and store (4 weeks)

1. RevenueCat in front of StoreKit and Play Billing. **UPI cannot take payment
   for in-app features on iOS** — Guideline 3.1.1.
2. The entitlement read path is unchanged; only the writer becomes a validated
   receipt plus renewal, cancellation, refund and grace webhooks.
3. Store accounts, listings, privacy labels, TestFlight, review.

**Total: 13–17 weeks to a submittable build.**

---

## Rules

1. Read `../PROGRESS.md` before changing anything that looks odd. Most
   surprising decisions are recorded there with the reason.
2. Ported tests are the specification. If one fails, the port is wrong.
3. Semantic colour is health meaning only. Never a button, never a category
   tint. Broken twice on web, caught twice.
   One owner-approved exception (2026-10-03): the notification inbox marks new
   rows with a yellow dot and read rows with a green tick, always next to the
   words "new" and "read". Nowhere else.
4. Never show one family member's data in another's context.
5. No health data in logs, URLs, query strings, or analytics.
6. The app does not diagnose. It reads what people describe against the
   person's own memory (records, readings, medicines, clock) using general
   health models, says how urgent it looks in one of four tiers, and writes
   out what to tell the doctor. Naming a diagnosis or changing a dose is a
   bug. Hard-stops and the safety lexicon always beat the model.

## Running it

Web preview (fast, and NOT sufficient — see below):

    npx expo start --port 8081        # then open http://localhost:8081

iOS simulator:

    LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx expo run:ios --device "iPhone 17 Pro"

The locale is not optional. Without it CocoaPods dies with
`Unicode Normalization not appropriate for ASCII-8BIT` and Expo reports it as
"Something went wrong running `pod install`", which looks like a dependency
problem and is not one. The `pods` script in package.json already sets it.

Expo Go cannot run this build — it is SDK 57 and Expo Go ships the SDK it was
released with. Use the simulator, or a development build on a device.

Copy `.env.example` to `.env.local` first. `DATABASE_URL` lives in the ROOT
`.env.local`, not this one, and migrations run from the repo root with
`npm run db:migrate`.

**THE WEB PREVIEW IS NOT A VERIFICATION.** It is a browser: React Native Web
maps flexbox onto CSS, and the two disagree in ways that are invisible until
the app runs natively. Two bugs shipped looking perfect in the browser for
weeks — a wrapped row that stretched its tiles to full screen height in Yoga,
and a stacking order that painted a "behind" element in front on web only.
Anything about layout, cold-start routing, gestures, camera, biometrics or
haptics has to be seen on a simulator or a device before it counts as done.

## Open

- **Rename.** "Baymax" is Disney's character and blocks store submission. It is
  currently the Expo `name`, `slug`, `scheme` and both bundle identifiers.
  Change before creating any store account.
- **The product checker is a mock.** `askAboutProduct` answers from five
  scenarios in `src/lib/ai/mock/scenarios.ts`, not a real ingredient lookup.
  The About page describes the capability without claiming "scan anything", but
  this cannot ship as-is.
- **Nine knowledge articles need a clinician.** Migrations 0017 and 0021.
  `reviewed_on` is the date the text was checked against its sources — it is
  not a medical review, and the migration headers say so.
- **Demo data is attached to a duplicate profile.** The seed account has two
  profiles named "Athar"; the seeded documents hang off the non-primary one, so
  Ask answers "nothing in your records" while looking at the primary.
- **`activate_tier_demo` grants paid tiers for free** (0012, gated on
  `app_flags.demo_billing`). Drop it before real billing.
- Real OCR and model — separate track, contract in `../REACT_NATIVE_BUILD.md`.
  The chat model contract is `src/lib/memory/model.ts` (ModelRequest in,
  ModelReply out); turn it on with `EXPO_PUBLIC_CHAT_MODEL=edge` and the
  `cheeku-chat` Edge Function secrets. Until then the stand-in answers.
- **Clinical sign-off for the memory layer.** The clock-keyed limits in
  `src/lib/memory/thresholds.ts` (newborn bilirubin rows are examples from
  the reference thread, not a guideline), the hard-stop rules in
  `src/lib/memory/ladder.ts` and the symptom models in
  `src/lib/memory/symptoms.ts` need a clinician's review before launch.
- **Migration 0030** (memory layer) must be applied for chat memory,
  readings, open loops, pregnancy and birth promotion. The chat still works
  before it, without remembering readings or tiers.
- **Migrations 0031 to 0034 are on production** (checked 2026-10-19 with
  `supabase/manual/0031-0034-check.sql`, backfill included). Every existing
  user sees the consent sheet once; `app_flags.enforce_consent` switches the
  write guard off if needed.
- **Migration 0035** (chat metering, 20 free chats a day) must be applied
  BEFORE the `cheeku-chat` function is redeployed and BEFORE the app release
  that says 20. Without it the new function answers 503 (the stand-in takes
  over) and the trigger still refuses at 5 while the app says 20. Check with
  `supabase/manual/0035-check.sql`. Limits are one row,
  `app_config('chat_limits')`; `FREE_CHAT_LIMIT` mirrors `free_daily`.
- **Migration 0036** (notification wording, content system) must be applied
  for the new inbox and push copy, and to fix "You get 5 chats a day" on
  downgrade. Needs 0035. Steps `supabase/manual/0036-step-1-of-5.sql` to
  `5-of-5`, then `0036-check.sql`. Until then the old wording shows; nothing
  breaks.
- **Account deletion removes the sign-in (0037 + `delete-account`).** In
  order: run `supabase/manual/0037-step-1-of-1.sql`, check with
  `0037-check.sql`, deploy `supabase functions deploy delete-account` (JWT
  verification on), then ship the app. An app on the new code without the
  function says "your sign-in is still there" after erasing the records; a
  retry finishes once the function is live. Consent and privacy-request
  records are kept after deletion on purpose: the privacy policy (section on
  retention) should say so when a lawyer next reads it, which means a new
  document version.
- **Web hosting is on Vercel Hobby, which is for non-commercial use only.**
  Before launch, move `cheeku-ai-mobile` (and `cheeku-ai`) to Vercel Pro or
  to Cloudflare Pages (free plan allows commercial use; verify current terms).
  Supabase is on the free plan too, which pauses a project after a week
  without traffic: move production to Pro before real users depend on it.
- **Legal texts are drafts.** Company name, address, grievance officer and
  emails are [placeholders] in `src/lib/legal/entity.ts`, and the documents
  show a draft banner until they are filled. A lawyer should read all four
  before launch. Any change to a text changes its hash: bump the version,
  add a `legal_documents` row in a new migration, and set `material` if
  people must agree again.
- **Today's daily steps need a clinician's read.** `src/lib/home/content.ts`
  (40 habits) and the marker and condition matching in `src/lib/home/today.ts`.
  Habits only, never a medicine change; kidney flags drop the water step,
  babies get no habits, children and pregnancy get a gentle subset.
- **Meal photos are not read by a model yet.** The plate is read from the
  taps (`src/lib/home/meals.ts`); `daily_logs.analysis` is reserved for the
  server's reading of the photo and the app cannot write it.
- **Wearables.** Steps are typed with a screenshot as proof. Apple Health and
  Google Fit (Health Connect) are the next step and need a native build.
- **No morning nudge yet.** The step is on Home only. A push at the person's
  chosen time, respecting `families.home_stage`, is the next piece.
- **`privacy_requests` has no one working it.** Needs an admin view or an
  email to the grievance officer.
- Rate limiting on auth (the chat model call is metered since 0035).
- **Ideas from the AQ / Ant Afu research** are in the launch tracker:
  goal cards first (`loop-goal-cards`, M2), then food scan, device sync,
  staged symptom check, medicine box photo, privacy blur and partner
  challenges. Doctor twins, elder mode, insurance pay and public counters
  wait for V2. Ranking and reasons in `../docs/research/aq-ant-afu.md`.
- Untested: sign-out then sign-in, and a session revoked server-side.
