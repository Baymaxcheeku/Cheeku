# Baymax — build log

Running log so work can resume cleanly across sessions.

## Phase 1 — Foundation · complete

**Built**

- Next.js 15.5.21 (App Router) + React 19 + TypeScript strict, `src/` layout,
  `@/*` alias. `noUncheckedIndexedAccess`, `noImplicitOverride` and
  `noFallthroughCasesInSwitch` on top of `strict`.
- Tailwind v4 with the full token set in `src/app/globals.css`, exposed through
  `@theme inline` so tokens are usable as utilities (`bg-brand-700`,
  `text-ink-500`, `rounded-card`, `shadow-e1`).
- Design tokens **sampled from the frames** via `design/sample_tokens.py`, not
  copied from the spec. See `design/SCREEN_INVENTORY.md` §1.
- All 42 design frames read and inventoried into `design/SCREEN_INVENTORY.md`
  plus three detail files in `design/inventory/`.
- Supabase browser + server clients (`src/lib/supabase/`), cookie-based session
  refresh in `src/middleware.ts`, `requireUser()` helper for Server Actions.
- Zod-validated env split into client and server schemas (`src/lib/env.ts`);
  `serverEnv()` throws if reached from a browser bundle.
- Security headers in `next.config.ts`: CSP (no third-party origins), HSTS,
  `X-Frame-Options: DENY`, nosniff, referrer policy, permissions policy.
- ESLint (next + typescript-eslint strict + prettier) with a custom
  `no-restricted-properties` rule banning raw `process.env` reads in `src/`.
- Vitest and Playwright configured. `pnpm verify` runs typecheck → lint → test →
  build.

**Verified**

- `pnpm typecheck` clean.
- `pnpm lint` clean (0 errors, 0 warnings).
- `pnpm build` succeeds; middleware bundles at 107 kB.
- `.env.local` is gitignored, `.env.example` is tracked (checked with
  `git check-ignore`).
- No secrets in the repo — `.env.local` holds placeholders only.

**Skipped, and why**

- **Supabase project not connected.** No project exists yet, so `.env.local`
  carries placeholder values. Migrations, RLS policies and the profile-isolation
  test are Phase 2 work and cannot be verified against a live database until
  credentials arrive.
- **GitHub repo not created.** `gh` is installed but not authenticated. The repo
  is committed locally; run `gh auth login` then
  `gh repo create baymax-app --private --source=. --remote=origin --push`.
- **Fonts.** The design calls for General Sans / Clash Display (Fontshare).
  Inter is loaded as the spec'd fallback until licensed files are supplied.
  Fraunces is wired up but unused — see conflict §4, the frames contain no serif.
- **`pnpm seed`** — Phase 2, needs a database.

**Open decisions blocking later phases** — see `design/SCREEN_INVENTORY.md`
§ Conflicts. The three that matter: emergency-screen behaviour (safety), the
double meaning of semantic colour, and email/password vs phone OTP auth.

**Rulings received (2026-07-26)** — recorded inline in
`design/SCREEN_INVENTORY.md`: hybrid emergency flow (hard gate → support flow,
offering both 112 and 108), a separate non-semantic confidence scale, and
email/password as the primary auth path.

## Phase 2 — Safety + data model · complete

**Built — the safety gate**

- `src/lib/safety/lexicon.yaml` — human-readable source of truth. 11 escalate
  rules (chest pain, cardiac arrest, stroke, breathing, anaphylaxis, heavy
  bleeding, unconscious, seizure, pregnancy red flags, self-harm, overdose) and
  5 tier-2 rules (prolonged fever, infant fever, dehydration, double dose,
  allergic reaction). English plus Hindi/Hinglish patterns throughout.
- `scripts/build-lexicon.ts` (`pnpm safety:build`) compiles it to
  `lexicon.generated.ts`, so `detect()` stays pure, synchronous and
  dependency-free. Every pattern is compiled at build time — a broken regex
  fails the build instead of silently never matching.
