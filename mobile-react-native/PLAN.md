# Execution plan — React Native app

The native build of the app that lives in the repo root as a Next.js web app.
Since 2026-10-31 everything else (docs, design, supabase, tests, founder-ops,
marketing) lives in this folder.

**THE WEB APP IS NO LONGER A TARGET.** Decided 2026-08-09: Baymax ships
exclusively as a mobile app on the App Store and Play Store. The Next.js build
stays as the reference for screens, flows and product rules that were decided
and reviewed there, and it is not maintained. Do not port mobile work back to
it, and do not treat a difference between the two as a mobile bug — including
the tier-2 caution UI, the subscription screen and the family tray, none of
which exist on web and none of which will.

Read alongside:

- `PROGRESS.md` — build log, every design decision with its reasoning
- `SHIPPING.md` — store submission constraints, including two blockers
- `REACT_NATIVE_BUILD.md` — the full brief this plan executes
- `TOOLCHAIN.md` — install hazards specific to this package
- `docs/platform-api/PLAN.md` — the partner API plan (chat, care bookings,
  health data, payments over one versioned API); nothing in it is built yet

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
in a shell. See `SHIPPING.md`.

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

1. Read `PROGRESS.md` before changing anything that looks odd. Most
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
7. Every bottom sheet is `<Sheet>` (`components/ui/sheet.tsx`), never a raw
   `Modal`; new tappable surfaces use `<Tap>` (`components/ui/tap.tsx`) at
   0.97, 0.98 for big cards, 0.95 for small round buttons. No Reanimated
   `Keyframe` entrances: they leave the view collapsed on web; use `<Enter>`
   from `components/ui/motion.tsx`. Haptics only through `src/lib/feel.ts`.
   A screen arriving shows a skeleton from `components/ui/skeleton.tsx`,
   never a spinner; `ActivityIndicator` is only for an action in progress
   (a button, an upload, a save).
8. Design values come from `src/theme/tokens.ts`: font sizes from `type`
   (11, 12, 13, 15, 17, 20, 24, 28, 34; 10 for counters, 36 and up for
   display), radii from `radius` (8, 12, 16, 24, 32, pill; 6 and under for
   hairlines), colours from `brand`, `ink`, `surface`, `hue`, `lilac` and
   `semantic`. Classes use the named scale (`text-sm`, `rounded-xl`), never
   `text-[13px]`. One primary: filled brand-600 means "do it"; ink-900 means
   "selected" (chips, segments) and the centre +. ESLint warns on anything
   off the scales.
9. Anything that buzzes a phone goes through the planner
   (`src/lib/notifications/engage.ts`) or push.ts's resync functions, under
   a stable id, so planning again replaces rather than doubles. Never ask the
   OS for permission without a tap on our own card first. The lock screen
   never names a medicine, a condition, a reading or a goal. A dose is a
   `today_actions` row `dose:<medicine>:<slot>`; Cheeku never sets or
   changes a dose, only reminds. The server side (migration 0038,
   `run_care_sweep`) only ever writes inbox rows; push-dispatch decides what
   buzzes, and a row with `data.quiet` never does.
10. Fitness matching runs on the phone (`src/lib/fitness/match.ts`); the
   network sees a place and a day, never a condition. Screens talk only to
   `fitnessNetwork()`; the partner API replaces the preview network there.
   The price on screen is `priceFor()`, and the server prices again from
   `app_config.fitness_pricing` (migration 0039), so a client never names
   one. The place comes from `src/lib/location` like everywhere else.
11. Location has one source of truth: `src/lib/location` (`useNearbyPlace`
   for a member, `useLiveLocation` in the shell). No screen calls
   expo-location or a maps provider itself; addresses come from the `geo`
   Edge Function (Ola Maps, then OpenStreetMap), which holds the only key.
   The system prompt only ever follows a tap on our own card. Never read
   location in the background.

