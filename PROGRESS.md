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

**Rule 4 revisited, 2026-07-29 — "grounded or silent" became "grounded, then general, then silent"**

Athar asked for Ask Baymax to answer both ways: from the reader's own records
when it can, and from general knowledge when it can't, rather than going silent
on anything not in a document. That is a real change to rule 4 as shipped
above — not a bug fix, a product decision — so it is recorded here rather than
folded silently into the original entry.

Rule 1 did not move. `src/lib/ai/mock/knowledge.ts` adds a small set of
hand-authored, keyword-matched general topics (exercise in pregnancy, common
lab-value thresholds, vitamin D, herbal sleep aids) written in the same
pamphlet register as everywhere else — population-level information, always
closed out with "your doctor can tell you what this means for you", never a
condition name or a number with a unit attached to the reader. `answer.kind`
(`"grounded" | "general" | "silent"`) tells the UI which happened, because each
deserves different framing — the old blanket "outside what it can see" warning
was rewritten to only fire when kind is truly silent. 24 tests across
`answer.test.ts` and a new `knowledge.test.ts` run the same product-rule check
against every topic, not just a couple of probe questions.

**Alongside it, a new capability: product-safety scenarios.** The same
conversation asked for photo-based product/food safety checks — general
assessment plus a personalized note when it overlaps with the reader's own
Health profile. There is no vision model wired into this app, so this does not
pretend to recognise an arbitrary photo: `src/lib/ai/mock/scenarios.ts` ships
five fixed, hand-written demo products (a lotion, a peanut protein bar, a
mineral sunscreen, an herbal sleep tea, an energy drink) chosen from a picker
sheet behind the composer's camera button, honestly framed in the UI as a demo
rather than disguised as general upload.

A verdict here is about the *product*, not a diagnosis of the reader — "avoid
during pregnancy" is consumer information printed on ingredient labels
everywhere, not a clinical judgement. Personalization only ever matches against
conditions the reader already declared on their own Health profile (built the
same day — see Phase 6 note below); it never infers an allergy or condition
that wasn't typed in. Verified live: the peanut protein bar returns "Safe" with
no personal note for a profile with no declared allergy, and escalates to
"Avoid" with a "For you —" note the moment "Peanut allergy" is saved to that
profile's Health profile and the same scenario is asked again. 20 tests in
`scenarios.test.ts` check every scenario against the same forbidden-language
list, plus the escalation and no-escalation paths explicitly.

Messages gained two new nullable columns for this — `attachment` (the demo
photo shown on the user's bubble) and `product_assessment` (the structured
card) — migration `0009`. Both paths still go through the same quota gate as a
text question; a product check is Ask Baymax, not a separate free feature.

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

**I1 grew into the full Profile section** — personal information, health
profile, security & privacy, notifications, language and help & support are now
real screens under `/settings/*`, matching the H/I/J frames, plus a logout flow.

- **Personal information & Health profile** edit the active profile's real
  columns. Fixed a genuine bug on the way: onboarding (A5) collected height,
  weight and blood group and silently discarded them — `saveProfile` never
  wrote them. Migration `0008` adds the columns; both screens now read and
  write them for real.
- **Notifications** persists nine toggles, grouped, to a new
  `families.notification_prefs` jsonb column — merge-patched per toggle so a
  stale client write can't blank out preferences it never rendered.
- **Security & privacy** is real content plus a working change-password flow.
  Changing a password re-authenticates with the current one first —
  `auth.updateUser` alone will change a password for anyone holding a live
  session, which is not the same thing as consent to change the credential.
- **Language and Help & support** are honest rather than decorative: English
  only with every other language shown as a real roadmap rather than hidden,
  and every "Report" / "Contact" tile opens the reader's own mail app rather
  than a form that goes nowhere.
- **Logout** clears the Supabase session (or the dev stand-in) and the active-
  profile cookie together — leaving the profile cookie set would hand the next
  signed-in session someone else's family member selection. Confirmed with a
  sheet, since it sits one row above "Delete all my data".
- Verified end to end in-browser: every row navigates, every form saves and
  survives a reload, notification toggles persist and revert on failure, and a
  full logout → sign-in cycle leaves all saved data intact.