- `src/lib/safety/detect.ts` — `detect()` and `normalise()`. Normalisation
  handles NFKD, diacritics, curly quotes, character elongation and Hinglish
  spelling variants (`nhi`/`nahin` → `nahi`, `sine`/`chaati` → `seene`, …).
  `matched` returns a rule id only, never user text, so nothing PII-bearing can
  reach a log.
- Frozen suite: 150 must-fire phrases, 159 must-not-fire lookalikes, 16 tests.

**Two real defects the suite caught, both now fixed**

1. `cardiac-arrest` had `unless: father|mother|grandfather|grandmother`, intended
   to suppress family history. It also suppressed *"my father is having a heart
   attack right now"* — the single most likely real call the rule will ever see.
   Replaced with past-tense and educational-context exclusions only.
2. Several Hinglish patterns could never match. They were written against raw
   text (`seene mein dard`) but matching runs *after* normalisation, which folds
   `mein` → `me`. Patterns now target the normalised form, with a comment saying
   so.

**One behaviour change to the control, made deliberately**

`unless` was evaluated against the whole message, so an idiom anywhere could
silence a real symptom elsewhere — *"my back hurts when i laugh. separately, I
have chest pain"* returned `clear`. `detect()` now splits on sentence and
clause boundaries and classifies each segment, so suppression is scoped to the
sentence that contains the idiom. Covered by an explicit test.

**Built — data model**

- Five migrations in `supabase/migrations/`, RLS enabled and policied in the
  same file as every table. Nine tables: families, profiles, documents,
  entities, timeline_events, conversations, messages, consent_log,
  subscriptions. Indexes per spec §5.
- Deliberately *not* client-writable: `consent_log` has no update/delete policy
  (an editable consent record is not evidence), `messages` has no update policy
  (the transcript is a safety audit trail), `subscriptions` has neither (a client
  that can write its own tier can grant itself a free plan).
- `profiles` enforces the 6-per-family cap and one-primary-per-family in the
  database, not just the UI.
- Storage bucket `documents` is private, capped at 10MB, mime-allowlisted, with
  object policies scoped to a `<user_id>/…` key prefix.

**Built — tests and fixtures**

- `src/lib/db/rls.test.ts` — static audit of the migrations. Asserts every table
  enables RLS, every policy references `auth.uid()`, no `using (true)` anywhere,
  and the append-only tables stay append-only. Runs with no infrastructure.
- `src/lib/db/profile-isolation.test.ts` — the runtime proof: seeds two users,
  asserts every query path for one returns zero rows belonging to the other,
  including cross-user read, write, update, delete and signed-URL attempts.
- `src/lib/ai/mock/fixtures/family.ts` — the demo family (Athar, Ananya at 24
  weeks, Amma with T2D), with fixed ids so a mock citation always resolves to a
  real row. `family.test.ts` guards demo coverage: a `needs_review` document, a
  `high` lab flag, and three HbA1c readings spanning 18 months.
- `pnpm seed` / `pnpm seed:reset`. The script refuses to run against a
  non-local project unless `SEED_ALLOW_REMOTE=1` is set.

**Verified**

- `pnpm test` — 64 passed, 18 skipped (the isolation suite).
- `pnpm typecheck`, `pnpm lint`, `pnpm build` all clean.
- Seed guard confirmed: refuses the placeholder project by default.

**Skipped, and why**

- **The profile-isolation test has never actually run.** It is skipped because
  no Supabase project exists. The static audit proves the policies are *written*;
  only this proves they *work*. This is the largest outstanding risk in the
  build and must be run — and added to CI — the moment credentials arrive.
- `pnpm seed` likewise unrun for the same reason.
- Rate limiting on auth and AI endpoints (spec §3.2) deferred to Phase 3/5,
  when those endpoints exist.

## Phase 3 — Auth + onboarding (A1–A6) · complete

**Built — the six screens**

- **A1 splash** (`src/app/page.tsx`). No frame was supplied, so it is assembled
  from the carousel's own vocabulary rather than invented. It hands off on a
  1.4s timer *and* carries a real focusable link — a splash that only advances
  on a timer strands anyone whose timer never fires.
- **A2 welcome** (`(onboarding)/welcome`) — four-panel carousel, swipeable, with
  dots and a Skip.