12. **Nothing from a scan is filed before the person sees it.** Scan uploads
   the file and reads it, then shows Check and save: only what the reader
   was unsure of (confidence under 0.7) is asked about, with an edit box
   and "Looks right". Save writes the record; Discard deletes the stored
   file. Anything left unchecked is filed as needs_review ("Waiting for a
   check"), never as filed. A shared file waits in memory, never on disk,
   until whose it is has been answered.

13. **A privacy request is answered through `answer_privacy_request`, never
   by editing the row.** It checks the status, needs a reply before closing
   and tells the person in their inbox. The notification never repeats what
   they wrote, and neither does the alert email.

14. **Pressable comes from `@/components/ui/pressable`, never from
   "react-native".** NativeWind's native runtime turns a `style` callback
   (`({ pressed }) => ...`) into `{}`, so on a phone the row loses all its
   layout while the web looks fine. ESLint makes it an error.

15. **Leaving sign-in, onboarding, a booking or the account uses
   `startFresh(router, href)`** (`src/lib/nav/start-fresh.ts`), never a bare
   `router.replace`. Replace only swaps the top screen; whatever was pushed
   before stays under it, and the iPhone edge swipe walks back into it. The
   tab shell, welcome and who have the swipe-back gesture off.

16. **Insurance answers come from the saved policy, never from what policies
   "usually" cover.** `src/lib/insurance/explain.ts` says when the details
   are silent and names who can confirm (the policy wording, the TPA, the
   insurer). It answers money and paperwork only, never medicine. A pure
   cover question is answered by rules without the model; with a symptom
   alongside, the model answers and sees the cover in the digest.

## Running it

Web preview (fast, and NOT sufficient — see below):

    npx expo start --port 8081        # then open http://localhost:8081

iOS simulator:

    LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx expo run:ios --device "iPhone 17 Pro"

The locale is not optional. Without it CocoaPods dies with
`Unicode Normalization not appropriate for ASCII-8BIT` and Expo reports it as
"Something went wrong running `pod install`", which looks like a dependency
problem and is not one. The `pods` script in package.json already sets it.

The app is on SDK 58 (upgraded 2026-10-31) so it opens in the current Expo Go:
`npx expo start`, then scan the QR code. Expo Go only ever runs the latest SDK,
so the next SDK release breaks this again. Expo CLI needs Node 22.13+ or 24+;
odd releases (25) are unsupported. The `ios/` folder was generated for SDK 57:
run `npx expo prebuild --clean` before the next simulator or development build.

Copy `.env.example` to `.env.local` first. Migrations are applied in the
Supabase SQL editor from `supabase/manual/*-step-*.sql`, then the matching
`*-check.sql`.

**THE WEB PREVIEW IS NOT A VERIFICATION.** It is a browser: React Native Web
maps flexbox onto CSS, and the two disagree in ways that are invisible until
the app runs natively. Two bugs shipped looking perfect in the browser for
weeks — a wrapped row that stretched its tiles to full screen height in Yoga,
and a stacking order that painted a "behind" element in front on web only.
Anything about layout, cold-start routing, gestures, camera, biometrics or
haptics has to be seen on a simulator or a device before it counts as done.

## Open

- **Insurance needs 0043 applied** (2026-11-01). Paste
  `supabase/manual/0043-step-1-of-1.sql` into the SQL editor, then
  `0043-check.sql` (five yes rows). Until then Profile > Insurance shows the
  empty state and saving says the database needs updating; nothing else
  breaks. Policies are typed in for now: the document reader
  (`ai-insurance-read`) and a partner feed (`partner-insurance-feed`) come
  later and write the same table.
- **The RLS audit should add `insurance_policies`** alongside the tables
  listed below.

- **The RLS audit is stale** (2026-10-31). Everything that lived at the repo
  root now lives in this folder, and `tests/db` runs with `npm run test:db`.
  `rls.test.ts` fails 22 checks, as does the web app's identical copy in
  `src/lib/db/`: tables added since (app_config, app_flags, geo_cache,
  geo_quota, lab_*, memory_facts, open_loops, pregnancies, today_actions and
  others) use public-read or write-free
  policies it does not know about. Each needs a deliberate allow-list entry or
  a policy fix; it is kept out of `npx vitest run` until then.
- **Prescription scorecard needs 0042 and the rx-score function** (2026-10-31).
  Every prescription page now opens with a check of each medicine, read to
  its salts, on ten standards against the person's records
  (`app/prescription/[id].tsx`). Until migration 0042 runs the card is
  scored every time and not kept; until `rx-score` is deployed the phone
  scores it with the same rules (`src/lib/rx/engine.ts`, an exact copy of
  `supabase/functions/rx-score/rx.ts`, kept in step by a test). The
  formulary is a starter list of about 50 salts and 70 brands and is not
  clinically signed off; brands outside it show as "couldn't check". Prices
  are indicative. The licensed brand-to-salt resolver (ai-brand-salt)
  replaces the list. Seen only in the web preview against a local stand-in
  database; untested on a phone.
- **Privacy requests are answered from the SQL editor** (2026-10-27).
  Migration 0041 adds `privacy_queue` and `answer_privacy_request`; the
  weekly routine is in `docs/privacy/requests.md`. The email to
  privacy@cheekuai.in needs the `privacy-alert` function, its webhook and a
  Resend key with cheekuai.in verified; until then nobody is told when a
  request arrives, so check the queue weekly. The legal entity, address and
  courts are still placeholders until incorporation, and a lawyer has not
  read the texts (`docs/privacy/dpdp-readiness.md`).
- **Share to Cheeku needs a new build** (2026-10-26). `expo-share-intent`
  adds an iOS share extension and Android intent filters (PDF and images),
  so Expo Go and the current dev build will not show Cheeku AI in the share
  sheet: run `npx expo prebuild --clean` then a new dev build, or
  `eas build`. On iOS the extension is a second target with its own
  bundle id and an App Group; let EAS create their credentials on the
  first build (see the expo-share-intent README). Untested on a phone.
- **On web, picking a file in Scan says it could not be read.**
  `expo-file-system`'s `File` cannot open a browser blob URL. This was true
  before the share work too; the phone is the real path. Fix with a web
  branch in `prepareUpload` when web upload matters.
- **Location is live on production** (2026-10-26): 0040 applied and checked,
  the `geo` function deployed, `OLA_MAPS_API_KEY` set (Ola Maps credential
  `cheeku-geo-server`). Watch usage in the Ola console against the free
  allowance. To redeploy from the dashboard, paste
  `supabase/manual/0040-geo-function-paste.ts`.
- **Everyone re-agrees once** to the privacy policy of 2026-10-25, which now
  mentions location (material change).
- **Fitness runs on sample studios.** Everything from location to check-in
  works against the preview network (marked "Sample", nothing charged) until
  the partner's master API arrives (`int-fitness`). Migration 0039 is live
  on production (2026-10-25, check all yes). `expo-location` is a new
  native module: the phone needs a new dev build or `eas build`.
- **Doctors and labs are not sorted by real distance yet.** Their sample
  data has no coordinates; the chip shows the person's real place and the
  ranking arrives with each partner's API (`int-doctors`, `int-lab-partner`)
  through `distanceKm` in `src/lib/location/rules.ts`.
- **Phones buzz only with push credentials.** Migration 0038, the care-sweep
  cron job and the push webhook are live on production (2026-10-25). A
  server notification reaches a phone once the app build has an EAS project
  id and APNs/FCM keys; until then it lands in the in-app inbox.
- **Caregiver alerts go to every phone on the account**, the parent's own
  included when they use the same login. A "this phone is Papa's" setting
  would let push-dispatch skip theirs; not built.


- **Renamed, needs a new build** (2026-10-31). The bundle id and Android
  package are `in.cheekuai.app`, the slug `cheeku-ai` and the URL scheme
  `cheekuai` (was `com.baymax.app`, `baymax`). An installed dev build keeps
  the old id: run `npx expo prebuild --clean` and make a new dev build or
  `eas build`. Create store listings, OAuth client ids and EAS credentials
  against `in.cheekuai.app` only; the share extension and its App Group
  follow the new id. Untested on a phone.
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
- Real OCR and model — separate track, contract in `REACT_NATIVE_BUILD.md`.
  The chat model contract is `src/lib/memory/model.ts` (ModelRequest in,
  ModelReply out); every model turn goes to the `cheeku-chat` Edge Function.
  There is no stand-in (removed 2026-11-17).
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
- **Account deletion removes the sign-in (0037 + `delete-account`).** 0037
  applied on production (24 Oct, merged in PR #38). In order: run `supabase/manual/0037-step-1-of-1.sql`, check with
  `0037-check.sql`, deploy `supabase functions deploy delete-account` (JWT
  verification on), then ship the app. An app on the new code without the
  function says "your sign-in is still there" after erasing the records; a
  retry finishes once the function is live. Consent and privacy-request
  records are kept after deletion on purpose: the privacy policy (section on
  retention) should say so when a lawyer next reads it, which means a new
  document version.
- **Web hosting is on Vercel Hobby, which is for non-commercial use only.**
  Before launch, move `cheeku-ai-mobile` to Vercel Pro or
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
- **Chat pace limits are OFF for review and demos** (2026-11-17,
  `supabase/manual/chat-limits-demo.sql`: 1000 a minute, 10000 an hour;
  1000 a day). **Restore 6 a minute and 60 an hour before launch** (the
  revert line is in that file): the burst limits are what stop one account
  running up the Gemini bill.
- **Chat model: Gemini answers, no stand-in** (deployed 2026-11-16; stand-in
  removed 2026-11-17).
  `cheeku-chat` answers with Gemini when the `GEMINI_API_KEY` secret is set
  (`gemini-3.5-flash-lite`, then `gemini-3.5-flash`; `GEMINI_MODEL` and
  `GEMINI_FALLBACK_MODEL` override), until `CHEEKU_MODEL_URL` points at the
  fine-tuned model, which then wins. In order: 0035 applied (else 503), deploy
  `cheeku-chat` (CLI, or paste `supabase/manual/cheeku-chat-function-paste.ts`),
  set the secret. Nothing to set in the app: `EXPO_PUBLIC_CHAT_MODEL` is gone.
  A turn the model can't answer is refused with a plain line (busy, allowance
  spent, or "couldn't answer, try again") and nothing is saved; only a
  contact-today or go-now floor still gets the rules' "call the doctor" answer
  (`rules:floor`). **The key
  must be on a billed Google Cloud project**: on Gemini's free tier Google may
  use prompts to improve its products, and every prompt is a health record.
  flash-lite sometimes keeps the bird jokes when the floor is monitor or
  above, against the prompt; watch it in review.
  **Medicine questions need a clinician's read** (2026-11-16): the prompt now
  lets Cheeku name the over-the-counter TYPE for an otherwise healthy adult
  (dextromethorphan for a dry cough, guaifenesin for a chesty one), never a
  brand or dose, and nothing for under 4s, pregnancy, over 70 or a long-term
  condition (`prompt.ts`, "When they ask what to take").
  **Photos in chat** (2026-11-17): the composer's camera takes or picks a
  photo; a re-drawn 1280 px JPEG (EXIF gone) goes to Gemini once with the
  question and is never stored; a 256 px thumbnail is kept on the person's
  message (`messages.attachment`, kind `photo`). The prompt reads medicine
  packs and labels against allergies, conditions and medicines, never names a
  condition from a body photo, and asks for a clearer shot rather than guess.
  Needs a clinician's read with the medicine rules. Not checked on a device
  yet. The old fixed-product picker and its canned verdicts are gone; old
  product answers still render.
- **Wearables need a native build and one SQL step.** The module is in
  (`src/modules/wearables`, see its README): Apple Health and Health Connect
  run only in an EAS development or store build, not Expo Go. Migration 0044
  has to be run before real days are kept. Google Health (Fitbit, Pixel
  Watch) is built but off until Google approves the restricted scopes and the
  `wearables-google` function is deployed with its two secrets. Strava comes
  only through the phone's health app (Strava's API terms bar AI use).