**Two frame conflicts, flagged rather than silently resolved**

1. *The free chat limit is 5, not the spec's 3.* The chat frame says "Free users
   can have 5 chats with Baymax"; frames win.
2. *The prices are ₹99 Solo and ₹249 Family.* The profile screen, both paywall
   screens and the paywall filenames all agree. The chat-limit frame's ₹499 /
   ₹899 / ₹29-a-day is the outlier and was not used.

**Not built**

- **C3 camera verdict.** Not started.
- Real payment provider, by design.

## New mascot: Sprout — 2026-08-01

Athar: *"I don't want the robot mascot... the current mascot is very poor and is
affecting the overall vibe."* Plus context that matters more than it looks:
**the app will not ship as "Baymax"**. The name is a placeholder, so the mascot
is the one asset that has to survive the rename — it cannot be a nod to a film
character.

**The robot is gone.** Its head, torso, mitten hands and two-dot face are
deleted, not deprecated, so nothing can accidentally compose them again.

**What replaced it.** `illustrations/sprout.tsx` — an original character: one
continuous pear-shaped body with no separate head, a stem, a small leaf, and a
**heart-shaped leaf** that folds health and growth into a single glyph. A
seedling because the robot read as clinical hardware, and "a machine that reads
your medical records" is the worst possible framing for a screen a pregnant
woman opens at 2am. A seedling says the opposite: something small you tend,
that grows with you.

**On the reference.** Athar attached three "Bloom Buddy" SVGs. Those are a
commercial character set, so none of it was copied — the *language* was studied
(blob silhouette, high close-set eyes with highlights, flipper arms, flat vector
with soft shading) and every path here is authored. Shipping someone's licensed
character as the identity of a product about to be renamed and raised on would
be the expensive kind of shortcut.

**Kept in the brand violet, not the reference's green,** for a reason beyond
taste: green/amber/red carry health status everywhere in this app, and a green
character sitting beside a green "Normal" pill puts decoration and diagnosis in
the same colour.

Geometry is single-sourced — `SproutBody`, `SproutFace`, `SproutArms` — because
the last mascot drifted between screens once each surface drew its own copy.
Verified at 260px, 148px, 92px and 34px on both white and brand surfaces; it
still reads as a face at 34px. Two defects caught on the contact sheet: the
heart was clipped by the bust viewBox, and panel 1's two tilted cards crossed
the character at chest height and buried the face — panel 1 now uses panel 4's
composition (subject centred and clear, one badge, one pill).

All nine `MascotBust` call sites picked it up unchanged.

## Plan-scoped profile access — 2026-08-01

Athar spotted it from a screenshot: the account was on Solo, yet Home still
offered Ananya and Amma in the family switcher. The switcher was rendering
`familyProfiles()` — everything the account owns — with no reference to what
the plan covers.

The UI was the symptom. **Ownership was being treated as entitlement**
everywhere, and RLS could not catch it because a family shares one `user_id`:
every locked member's row is a perfectly valid row for that caller. Five ways
past the plan existed, four of them reachable without touching the UI at all:

1. `switchProfile()` — a public server action that validated ownership only.
   Posting a locked member's id rescoped the whole session to them, including
   the records handed to Ask Baymax as grounding.
2. `activeProfile()` — resolved the cookie against every profile, so a
   downgraded subscriber kept landing on whoever they last selected.
3. `/records?profileId=<locked id>` and `?profileId=all` — scoped the list
   past the plan, the second one merging every member into one page.
4. `/records/<id>` — a direct link to a locked member's document rendered it
   in full. Ananya's 20-week anomaly scan was reachable on a Solo plan.
5. `uploadDocument()` — filed documents against a profile the reader could no
   longer open, stranding them.

**Fixed** with one server-side rule rather than five checks. `selectableProfiles()`
slices the roster by `seatsFor(tier)` — the same seat count the paywall
advertises, so there is no second parallel rule to drift. `activeProfile()`,
`switchProfile()`, the records list, the record detail, the upload action and
every picker now derive from it. `getEntitlement()` is wrapped in React `cache`
so the extra tier lookup costs no additional round trips.