- **A3 sign-in** (`(onboarding)/sign-in`) — tabbed Sign in / Create account.
  Email/password primary per the ruling. The form is keyed on the tab so it
  remounts on switch: a password typed on one tab can never be submitted to the
  other action. Errors clear on switch too, since an error naming the other
  form's fields would point at controls that are no longer on screen.
- **A4 who** (`(onboarding)/who`) — Just me / My family, radio inputs kept
  `sr-only` inside styled labels so the cards stay keyboard- and
  screen-reader-navigable.
- **A5 profile** (`(onboarding)/profile`) — every field except the name is
  genuinely optional. This is health data; collecting it because a form has room
  is the opposite of data minimisation.
- **A6 first upload** (`(onboarding)/first-upload`) — skipping is a first-class
  outcome, not a consolation. A nag screen at the end of onboarding costs more
  accounts than one extra document is worth.

**Built — the plumbing**

- `src/lib/auth/schemas.ts` — Zod schemas shared verbatim by the client form and
  the Server Action, so the two can't drift. DPDP consent is `z.literal(true)`,
  which makes an unticked box a *parse* failure rather than a check someone can
  forget to write.
- `src/lib/auth/actions.ts` — Server Actions returning a discriminated
  `ActionResult` union, consumed through `useTransition`. Consent is written to
  `consent_log` using the exported `CONSENT_VERSION`, so the logged version can
  never drift from the schema that enforced it.
- `src/lib/auth/dev-session.ts` — a cookie-backed stand-in so onboarding is
  walkable with no Supabase project. Quarantined behind `import "server-only"`
  and an `assertDevOnly()` that reads `IS_PRODUCTION`; it cannot reach a
  production bundle.
- `src/components/ui/` (`button`, `card`, `field`) and
  `src/components/onboarding/chrome` (`OnboardingHeader`, `Headline`,
  `ReassuranceStrip`) — built from the measured tokens, no ad-hoc hex.
- `design/crop_illustrations.py` — reproducible extraction of the nine
  illustrations out of the mockup frames, replacing untracked ad-hoc Pillow
  calls.
- `src/components/device-frame.tsx` — on anything wider than a phone the app is
  put inside an iPhone 16 shell (393×852pt, 59pt top inset, 34pt bottom) rather
  than stretched across the window. Desktop is a review surface, not a target,
  and reviewers should see the app at the size it will be used. The toggle is a
  media query, not JavaScript: a viewport check in JS renders differently on the
  server and the client and hydrates mismatched. Below 480px every box in the
  frame is `display: contents`, so on a real phone it costs nothing.
- Safe-area insets are now real. `--safe-top` / `--safe-bottom` come from
  `env(safe-area-inset-*)` on device and are overridden to the iPhone's numbers
  inside the frame; the onboarding layout is their single owner. Screens size
  against `min-h-app` rather than `dvh`, so they fill the simulated display
  instead of the browser window.
- **The A1–A4 step chips are gone and every CTA now sits above the fold.** The
  chips cost a fixed band at the top of five screens to say something the
  screens already said, and they were the difference between a reachable button
  and a scroll on most of the flow. `StepChips` is deleted and `OnboardingHeader`
  no longer takes a `step`. Measured at the iPhone 16 display size,
  `/welcome` (all four panels), `/sign-in` (both tabs), `/who` and
  `/first-upload` now overflow by exactly 0px.

**A5 is the exception, and it is a different problem**

`/profile` was 616px over — ten form fields cannot share one fold at any
spacing, so tightening it was never going to work. It got a **pinned CTA**
instead: the bar is `sticky bottom-0` inside the scrolling screen. Every field
on it is optional, which means submitting early is the *common* action, and a
button parked below the fold is exactly the action that hides. The bar pads
itself with `calc(var(--safe-bottom) + 0.75rem)` — `sticky` pins to the
scrollport, so it does not inherit the layout's home-indicator inset and would
otherwise sit on top of the indicator.

**Verified**

- `pnpm typecheck`, `pnpm lint`, `pnpm test` (64 passed / 18 skipped) and
  `pnpm build` (11 routes, all static) clean.
- All six screens plus the `/home` stub walked in a live preview at the iPhone 16
  viewport (393×852).