- **No morning nudge yet.** The step is on Home only. A push at the person's
  chosen time, respecting `families.home_stage`, is the next piece.
- **`privacy_requests` has no one working it.** Needs an admin view or an
  email to the grievance officer.
- Rate limiting on auth (the chat model call is metered since 0035).
- **Haptics need a new native build.** `expo-haptics` (UI batch 1) is a native
  module: installed builds ignore it until the next `eas build`; web is a
  no-op by design. All calls go through `src/lib/feel.ts`.
- **UI audit batches 1 to 4 are built** (`docs/audits/2026-10-ui-ux-audit.md`).
  Batch 3 left 54 raw hex colours (illustration faces, Learn category art,
  chart gradients) as lint warnings; move them onto tokens when those files
  are next touched.
- **Goals live in `profiles.daily_prefs.goal`** (no migration). The daily
  goal reminder is a local notification, so it exists only on the phone that
  set it: a second phone, or a reinstall, needs the goal saved again to get
  it back. Streaks read 35 days of `today_actions` and 7 days of
  `daily_logs`, so a streak over a week counts habits only.
- **Ideas from the AQ / Ant Afu research** are in the launch tracker:
  goal cards first (`loop-goal-cards`, M2), then food scan, device sync,
  staged symptom check, medicine box photo, privacy blur and partner
  challenges. Doctor twins, elder mode, insurance pay and public counters
  wait for V2. Ranking and reasons in `docs/research/aq-ant-afu.md`.
- Untested: sign-out then sign-in, and a session revoked server-side.