Locked members are **not deleted and not hidden from the account** — the data is
the reader's and upgrading restores it immediately. They render as padlocks
that open the paywall, because telling a downgraded subscriber their mother's
records are *gone* would be false; they are unreachable, which is what a plan
can honestly gate.

Verified by fetching each vector directly rather than by clicking: `?profileId=all`
returns no other member's name, `/records/<Ananya's scan>` returns not-found while
Athar's own record still opens, and `/scan` offers one profile.

## Illustration rebuild — 2026-07-30

Athar called out the mascot specifically: a "weird egg shape" around it, and the
bell on Home looking wrong. Both were real bugs, not taste — three of them,
found by reading the SVG paths rather than re-tuning gradients again.

**The mascot had no arms.** The old arm paths ran to x = -12 in a viewBox
starting at 0, so the browser clipped them entirely. It was never drawn without
arms on purpose — the geometry just put them outside the canvas. It rendered as
two stacked ellipses, which is why it read as a snowman no matter how the
shading changed.

**The "egg shape" was `bx-field`** — an amorphous blob path with a hard,
solid-filled edge sitting behind every mascot instance. A shape with a visible
boundary is a second object to the eye, which is exactly the complaint.
Replaced with `bx-glow`, a radial gradient that fades to full transparency —
there is no edge left to find, so it reads as light in the air rather than a
shape.

**White was falling off to neutral grey**, which is what a *photograph of a
grey object* looks like, not a white object in a lavender room. Real materials
pick up the colour of their surroundings in shadow. `bx-shell`'s falloff now
runs white → warm-white → lavender-grey, and a `bx-bounce` gradient brightens
the lower edge of every form the way light reflected off the ground would.
This one change carried more of the "is this actually 3D" perception than the
AO/specular layering from the previous pass.

Fixing the arms properly surfaced further anatomy problems once they were
actually visible: the legs were round-capped strokes narrow enough that only
the cap showed below the torso, which read as claws — rewritten as wide
ellipse feet. The arms tucked in close enough to merge with the torso outline
— pushed further out so there's daylight between limb and body, and given
mitten hands so a limb visibly ends in something. The bust's raised arm was
anchored beside the head and looped back up next to it, reading as a teapot
handle — re-anchored at the shoulder, below the head, swinging outward before
it rises.

**One source of geometry.** `MascotHead`, `MascotBody` and `Mascot` are now the
only places the character's curves exist; four scenes used to paste their own
copy inline, which is how the character drifted between screens in the first
place — a fix to one instance would not have reached the other three.

**The bell**, called out by name, is rebuilt as one silhouette (crown, dome,
skirt in a single path) rather than a dome shape overlapping a separate skirt
shape — two adjoining fills always show a seam where their anti-aliased edges
meet, and at 100px that seam was most of what read as "blob". A distinct lip
band (the bell's metal thickness) and a clapper were added; without the lip a
purple dome is just a purple dome, not a bell.

`HeroScene`, `UploadScene`, `PrivacyScene` and `InsightsScene` moved onto the
same `bx-glow` backdrop and the same bounce-light treatment. The welcome
carousel's art was also capped at 320px inside a screen with ~700px of vertical
room for it — enlarged to fill the space rather than float in the middle of it.

**A real bug found while verifying, not shading**: `AvatarFamily` keyed its
`<img>` list on the last 24 characters of each generated avatar's base64 data
URI. Every generated SVG closes with the same tags, so the tails were
identical — React logged a duplicate-key warning on `/who` and the family
switcher. Keyed on array index instead; the cast is fixed-length and
fixed-order, so index is stable.

172 tests pass (unchanged — this was all illustration, not logic), typecheck/
lint/production build clean.

## Design review pass — 2026-07-30

Athar reviewed the build against the frames and raised six things, plus a
follow-up on avatars. All are done; the notable findings are below.

**The bug behind "the switcher tray is not working"**

The tray was rendering, but almost entirely *behind* the page. `stagger` puts an
`animation` on every direct child of a screen, and an element with a filling
animation on opacity/transform gets its own stacking context — so the sheet's
`z-40` only ever competed inside the one section that owned it. Against its
siblings the browser fell back to paint order, and the switcher is the second
section on both Home and Profile, so all six sections below it drew over the
top. The logout sheet looked fine purely because it happens to be last.

Fixing it properly needed two changes:

1. **A `Sheet` primitive that portals** into `.device-screen` — not
   `document.body`, because inside the desktop frame a `fixed` sheet must resolve
   against the simulated 393x852 display or it spills out of the phone. Below
   480px that element is `display: contents`, so the same portal resolves
   against the real viewport, which is correct on a device. Every sheet now uses
   it (switcher, add-member, paywall, product picker, logout) and gets Escape-to-
   close for free.
2. **Splitting the device frame.** `.device-screen` was both the transformed
   containing block *and* the scroll container, and a `fixed` child of a
   scrolling containing block scrolls with it — so sheets slid off once the page
   was scrolled. `.device-screen` is now a non-scrolling clip box; a new
   `.device-scroll` inside it does the scrolling. This was a latent bug in the
   frame, not something the portal introduced.

**Onboarding**

A4's two cards never lined up because the radio sat inside the text column with
`ml-auto` — its position depended on the title's length — and the two art
clusters sized themselves, so the titles started at different x. The radio is
now absolutely positioned in the card corner and the art sits in a fixed 92px
column. Step dots added.

A new **A6 plan step** (`/plan`) closes the gap Athar identified: family access
is genuinely gated on the Family plan, so choosing "it's for my family" and then
landing on Home meant discovering you cannot add anyone. It asks at the point the
choice was made, and is **skippable** — "choose family" is not consent to be
charged, and the skip is a real button rather than a faint link. The choice rides
in a 24h cookie (`lib/auth/audience.ts`) that is explicitly a routing hint, not a
fact about the account; what the account can do is always the subscription tier.

**Three plans, and the Daily pass**

The `micro` tier had been in the schema since 0004 and wired to nothing. It is
now the ₹29/day pass Athar asked to include, which resolved the old frame
conflict cleanly: the outlier frame's *product idea* is adopted, its ₹499/₹899
pricing still rejected.

A pass that lasts a day needs an expiry, so `subscriptions.expires_at` was added
(0010). The trap here is that `isUnlimited(tier)` is true for `micro`, so an
elapsed pass would have granted unlimited chats forever — the expiry check lives
in one function that **both** the read path and `consumeChat` call, because if
those two disagreed the paywall and the gate would fight. `activateTier` also
nulls the expiry explicitly for the monthly tiers, or upgrading from a dead pass
would inherit its dead date.

**The chat wall is now in the chat**

Per the frame, hitting the limit renders a card in the transcript rather than
only a modal, and the tray opens on all three plans. The card is deliberately
*sticky*: dismissing the tray used to leave a composer that looked functional but
refused every send. It clears only when a plan activates. The product-photo path
was also opening a dead red error telling people to go find the Profile tab;
it now opens the same tray.

**Family section, and add-member**

The Profile screen gained the H-Solo frame's Family block: blurred locked slots
and a plan pitch on free/solo, real members and a working "Add member" on
Family. Two calls worth recording — the locked faces are **generated
placeholders**, because blurring a real member's avatar to sell a plan means
using their data as bait; and the reader's own profile is never locked, because
they already have it.

`addFamilyMember` gates on the entitlement read from the database, not on
anything the sheet sent — the form is only drawn for family tier, but "only
drawn for" is not a limit for anyone who can post a form. The database's own
6-profile trigger stays the backstop.

**One avatar system**

Athar's follow-up: the "who is this for" art was grey figure silhouettes while
every profile row used generated faces — two visual species of person in one
app. `lib/profiles/avatar.ts` is now the single renderer (`faceDataUri`), with a
fixed illustrated `castFaces()` for art that depicts nobody in particular. The
onboarding cluster had its own duplicate `createAvatar` call, which is exactly
how the two drifted; it is gone.

**Help & Support writes real tickets**

The frame's "Report an issue" button went nowhere. It now files to a new
`support_tickets` table (0010) and shows the reference back. The table holds **no
health data** — a category, a title, the user's own words, and the app version;
support staff diagnosing a crash have no business reading lab values.

Tickets hang off `user_id`, not `family_id`, so account deletion did **not**
cascade to them. That would have left someone's own words behind after they
asked for everything to go, so `deleteAccountData` removes them explicitly and
`exportAccount` includes them.

**A first-tap bug found while verifying**

All three of the chat's starter chips ("What do my recent reports say?", …) are
overview-shaped, and the engine only matched measurement *names* — so the first
thing most people tap came back "I could not find anything" with their records
sitting right there. Added an overview intent that answers from the documents
themselves (what exists, when, from where, what the report flagged) with
citations, checked before the general-knowledge fallback but after the entity
matcher, so "how is my haemoglobin" still gets the specific value.

The product-rule guard also had a false positive worth fixing rather than
papering over: `/\bdiagnos/i` matched "Vijaya **Diagnos**tics", a lab's name
echoed verbatim from the user's own document. It now targets the act
(`diagnose|diagnosed|diagnosis|diagnosing`), not the letters.

172 tests pass, production build clean.

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

## Design pass and first native run — 2026-09-29

Everything before this section was verified in the Expo **web** preview. This
session was the first time the app ran on iOS, and two of the bugs below were
invisible in a browser by construction. That is the headline: the web preview
is a fast way to check copy and composition, and it cannot be trusted for
layout, routing on cold start, or anything native.

### Onboarding, rebuilt

**The welcome carousel is three panels, and asks for nothing.** It was four,
and the second asked which season of life you are in — before an account
existed. The answer had nowhere to go, so it went to local storage to wait for
a profile that might never be created; anyone who abandoned at sign-up had
answered a personal question into a drawer. It now lives at `/journey`, one
screen after the profile is made, writing straight to the row. The kv bridge
is deleted.

Order: sign-in → who → profile → journey → first-upload → plan.

**Profile setup could not save.** A plain INSERT with `is_primary: true`
against an account that already had a primary profile raised 23505 (migration
0013's unique index) and reported it as "We couldn't save that" — which reads
as *your data is wrong* and sends people to edit fields that were fine. It
updates the existing primary now and only inserts when there is none. Two more
bugs surfaced in the same file: height, weight and blood group were validated
and then left out of the insert entirely, and the phone number had no column at
all (0020 adds it). The phone rule was also not global — no parentheses, no
dots, and a length counted in characters, so `+44 7700 900 123` passed and
`+44 (0) 7700 900 123` failed for the same number. It now validates 7–15
digits, E.164's maximum.

**A face you choose.** Every avatar was derived from the profile uuid, so a man
setting up his own profile was handed a woman's portrait with no way out.
`/who` offers ten illustrated faces when the account is "for me"; the choice
travels to `/profile` as a route param and lands in the insert. `avatar_seed`
(0019) stores it, null keeps the old behaviour, and the seed is threaded
through the switcher and the records list together so nobody has two faces on
two screens.

**First-upload's button did nothing.** It was `disabled`, with a comment saying
the pipeline landed in Phase 4 — it had, weeks earlier, at `/scan`. Every route
now opens `/scan` with a `source` param. `/scan` gained PDF support via
`expo-document-picker`, because a year of history is not a photograph.

### Content that follows the reader

Suggested questions on Home and the chat's empty state were hardcoded and led
with "Is this safe during pregnancy?" — shown to somebody who had told us they
track their weight. Both surfaces now draw from `promptsFor`, keyed on the
journey and the conditions the reader typed, and **never** on anything read out
of a document: surfacing diabetes prompts because a lab value came back high is
a diagnosis dressed as a suggestion. A test asserts that across every journey ×
condition combination no prompt asks whether to take something, change a dose,
or whether a result is bad — a suggested question is a promise the app will
answer it.

Migration 0021 adds six articles (BMI, lipids, thyroid, blood pressure,
childhood vaccinations, caring at a distance) so the rail has something to be
dynamic with. Same standing rule as 0017: explanation not advice, sources
cited, **and all nine still need a clinician's read before any store build.**

### About, and the paywall

About was rewritten against the category's playbook — benchmark score, user
count, testimonials — which we cannot run honestly, having none of the three.
It trades borrowed authority for verifiable authority: every claim on the page
can be checked inside the app in a minute. New sections: how an answer is
built, what to bring it, and an FAQ that leads with *"Can Baymax replace my
doctor?" — "No, and it is not built to."*

The paywall was rebuilt twice. The first pass took the right structure from the
reference paywalls (one decision, one action; unit pricing; a computed saving;
a what-happens-next timeline) and the wrong surface — three bordered cards each
with its own shadow, badge, divider and radio. It is one container with
hairlines now, no shadows, colour in two places. Refused throughout: countdown
timers, invented strikethroughs, uncheckable percentages, and a decline button
written to shame.

**Free chats are now DAILY** (0022). Five a month is not a trial of a health
companion — one worrying result spends all five in an evening and the app has
nothing to offer for four weeks.

### The first native run

`npx expo run:ios` fails on this machine with a CocoaPods Unicode error unless
the locale is set: `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8`. The repo's own
`pods` script already does this; `expo run:ios` does not.

**Two bugs the browser could never have shown:**

- The journey tiles rendered as two full-height columns with four tiles pushed
  off the bottom. A wrapped flex row stretches its items to the tallest in the
  line; on the web that produced six equal tiles because the line's cross size
  came from the content, and in Yoga it resolved against the centred `flex-1`
  parent. `items-start`, plus removing an `h-full` whose percentage height had
  no definite parent.
- Every launch walked a returning user through onboarding. The splash always
  replaced to `/welcome` and sign-in always replaced to `/who`, each hard-coded
  in its own screen. Neither was wrong when written; they rotted because **a
  returning user is the one case a developer with a fresh database never
  tests.** `resolveLanding` asks the question once: no session → carousel,
  session without profile → onboarding, session with profile → home. It fails
  towards onboarding, because sending someone to an empty home reads as though
  their records are gone.

### Open after this session

- The demo account has a **duplicate "Athar" profile**; the seeded documents
  hang off it rather than the primary, so Ask answers "nothing in your records"
  on the primary profile.
- The product checker answers from **five mock scenarios**, not a real
  ingredient lookup. About describes what it does rather than "scan anything",
  but this must not ship as-is.
- The nine knowledge articles need a clinician.
- Still no test of sign-out → sign-in, or of a session revoked server-side.

## Onboarding redesign — 2026-09-29 (cloud session, not yet seen on a device)

Same flow and data rules, new surface: splash → welcome (3 panels) → sign-in →
who → profile → journey → first-upload.

**Type.** Inter only. Headlines are Inter SemiBold (600) with tight tracking.
Nunito Black was tried first and rejected the same day as far too heavy; the
owner picked SemiBold Inter from a side-by-side of four options. `src/theme/type.ts`
names the font FILE in every style, because on iOS `fontFamily:
"Inter_400Regular"` plus `fontWeight: "700"` does not select the bold file. The
rest of the app still relies on `font-bold` classes and has the same problem;
only onboarding is fixed so far.

**The setup quest.** The four steps after sign-up share one progress bar in
the header and a "Step 2 of 4 · About you" label in the content. `/plan` is not
a step: it only appears for family accounts, and a bar that is sometimes five
long and sometimes four lies to half its readers.

**Cheeku reacts.** `CheekuSays` answers each choice on who and journey. The
reactions are warmth and what will be kept, never a statement about the
reader's or a relative's health. Profile has a live "x of 8" meter that counts
fields filled on the form and claims nothing more.

**Copy is written for India.** Mummy-Papa, WhatsApp forwards, the almirah. No
Hindi beyond words used in English conversation, nothing about money, and the
old rule still holds: every example asks the app to explain, read back or
prepare, never to judge a result.

**Bug fixed in passing.** Profile collected an email address and never saved it
(`profileSchema` has no email). The field is gone; sign-in already has it.

**Motion** lives in `src/components/onboarding/motion.tsx`: bubbles pop from
their tail corner, the mascot bobs, "typing" precedes a reply, bars fill. All of
it renders its final state under reduced motion.

**Needs a device check:** welcome swipe (PanResponder), `transformOrigin` on the
bubble pop, the sliding segmented control on sign-in, and the headline weights.

## Home redesign — 2026-09-29 (cloud session, not yet seen on a device)

Rebuilt twice in one day. The first pass (dark violet Ask card, a "Book with
Cheeku" tile row) was rejected by the owner, who pointed at a service-app
reference ("Smart Home, Smooth Services") for the look: editorial headline with
an italic accent, round glass controls, a search-shaped input, one pastel hero
card with floating glass pills, filter chips over soft pastel list cards.

Order: profile chip · bell → headline → ask bar → Cheeku card → Book care →
Worth knowing pills → Health file row.

- **The family switcher is the profile chip.** It names whose health the screen
  shows ("Good evening, Athar" or "Viewing, Mummy"), shows the other members'
  faces, and opens the family tray. The inline avatar row is gone from Home.
- **Glass and gradients without native modules.** `ui/glass.tsx`: translucent
  white, a bright rim and a wide soft shadow instead of `expo-blur`, and SVG
  gradients via the already-shipped `react-native-svg` instead of
  `expo-linear-gradient`. No new development build needed.
- **Headline** is Inter Medium with an Inter Medium Italic violet second line
  (`Inter_500Medium_Italic`, same font package).
- **Cheeku card**: the status pill ("2 to review" / "All in range") is the only
  semantic colour on Home. The memory line is a real count for the active
  member. "Start a chat" opens /ask; the ask bar carries a typed question there,
  where the safety gate runs. The mic says voice is coming soon.
- **Book care** (roadmap phases 2–3): filter chips, three pastel cards under
  "All" with "Show 3 more", each opening an honest coming-soon sheet with a
  per-service Notify me (`cheeku.notify`, device only). No invented doctors,
  ratings, prices or slots, and no specialist inferred from records. Pastels
  avoid green, amber and red.

**Needs a device check:** SVG gradient rendering behind rounded, clipped cards
on Android; the fading placeholder over the input; the glass shadow on
Android, which only reads `elevation`.

## Doctor booking, chat-led — 2026-09-29 (preview, sample data, not seen on a device)

Home → Book care → **Doctor consult** now opens a working flow; every other
service is still "coming soon".

`/book/consult` → `/book/doctors` → `/book/slot?id=` → `/book/confirmed`

- **The conversation is scripted, not generated.** Cheeku asks: who it is for,
  the area of concern (chips), details in their own words, since when, how much
  it affects the day, what's been tried, whether to share recent reports. The
  answers become a **pre-consultation note** shown for review before booking.
- **The safety gate runs on every free-text answer**, on device, with the same
  `detect` the chat uses. `escalate` stops the flow and opens the emergency
  screen (verified in the browser: "severe chest pain and can't breathe" shows
  112/108 and no doctors). Tier-2 shows the caution note and continues.
- **No triage.** The reader picks the area; Cheeku names the department that
  handles it and always offers a general physician (a test asserts it). Nothing
  in the details, duration or impact answers influences the suggestion — those
  go only into the note for the doctor.
- **Two booking mechanics.** Online: 15-minute video slots. Clinic: half-hour
  OPD arrival windows with a token at the desk, and the OPD hours shown, because
  that is how most Indian OPDs work.
- **Sample data, labelled on every screen.** `lib/booking/catalog.ts` holds
  eleven invented doctors. No star ratings or review counts: an invented rating
  is a fabricated trust signal. Faces are illustrated (`lib/booking/faces.ts`)
  with calm traits pinned. Confirming books nothing and charges nothing.
- **Draft state** is a zustand store, in memory only, never persisted: it holds
  what somebody said about their health.

**Fixed in passing (web preview):** every mascot shared SVG gradient ids, and on
web `url(#shell)` resolves to the first match in the document — often inside a
hidden, still-mounted stack screen — so later mascots rendered washed white.
Each drawing now prefixes its ids (`sprout.tsx`).

**Also learned:** a `Pressable` with both `className` and a function `style`
loses its NativeWind styles on web; those buttons rendered invisible. The
booking screens use plain style objects for pressable buttons.