- **The DPDP gate was proved server-side, not just in the UI.** Submitting
  Create account with the box unticked returns *"Please accept the privacy terms
  to continue"* and stays on `/sign-in`.

**Four things worth recording**

1. *A false alarm that was my test harness, not the code.* The consent gate first
   appeared not to block. The cause was the probe submitting the form in the same
   tick as the tab click, before React flushed state — so `tab` was still
   `"sign-in"` and `signIn` ran, which the dev stand-in accepts for any
   credentials. A unit test on the schema, and a re-run with a wait, both
   confirmed the gate.
2. *Illustration crops had the phone bezel baked in.* Three auto-detection
   approaches all failed — the frames sit on a light page, so an edge scan finds
   the page; a centre-row scan is split by dark artwork. The lit screen is now a
   measured, asserted constant with the rejected alternatives written down in the
   script.
3. *Hero art overlapped the headlines on A3/A5/A6*, worst on A6 where "first
   health record" ran underneath Baymax. Fixed by giving the positioned container
   a `pr-` gutter rather than capping each paragraph's width.
4. *The shell was letterboxed on iPhone 16.* The `max-w` was 390; current iPhones
   are 393 and 430. Raised to 430 — the layout is padding-based, so it absorbs
   the extra width without any frame measurement drifting.

**Deliberate divergences**

- **The upload button and the three social providers are visibly disabled**, each
  with a `title` saying why. The upload pipeline is Phase 4 and no OAuth provider
  is configured. A control that silently does nothing is a worse first impression
  than one that admits it is not ready.
- **10MB upload cap, not the frame's 25MB.** The storage bucket is capped at 10MB
  at the database layer; the copy matches the constraint that is actually
  enforced. Recorded in `design/SCREEN_INVENTORY.md`.

Three further cuts were made to win back the fold. Each removed something the
frames draw, so each is recorded here rather than left as a silent edit:

- **A6's three alternate tiles lost their caption lines.** "Take a photo",
  "Email to Baymax" and "Import from device" keep their titles. All three are
  Phase 4 placeholders, and spending ~30px of a single fold on descriptions for
  controls that do nothing pushed the real CTA off screen.
- **A3 lost its closing "New to Baymax? Create account" line.** The tablist at
  the top of the sheet is on screen at the same moment and does exactly that
  job. It was a second control for one action, and it was the one costing the
  primary CTA its place above the fold.
- **A4 lost its `Dots current={3} total={4}`.** A4 is not a carousel; the dots
  were hardcoded and indicated nothing that could change. With the step chips
  gone they were the last vestige of a progress metaphor the flow does not use.

**Skipped, and why**

- Rate limiting on the auth endpoints — deferred with the rest of it until real
  Supabase auth replaces the dev stand-in.
- Password reset (`/forgot-password`) is linked but not built; it needs a live
  mailer.

## Supabase — connected · 2026-07-27

The project is live: `mhriweqqtokdgyemvzuq`, region ap-southeast-2. All five
migrations applied, the suite runs against it, and the seed data is in.

**A migration runner, because the SQL Editor was not good enough**

Pasting the migrations into the dashboard SQL Editor left the schema **half
applied** — `families`, `profiles`, `documents` and `entities` existed,
`timeline_events` onward did not. The editor reports only the first error and
says nothing about how far a multi-statement paste got, so the failure was
invisible until the tables were counted directly.

`scripts/migrate.ts` (`pnpm db:migrate`, `pnpm db:reset`) replaces that. Each
file runs in its own transaction, so a failure rolls that file back rather than
leaving debris, and the error is reported with the file *and the line*, resolved
from the Postgres character offset. `--reset` refuses to run if any table holds
rows — a reset script that can quietly destroy real data is a liability, and
this one will be pointed at a database with records in it eventually.

**The isolation test had never actually run — and could not have**

`profile-isolation.test.ts` reported "skipped, no project configured" for two
phases. That was misleading: vitest does not load `.env.local`, so the variables
it checks for were never going to be set, project or no project. It would have
sat skipped forever while looking like it was merely waiting.

Fixed in `vitest.config.ts` with `env: loadEnv("development", …)`. The mode is
deliberately not `"test"` — Vite skips `.env.local` entirely in test mode, which
would have silently reproduced the exact bug the line exists to fix.

It now runs, against the real database, and **passes**: 18 assertions proving
user A's every query path returns zero rows belonging to user B. The suite went
from 64 passed / 18 skipped to **82 passed / 0 skipped**. This is the runtime
half of the RLS guarantee, and until today only the static half was proven.

**Verified against the live project**

- 9 tables, all present. Seed: 1 family, 3 profiles, 9 documents, 20 entities,
  7 timeline events, 1 consent record, 1 subscription.
- Anonymous reads of `profiles` and `documents` return `[]` — RLS enforcing.
- Storage bucket `documents`: `public=false`, 10MB cap, MIME allow-list of
  jpeg/png/heic/pdf. Matches the app-layer validator.
- The app switched itself to real Supabase auth on configuration
  (`isSupabaseConfigured()`); the dev stand-in is no longer in the path.

**Two findings from the live sign-up path**

1. *Supabase rejects `@example.test` addresses outright.* An end-to-end attempt
   through the UI failed with the generic credentials error, which looked like
   an app bug and was not — the app correctly reported a real `signUp` failure.
   Worth knowing before writing E2E fixtures against reserved TLDs.
2. *Sign-ups were rate limited to roughly 2/hour.* Email confirmation was on
   with no custom SMTP, so every sign-up went through Supabase's built-in
   mailer, which throttles hard. The failure surfaced as `429
   over_email_send_rate_limit` — but the UI reported it as *"That email and
   password combination didn't work"*, sending people to re-check a password
   that was always correct. **Resolved:** "Confirm email" is off for
   development (`mailer_autoconfirm: true`). It must go back on, with real
   SMTP, before launch.

**Auth failures are no longer all the same message**

That rate-limit incident exposed a real flaw: every Supabase error collapsed to
the generic credentials message, which made an infrastructure failure look like
a typo. `authFailureMessage()` now separates the two. Rate limits, rejected
addresses, disabled sign-up and weak passwords say what they are; wrong-password
and no-such-account stay deliberately identical, because distinguishing them
turns the form into an oracle for which emails are registered, and in a health
app membership alone is sensitive. Unrecognised codes fall through to the
generic message, so a new Supabase error code cannot become an accidental leak.

`createAccount` also now handles the confirmation-required case explicitly: with
"Confirm email" on, `signUp` returns a user but no session, and the old code
sent that person to `/who` — a screen that could not save anything.

**Verified end to end against the live project**

Account created through the UI, not a script: consent unticked was blocked with
*"Please accept the privacy terms to continue"*; consent ticked created the
account and advanced through `/who` to `/profile`. The user exists with
`confirmed=true`, and `consent_log` holds the matching `dpdp_processing` v1.0.0
row — written in the same request that created the account, so the consent
record and the account cannot drift apart. Sign-in verified with the seeded
`demo@baymax.test`.

**Still open on this project**

- **Minimum password length is 6 in Supabase**; the app's Zod schema enforces
  10. The form is what people meet, but the database would accept 6 if anything
  ever bypassed it. Worth raising to match.

The generic credentials message is right for production — distinguishing "no
such account" from "wrong password" turns the form into an oracle for which
emails are registered, and in a health app membership alone is sensitive. But it
does mask these cases in development; a server-side log of the real reason
(no PII) would be worth adding.

**Deferred**

- Rotate the secret key and the database password: both passed through a chat
  transcript during setup.
- `DATABASE_URL` is local tooling only, read by `scripts/migrate.ts` and never
  by the app.

## Phase 4 — Memory core (D1–D3, C1–C2) · complete

**Built — the five screens**

- **Shared app shell** (`src/app/(app)/layout.tsx` + `components/app/tab-bar.tsx`).
  Home / Documents / `+` FAB / Ask Baymax / Profile, per the frames. The FAB is
  a link, not an onClick — the app's main write action must work before
  hydration. Tabs match by section (`/records/[id]` keeps Documents lit).
- **D1 records list** (`(app)/records`) — filter chips (all four fit the 393pt
  fold, measured), stats card counting the *filtered* set, recency grouping
  (Today / Yesterday / This week / This month / Earlier), severity pills,
  empty states for both "no records" and "nothing matches".
- **D2 record detail** (`(app)/records/[id]`) — file card, health-status gauge
  (SVG, decorative, the words carry the meaning), key highlights with printed
  ranges, the grounded insight card, structured/original toggle with a 60s
  signed URL and the raw text, and action tiles (Ask Baymax links ahead to
  Phase 5; Track changes and Share are disabled with a reason, as in Phase 3).
- **D3 timeline** (`(app)/timeline`) — month sections with counts, severity
  dots on the rail, day/month date column. Undated records are omitted here
  (a timeline row is a claim about *when*) but kept in D1 under "Earlier".
- **C1 scan** (`(app)/scan`) — profile picker, file/camera input (no `capture`
  attr, so the OS offers both), five-step progress that never runs ahead of the
  actual request (`settleStep` caps the display), percentage ring from real
  step progress.
- **C2 review** (`(app)/scan/review`) — per-field confidence, editable rows,
  amber "Check this" on fields under 0.7, pinned Re-scan / Confirm & Save.

**Built — the pipeline**

- `lib/records/{types,queries,grouping,filters,insight}.ts` — the data layer.
  Every query runs on the request-scoped client; none takes a user_id (RLS
  decides), and `getRecord` returns "not yours" as "not found".
- `lib/upload/strip-exif.ts` — canvas round-trip strips EXIF (GPS of the house
  the photo was taken in) **client-side**, so it never crosses the network. The
  filename is replaced too ("Ananya_CBC_Fortis.jpg" is PII in a path). HEIC and
  PDF pass through untouched — a botched rewrite is worse than metadata.
- `lib/records/upload.ts` — object keys are server-generated
  `<user>/<profile>/<uuid>.<ext>` (the storage policies match on segment 1, so
  a client-supplied name would be a client-supplied authorisation decision).
  MIME and size re-checked server-side. A failed insert removes the uploaded
  object rather than orphaning a medical record in the bucket.
- `lib/ai/mock/extract.ts` — deterministic mock extraction (seeded on
  name+size: same file, same answer, reproducible bug reports). Confidence
  routing is real: any field under 0.7 files the document as `needs_review`.
  Entities are written only at *confirm* time — a misread number must not
  start trending before a human has seen it.
- The insight card (`lib/records/insight.ts`) is rule-bearing prose: it names
  out-of-range values, defers to a doctor, and stops. Its tests assert a
  forbidden-vocabulary list (diagnose/prescribe/dose/"you have"/condition
  names) and that it never emits a number of its own. The regex guard caught
  my own first draft ("if you have questions"), which is the system working.

**The colour ruling, applied**

Extraction confidence renders in neutral grey with one amber "Check this" —
never the green/amber/red that means health severity elsewhere. The severity
text colours also had to be darkened to clear WCAG AA on their tinted pills
(sampled dot hues: safe 2.57:1, caution 1.69:1 — illegible); `--safe-text`
`--caution-text` `--danger-text` are the same hues at ≥5.2:1.

**Verified end to end**

Upload → processing → review → Confirm & Save → the document appears in D1,
D2 (3 entities with flags, severity high-risk, insight naming Haemoglobin and
MCV), and D3's July section — confirmed in the UI *and* by querying documents,
entities, timeline_events and the storage object (signed URL minted) directly.
Gate: typecheck, lint, **105 tests** (was 82), build clean.

**Recorded while building**

1. *`node:crypto` leaked into the client bundle.* C2 imported the extraction
   types from the extractor module; one runtime value (`LOW_CONFIDENCE`) was
   enough to drag `node:crypto` into webpack's client graph and fail the build.
   The contract now lives in `extract-types.ts` with zero dependencies.
2. *The frames' notification bell shows a hard-coded "3".* Shipped without the
   badge — there is no notifications feature to count, and a fake unread count
   is a lie in red.
3. *Search covers facility and doctor only* — the display title lives inside
   the extraction jsonb and matching it needs a functional index that does not
   exist yet. An honestly narrow search over one that silently misses.
4. *D2's frame copy "Consider lifestyle adjustments…" was not reproduced* — it
   is advice the record does not support; the insight card states what is
   out of range and defers to a doctor instead.

## Phase 5 — Companion (B1–B2, E1–E2) · complete

**Built**

- **B1 home** — greeting, the family switcher row, one insight, the Health
  Summary pills and the Ask Baymax panel. Everything is scoped to the active
  member: switching to Amma changes the greeting, the counts, the insight and
  the recent records together, or the screen is lying about whose health it is
  showing.
- **B2 family switcher** — the inline row and the full sheet, shared by Home and
  the Profile tab. The active member lives in an httpOnly cookie so server
  components can scope their queries by it, and is re-validated against the
  caller's own profiles on every read: a client-supplied profile id must never
  be trusted to name a row.
- **E1/E2 Ask Baymax** — grounded answers with citations that open the cited
  record, suggestion chips, and the safety gate in front of every send.
- **G1 safety escalation** — the frames' three steps, behind a hard gate.

**The safety gate**

It runs client-side, as the first statement in `send()`. Rule 2 wants
deterministic and under 200ms, and a network round trip promises neither. There
is exactly one send path, because a second way to reach the model would be a
second place to forget the gate.

Which rule fired decides what is offered. A self-harm disclosure routes to
Tele-MANAS (14416) and KIRAN, **not** an ambulance — offering one there reads as
a threat of forced hospitalisation and is a known reason people stop talking. An
overdose routes to 112/108 first with the mental health line appended, because
swallowing poison needs the body treated within minutes whatever the intent.
Nine tests pin the routing, one of which asserts the rule ids still exist in the
generated lexicon, so renaming a rule fails loudly rather than misrouting a
crisis.

Escalated questions are written to the transcript with `safety_status =
'escalated'` and no assistant reply. A safety audit that cannot see what was
said is not an audit; `messages` is append-only for this reason.

**The biggest divergence in the project so far**

The two Ask Baymax frames contain answer text that breaks product rule 1
outright:

> *"During pregnancy, Hb levels below 11 g/dL may indicate mild anemia"* — a
> diagnosis.
> *"Vitamin D3 supplement: 2000–4000 IU daily for 8–12 weeks"* — a dosage.
> *"It's common and treatable with proper nutrition and iron supplements"* —
> treatment advice.

Rule 1 is "never diagnoses, never prescribes, never gives dosages", and the
standing ruling is design fidelity **except** where it costs the safety
guarantee. So the frames' layout, bubbles, chips, composer and numbered
"Sources & citations" block are reproduced exactly; the answer content is not.

The engine states what the documents say, reports the direction of a change
between two readings, and defers interpretation. When nothing matches it says so
— `grounded: false` — rather than reaching for general knowledge, which is the
point at which a health app starts being confidently wrong. Ten tests exist to
stop the frames' copy being reintroduced.

The frames also cite journal papers (Endocrine Society, NEJM). Citations here
point at the reader's own documents instead, per the spec's flow and because a
citation the reader cannot open is decoration.

**Also deliberate**

- Step 3 of the escalation marks "Notified your emergency contacts" as
  *Completed* in the frame. Nothing is sent — there is no contact list in V1 —
  and telling someone their family has been alerted when it has not could stop
  them calling anyone themselves. It reports only what actually happened.
- The home insight card keeps the frame's shape but not its content. The frame
  shows an appointment reminder; scheduling does not exist, and inventing a due
  date for a medical test is a fabricated clinical prompt.
- Avatar rings use six non-semantic hues. The frames' rings are green/orange/
  purple, but those three mean health severity here, and a green ring around a
  face reads as a verdict on that person.

**Dropped from V1**

- **F1 pre-consult brief.** Cut deliberately, not deferred by accident.

**Fixed along the way**

1. *Sheets escaped the phone shell.* `position: fixed` resolves against the
   browser viewport; `.device-screen` now establishes a containing block via
   `transform`. This would have hit the emergency interrupt too.
2. *The migration runner had no ledger*, so every run replayed 0001 and died on
   "families already exists" — a seventh migration could not be applied at all.
   It now records each file inside its own transaction and adopts a pre-ledger
   database by checking the objects exist.
3. *A multi-row insert broke every chat message.* PostgREST builds one column
   list from the union of the rows and sends NULL for any key a row is missing,
   so omitting `citations` on the user row violated NOT NULL rather than falling
   back to the column default.

## Phase 6 — Monetisation and account (H1–H2, I1) · complete

**Quota**

Entitlement is decided server-side from the database, on the way in to the
action being gated. A limit enforced in the UI is a limit enforced for people
who do not open dev tools. The check and the increment are one operation:
reading, deciding and then incrementing separately leaves a window where two
requests both see the last remaining chat.

`subscriptions` has no update policy by design, so tier and counter writes go
through a service-role client. Every call there is keyed on a `family_id`
derived from `requireUser()` — RLS is not there to catch a mistake in that file.

**The paywall keeps the question**

Hitting the wall mid-thought and being made to retype after paying is what turns
a paywall into a toll booth. The question is held, shown back under "Your
question is saved", auto-sent on activation, and returned to the composer if the
sheet is closed instead. Verified end to end.

**No payment credentials are collected**

The frames draw a UPI-and-card chooser and that is drawn, but choosing a method
is as far as it goes. Authorisation belongs in the provider's own sheet, where
it is their PCI scope. The copy says so, and stays true when a real provider is
wired in. `activateTier` is the only thing that moves a family onto a plan, so a
real webhook calls that and nothing else changes.

**Export and delete are real**

DPDP gives people a right to their data and a right to have it erased; drawing
those buttons and wiring them to nothing is a promise the app is breaking.

Export reads through the **anon** client so RLS decides what comes back — using
the service key there would work and would be wrong, because the one place a bug
hands over another family's records is the place that hands data out. Verified:
3 profiles, 10 documents, 12 messages.

Delete removes storage objects **before** rows. The object keys live on the
document rows; deleting rows first orphans every file in the bucket with no way
left to find them — the user is told their data is gone while their medical
documents stay on disk forever. A storage failure aborts before any row is
touched. Verified on a throwaway account: every row cascaded, the file was gone,
no orphan. `consent_log` survives deliberately — it is the record that consent
was given and withdrawn, and carries no health data.

**Two frame conflicts, flagged rather than silently resolved**

1. *The free chat limit is 5, not the spec's 3.* The chat frame says "Free users
   can have 5 chats with Baymax"; frames win.
2. *The prices are ₹99 Solo and ₹249 Family.* The profile screen, both paywall
   screens and the paywall filenames all agree. The chat-limit frame's ₹499 /
   ₹899 / ₹29-a-day is the outlier and was not used.

**Not built**

- **C3 camera verdict.** Not started.
- Real payment provider, by design.

## Phase 7 — Hardening · in progress

**Done**

- **Loading, error, not-found and offline states.** An unhandled throw used to
  show Next's default page — a bare stack trace on white, on a screen that was
  showing medical records a moment earlier. The error text is never rendered:
  a database error can carry column names and row fragments. Verified against a
  production build with a deliberately incriminating message; it appears nowhere
  in the HTML. Dev *does* inline it, which is Next's overlay rather than a
  production leak, but is worth knowing before anyone screenshots a dev error.
- **Security sweep.** Every app table has RLS with real policies and no
  `using(true)`. No `console.*` in `src`. No `getPublicUrl` anywhere — signed
  URLs only, 60s. All six security headers verified live. Service-key usage
  audited: two files, both server-only, both scoped by `requireUser()`.
- **`schema_migrations` shipped without RLS** — it is created by the migration
  runner rather than a migration, so it never went through the "no table ships
  without policies" rule. Only filenames, but exposed via PostgREST to anyone
  with the publishable key. Migration 0007 makes it deny-all; verified.

**Still open**

- Playwright E2E on the four core flows.
- Lighthouse pass.
- Rate limiting on auth and AI endpoints. Quota covers free-tier AI cost; paid
  tiers and the auth endpoints are still unbounded, and a durable store is
  needed to do this properly.
- `README.md`, `SECURITY.md`, `PRIVACY_NOTES.md`.
