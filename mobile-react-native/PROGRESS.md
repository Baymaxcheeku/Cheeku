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

## Appointments and the app-wide redesign — 2026-09-29 (cloud session)

**Appointments (new).** Bookings are saved on the device (`lib/booking/
appointments.ts`, SecureStore via `kv`, capped at 8): doctor, time, mode, for
whom and the area of concern — never the symptom note. `/appointments`
(Upcoming / Past) and `/appointments/[id]` (countdown, Join call that opens 15
min before and says when until then, clinic address and OPD rule, Get
directions, Reschedule through the slot picker, Cancel with confirmation,
"Prepare questions with Cheeku"). Entry points: an Upcoming card on Home above
the Cheeku card (with Join on the card when the room is open), "Your care"
tiles on Profile, and "View appointment" after booking. Not a tab: most people
have none or one. Preview only — no video room exists; the Join button says so.

**Redesign, everywhere, in the Home language.** Shared primitives in
`components/ui/screen.tsx` (Backdrop, ScreenHeader, PageTitle, PillButton,
Portrait) and `components/ui/glass.tsx`.

- Tab bar: a floating glass pill with a dark + disc; labels Home, Records,
  Ask Cheeku, Profile.
- Tokens: `shadow.e1` is now the soft violet glass shadow and cards are 24pt
  round, so every card in the app moved with it.
- Settings chrome (all sub-screens): backdrop, glass back button, big title
  with a glass icon tile, glass panels, ink Save. Security had its own header
  and was converted by hand. Grey uppercase section labels are sentence-case
  semibold everywhere in settings.
- Profile tab, Records tab and cards, record detail, health file, Ask Cheeku,
  upload, article, plan: see the commits of this date.

**Colour rule enforced in four more places.** Processing status on a record,
finished upload steps, plan feature ticks and the Save confirmation were
green; green means a health result, so they are violet now.

**Not seen rendered:** Ask Cheeku, upload, the Profile tab and Home with real
data all need a signed-in account; they typecheck, lint and were built, but
the browser preview here can only reach screens that do not query Supabase.
The whole mobile package now lints clean.

## Notifications, end to end — 2026-09-30 (cloud session, not yet seen on a device)

The bell used to open a bottom sheet listing records that happened to be
flagged, derived on the phone. It could never say "your report is filed",
"Amma was added", "your plan changed" or "the service you asked about is live",
because none of those show up in a list of documents. Tapping a row ignored
whose record it was, and "Notify me" on the Book care cards saved to the phone
and told nobody.

**The model now.** One inbox table, `public.notifications` (migration 0024).
Events write rows at the moment they happen:

| Event | Written by | Row |
| --- | --- | --- |
| Report filed / needs a check | trigger on `documents` | "Lipid profile is filed" / "Quick check on …" |
| Values outside the printed range | trigger on `entities` (one per document) | "Some values in … need a look" |
| Review confirmed | same trigger | marks the "Quick check" row read, no new row |
| First profile / family member added | trigger on `profiles` | "Welcome to Cheeku AI" / "Amma is in the family now" |
| Plan on / ended | trigger on `subscriptions` | "Family plan is on" / "You're back on the Free plan" |
| Support ticket closed | trigger on `support_tickets` | "We've closed your support request" |
| Service launched | `announce_service_launch()`, run by the team | "Dietitian consults is live on Cheeku" |
| Booked / moved / cancelled | the app (appointments live on the phone) | "You're booked with Dr …" |
| Password changed | the app, after the change succeeds | "Your password was changed" |

**Why triggers, not the app.** Same reasoning as the entitlement triggers: a
client that chooses to write "your report is filed" is a client that can
forget to, or invent one. RLS lets the app insert only the four device kinds,
and column grants let it change only `read_at` and `dismissed_at`. Tested
against a scratch Postgres 16 with every migration applied in order: forged
kinds, rows for another user, off-app routes and title rewrites are all
refused; dedupe keys make every writer idempotent; the backfill creates unread
rows only for the last 30 days.

**The inbox is a record; preferences only govern the buzz.** Nothing is ever
hidden from the inbox by a switch. The Notifications settings screen was cut
from nine switches to six that each map to messages the app really sends
(the four for daily check-ins, insights, invitations and tips had nothing
behind them). Retired keys stay in the stored JSON so older builds still parse.

**Lock screen privacy.** Push text never carries the row's title. It is one
generic line per category ("Cheeku has an update on a report"); the details
wait behind the app lock. Appointment reminders say "video call" or "clinic
visit" and a time, never the doctor or the department (tested).

**Delivery.**
- Appointment reminders: local notifications via `expo-notifications`, a day
  before (moved to 8 pm the evening before if it would land 10 pm to 7 am), an
  hour before, and when the call room opens; clinic visits get "2 hours to go"
  instead. Resynced in full whenever the appointment list or the switch
  changes, so a reminder can never outlive its booking.
- Remote push: `supabase/functions/push-dispatch` (Deno) is called by a
  Database Webhook on insert, checks the category's preference, sends via
  Expo's push API and prunes dead tokens. Tokens are registered through
  `register_push_device()` so a phone that changes accounts moves cleanly.
- In-app: Supabase Realtime streams new rows into the cached inbox; the bell
  badge pops and a glass banner slides down (not on the inbox itself).

**Routing.** Every tap, whether from the inbox, the banner or the phone's own
notification (including a cold start), goes through `useOpenNotification`:
mark read in the cache, navigate in the same tick, and switch to the family
member the row is about in the background (PLAN.md rule 4). A member the plan
no longer covers opens the plan chooser instead.

**Snappiness.** One cached query feeds the bell, the badge and the screen, so
the inbox paints in its first frame. Read, unread, mark-all and remove are
optimistic with rollback. Rows respond on press-in (tint and a 0.99 scale).
The notification screen's push animation is 240 ms. The inbox is deliberately
NOT persisted to disk (titles name reports and doctors).

**The review loop is closed.** Record detail now has "Looks right, file it" for
documents waiting on a check, which is what the "Quick check" notification
asks for; before this there was no way to complete it.

**Before this works on the real backend:**
1. `npm run db:migrate` from the repo root (migration 0024).
2. A new development build (`expo-notifications` is a native module).
3. For remote push only: EAS project id in `app.json` (`extra.eas.projectId`),
   APNs/FCM credentials in EAS, `supabase functions deploy push-dispatch
   --no-verify-jwt`, `supabase secrets set PUSH_WEBHOOK_SECRET=…`, and a
   Database Webhook on `notifications` INSERT sending header
   `x-webhook-secret`.

**Not verified here:** anything on a device. The inbox, menu, banner and
settings were checked in the web export with sample data only. Look at: the
inbox with real rows, long press on iOS and Android, the banner over a pushed
screen, the permission primer on first open, a reminder firing and its tap
opening the appointment, and a cold start from a notification tap.

## Family: tray, adding, removing, switching, and the three plans — 2026-09-30 (cloud session, not seen on a device)

**What was wrong.**
- The family tray was a plain list, and it looked the same on every plan.
  Free and Solo accounts got a switcher with nothing in it to switch to.
- Adding someone was one sheet: type "Mother" into a text box, and get a face
  chosen by dice.
- Nobody could be removed, short of deleting the whole account. The database
  would also have let the app delete the account holder's own profile.
- Switching member refetched everything before anything moved, so each screen
  caught up on its own schedule.
- The Ask tab stays mounted, so after a switch it kept showing the previous
  person's chat under the new name, and would have answered from the wrong
  file (rule 4).

**One family query, one switch.** `lib/profiles/family.ts`
- `useFamily()` is the `home-context` query every screen now shares.
- `useSwitchMember()` writes the new member into that cache first, so every
  screen reading it re-renders in the same frame. Then it stores the choice and
  marks everything member-scoped as stale (`MEMBER_SCOPED`).
- Opening the tray prefetches every member's records, so the switch lands on a
  full screen.
- Home keeps the previous list up while the next loads instead of flashing
  empty, and shows a short "Now viewing Amma's file" pill.
- The Ask tab starts a fresh conversation when the member changes.
- Notification taps use the same switch.

**The three plans.**

| Plan | Chip on Home | Tap opens | Plan screen |
| --- | --- | --- | --- |
| Free | your face + two dashed seats + a plus | "Bring your family along" sheet, Family at ₹249 | Solo and Family as upgrades |
| Solo (and Daily pass) | same | "Make room for your family", upgrade for ₹150 more | Family up, Free down |
| Family | your face + two family faces | the tray: face cards, switch, add, manage | Solo and Free as downgrades that pause named people |

**Plan changes.**
- Every change goes through one sheet that reads out the consequences in names:
  "Amma and Ananya are paused. Nothing is deleted." / "Amma and Ananya come
  back, files and all" / "Chats drop to 5 a day".
- Anything that starts a new purchase goes to checkout; the paywall now opens
  straight at checkout via `startAt`. A step down between subscriptions, or to
  Free, happens on the sheet.
- The logic is `planChange()` in `family-plan.ts`, with tests.

**Adding someone** (`/family/add`) is three steps and a hello:
1. Pick the relationship with one tap.
2. Name and face. A live card at the top fills in as you go.
3. Date of birth and sex, both skippable.

Then comes the hello screen, with buttons for the member's first report and
for switching to them.
- No face is pre-picked. A random first pick once handed "Mother" a bearded
  face, so skipping the pick rolls one at save time, and the hello screen shows
  what was saved.
- The `avatar_seed` check (0025) only allows the app's own catalogue faces.

**Removing someone** (`/family/[id]`).
- The confirm sheet names the person and how many reports they have before
  anything happens.
- Storage files are deleted before any row. If that fails, nothing else is
  touched. Then a single profile delete cascades their documents, values, chats
  and notifications.
- An inbox line is written: "Amma's health file was removed. If this wasn't
  you, change your password."
- The account holder cannot be removed; migration 0025 refuses it in the
  database too. Nor can a profile be re-parented or promoted to primary.

**Paused members.**
- In the tray they have no name or face (unchanged rule: never sell against
  someone with their own data).
- In Manage family they are named, because there the reader is deciding what
  to do about them.

**Migration 0025** (tested on a scratch Postgres 16 with all migrations): the
primary-profile guard, the avatar check, the `family_removed` kind, and
plan-change notifications that say how many members were paused. Paste
`supabase/manual/0025-sql-editor.sql` into the SQL Editor, or run `db:migrate`.

**Not verified here:** anything on a device. Look at: the tray on a Family
account (switch speed, check landing before close), the chip and upsell on a
Free and a Solo account, the add flow with the keyboard up, removing a member
who is currently being viewed (should land on your own file), a Family to Solo
downgrade (tray shows paused cards, Manage family names them), and Ask
clearing after a switch.

## Members: faces for every age, real photos, health basics, past reports — 2026-09-30 (cloud session, not seen on a device)

**Faces for the whole family** (`lib/profiles/faces.ts`).
- The picker was ten adults in the `micah` style. That style cannot draw a
  baby or a grandparent at all, and the ICP is exactly those people: expecting
  and new parents, fertility couples, caregivers of diabetic parents, diaspora
  children, health optimisers.
- The new catalogue has 24 faces in the `personas` style, grouped Little ones
  (a pacifier, a sleeping newborn), Kids, Grown-ups and Elders (grey bun and
  glasses, balding with a moustache, wrinkles). Skin tones sit in the South
  Asian range, and vary.
- Faces are grouped by life stage, never by gender. The tab opens on the stage
  the relationship suggests (a Grandparent opens on Elders).
- Old `p1`–`p10` ids map to their nearest new face, so nobody's pick vanished.
  Faces derived from an id use the same style, restricted to grown-up looks.

**Real photos** (`lib/profiles/photo.ts`).
- Take a photo or choose one, square-cropped. It is re-drawn at 512 x 512 as a
  fresh JPEG, which drops the EXIF location data, and stored privately at
  `<user>/<profile>/avatar-<uuid>.jpg`.
- Migration 0026 only accepts a key under the owner's own folder for that
  profile.
- Shown through hour-long signed URLs, signed in one batch. The avatar falls
  back to the drawn face if a link has expired.
- Replacing a photo deletes the old file. Removing a member or deleting the
  account deletes their photos too.

**Adding a member is five steps.**
1. Who
2. Name and look
3. About them (the age shows as you type)
4. Health basics
5. Past reports

Nothing is written until the last tap, so backing out leaves no half-made
person. Then the profile is created first and photo, health and reports are
filed against its new id. The hello screen says exactly what landed, and names
anything that didn't.

**Health basics** (`components/family/health-editor.tsx`,
`lib/profiles/health.ts`): one editor, used by the add flow, the member page
and Health profile.
- Conditions are chips chosen by age (a baby's list is jaundice and birth
  weight, a grandparent's is sugar, BP and arthritis), plus "Add another".
- Allergies have a column of their own (0026) and a "None known" option.
- One row per medicine; blood group; height and weight.
- The suggestions are there to save typing. The app never infers that anyone
  has anything.
- Reads and writes fall back gracefully if 0026 hasn't run yet.

**Past reports** (`lib/records/bulk-upload.ts`).
- Snap, Photos (multi-select) or Files (PDFs), up to ten at a time.
- Each file goes through the same path a single scan does: EXIF stripped,
  then `uploadDocument`, which re-checks ownership and plan cover.
- Files upload one at a time, each with its own status. A failed one says why,
  and can be retried from the member page without re-picking the rest.

**Every record stays with its member.**
- Record detail switches to the report's owner when opened, so Ask and every
  screen behind it follow the record. It also shows "In Amma's file".
- Scan took its default member from its own cached query, which could still
  name the previous person right after a switch, so a report could be filed
  under the wrong member. It now reads the shared family cache, which moves in
  the same frame as the switch.
- The records tab reads the same cache and clears a member filter left over
  from the previous person.
- The member page lists that person's own reports: the same cache entry Home
  uses. Opening one switches to them first.
- Personal information no longer shows the account's sign-in email on a family
  member's profile, where it read as theirs.

**Apply:** migration 0026 (`db:migrate`, or paste
`supabase/manual/0026-sql-editor.sql` into the SQL Editor after 0025).

**Not verified here:** anything on a device. Look at:
- The camera and library pickers with the square crop.
- A photo showing in the tray and on Home, and falling back after an hour
  offline.
- Multi-select in Photos.
- Ten reports uploading on a slow connection.
- Keyboard behaviour in the medicines rows.
- Opening Amma's report from her page, then Ask (it should be about Amma).

## Home polish, lab tests end to end, provider profiles and reviews — 2026-09-30 (cloud session, not seen on a device)

**Brand wordmark.**
- "Cheeku" and "Cheeku AI" are now always set in Instrument Serif Italic, in
  brand violet, through `<Brand />` and `brandify()` (`components/ui/brand`).
  One classic italic among the Inter works like a logotype across every
  screen.
- A codemod wrapped every literal mention in on-screen JSX text. The shared
  components (ScreenHeader, PageTitle, SectionTitle, PillButton, settings
  chrome, notification rows, tab bar) brandify the strings they are given.
  On ink and violet buttons the wordmark switches to a light violet so it
  stays visible.
- Strings built at runtime inside other screens still render plainly. Wrap
  them in `brandify()` when touched.

**Home.**
- The generic AI sparkle in the ask bar is replaced by a small Cheeku.
- The ask bar's two rotating hints were stacking half a line apart while they
  cross-faded (seen on a device). Both are now absolutely placed in the same
  spot.
- "Doctors & labs open" is a citrus-lime pill with a pulsing dot. The lime is
  deliberately far from the semantic green (#23af5f), because green means
  "healthy" in this app (rule 3).
- Lab tests are live; the service tags now read "Live".
- Health insurance is added as a locked module with its own filter. It opens
  the coming-soon sheet with "Notify me".

**Lab tests at home** (migration 0027, `lib/labs`, `app/labs/*`).
- Screens:
  - Search that understands everyday words (sugar, hair fall, dadi).
  - Suggestions for the member being viewed, from their health profile.
  - "Got a doctor's slip?" to attach a prescription.
  - Category chips, packages as cards, tests as rows, and a sticky cart bar.
  - Test detail, in the reference layout.
  - Choose a lab: only labs that do everything, cheapest total first.
  - The lab's own profile, with its reviews.
  - Booking: whose sample, which day, which window, the address and the bill.
  - A tracker with a timeline, and the list of all lab bookings.
- The backend does the real work:
  - The catalogue and prices live in tables.
  - `create_lab_booking` prices the order itself and checks plan cover. The
    app cannot insert a booking, so it cannot choose a price.
  - Status changes write to the inbox.
  - When results are "ready", they are filed as a real `documents` row with
    `entities`, under the right member. They appear in Records, the health
    file and Ask exactly like an uploaded report.
  - Tested in scratch Postgres: a forged price is refused, a lab that lacks a
    test is refused, 10 values filed for Shakeela, cancel works, and the
    clock-based sync walked a past booking through all 4 stages.
- There is no partner integration yet, so `sync_lab_bookings()` moves bookings
  by the clock. `advance_lab_booking_demo()`, the tracker's "Preview: skip to
  the next step", steps one stage at a time for demos. It is gated by
  `app_flags.demo_labs`: TURN IT OFF BEFORE LAUNCH.
- Local reminders go out half an hour before a fast must start, naming the
  exact time, and half an hour before the collector's window.
- Lab-delivered records have no scanned page. The record screen says so
  instead of offering an original that doesn't exist.

**Sample data is labelled as sample.**
- The five lab partners use real brand names, at the owner's request, with
  illustrative prices and turnaround times, and every seeded review is
  flagged `is_sample`.
- Each screen carries a "Preview · sample" line, and each partner page says it
  is not a live partnership.
- Replace the seed with partner feeds before launch.
- Seeded results are always within the printed range, so a demo never
  frightens anyone.

**Ratings and reviews** (`provider_reviews`, `provider_ratings` view).
- Everyone signed in can read reviews. A person can write one per provider,
  editable, and can never mark it as a sample.
- A review can be written after results from a lab, or after a past
  appointment with a doctor.
- Stars are ink, not gold: gold sits too near the caution amber.
- The account export includes only the reader's own reviews (RLS alone would
  have exported everyone's). Account deletion removes lab bookings and
  reviews.

**Doctor profiles** (`/book/doctor/[id]`).
- A portrait hero, rating, Video and Clinic tiers with fee and next slot
  (like the reference's pricing chips), and facts.
- An "About" paragraph built only from the listed facts, the clinic card, and
  reviews.
- A sticky price and Book button. Tapping a doctor card now opens the profile;
  the card's own button still books directly.
- On web the portrait was invisible under the gradient: the same stacking
  issue recorded earlier, fixed with `zIndex`.

**Apply:** migration 0027 (`db:migrate`, or paste
`supabase/manual/0027-sql-editor.sql` after 0026).

**Not verified here:** anything on a device. Look at:
- The serif wordmark on iOS and Android at small sizes (tab bar, notification
  rows).
- The mascot in the ask bar.
- The labs flow with the keyboard up on the address field.
- Lab reminders firing.
- A report opening from the tracker.
- Reviews posting.

## Avatars: the owner's illustrated set replaces the generated faces, 2026-09-30 (cloud session, not seen on a device)

The generated faces (`micah`, then the 24-face `personas` set) looked cheap
next to the rest of the app. The owner supplied fifteen flat vector portraits
in one hand-drawn style, and those are now the only faces a person can pick
or be given.

**Assets.** `mobile-react-native/assets/avatars/v01.png` to `v15.png`, 384px,
cut from the supplied sheet onto transparent backgrounds (the sheet's beige
circles and their anti-aliased rim removed) so each sits on the app's own
pastel. About 1.3 MB for the set. They load through `import`, and
`images.d.ts` declares `*.png` because `expo-env.d.ts` is gitignored and a
fresh checkout's typecheck would otherwise fail.

**Ids.** The new faces are `f25` to `f39`, which the 0026 check on
`profiles.avatar_seed` already accepts, so there is **no migration**. Every
older id (`p1`–`p10`, `f01`–`f24`) maps in `faces.ts` LEGACY to its nearest
face by hair, age and look, so nobody's pick vanishes. Anyone who never
picked still gets a stable face derived from their profile id, from the same
fifteen.

**Picker.** One grid, five by three, no life-stage tabs: fifteen faces scan
faster whole than paged. Photo buttons, "Keep generated face" and "Surprise
me" are unchanged. The Family upsell's placeholder faces use the set too, so
the app never shows two styles of person side by side. The onboarding cast
(`castFaces`) still uses `micah`; swapping it is a separate change.

**Licence.** f25 to f39 are third-party stock. Keep proof of the licence,
and any attribution it asks for, with the release.

**Not verified here:** anything on a device. Check the picker on the add
flow and the member page, the tray, record cards and notification badges on
iOS and Android, especially image sharpness at 24px.

### Children added (f40 to f44)

The supplied set had no children, so five were drawn for the app to match
it: a baby, a toddler with two top buns, a toddler with a red bowl cut, a
school-age girl with braids, and a curly-haired boy with a gap-toothed grin.
They use the set's own palette (sampled from the PNGs) and its line style.
Sources are SVG in `assets/avatars/source/v16.svg` to `v20.svg`; edit those
and re-render at 384px with a transparent background. They were made here,
so no third-party licence applies.

- **Picker:** four rows now, three of grown-ups and one of children. When the
  person is plainly a child (under 13 by date of birth, or a relationship
  like son, daughter or baby when there is no date), the children's row
  moves to the top.
- **Automatic picks stay in the right age band** (`face-pool.ts`, tested):
  skip the picker or tap "Surprise me" and a child gets a child's face and
  an adult an adult's.
- The account holder's own picker (`/who`) offers only the grown-ups.
- Derived faces for older profiles that never picked one still come only
  from the fifteen grown-ups, so nobody's existing face changed.
- The old set's baby and kid ids (f01 to f07) now point at the new children.

## Profile photos: the Save button that spun forever, 2026-09-30 (cloud session)

Reported: choosing a photo instead of a face, then saving, left the button
loading and the photo never saved.

**Why it could hang.** `setProfilePhoto` let errors escape (reading the file
with expo-file-system throws on web, where the picker hands back blob: URLs),
and neither screen reset its spinner on a throw. Separately, a request on a
dead or switching network had no time limit, so it could simply never answer.

**Fix.**
- `setProfilePhoto` and `clearProfilePhoto` never throw and never hang.
  Every step has a time limit, and the upload gets 20 seconds per attempt.
  It retries once, only after a lost connection, and `upsert` makes that
  retry safe. Worst case is about 40 seconds, then a plain message.
- Messages now say what happened: no connection, storage refused it, or
  uploaded but not attached (the orphaned file is deleted).
- The user id comes from the stored session (no network) before falling
  back to `getUser`.
- Web reads the picked file with `fetch`, native with expo-file-system.
- Both screens wrap saving in `try/finally`, so the button always comes back.
- **Add flow:** a face is always stored with the new member, so a failed
  photo leaves a proper face rather than a blank. The done screen offers
  "Try the photo again" in place.
- **Member page:** if only the photo fails, the other edits stay saved and
  the picked photo stays on screen, so Save again retries just the photo.
- A saved photo shows at once everywhere (`showPhotoNow` patches Home's
  cache with the local file) instead of flashing back to the drawn face
  while a signed link is fetched.
- `Avatar` remembered a failed link as a single flag, so after one expired
  link no later photo ever showed. It now remembers which link failed.

**Verified here, in a browser against a faked Supabase** (the real
`setProfilePhoto`, a real JPEG with camera EXIF):
- Happy path: one upload, a 512x512 JPEG, EXIF gone, and the path matches
  the 0026 check.
- Connection reset: retried once, then saved.
- Storage error: its own message, no retry.
- Attach refused: message, and the uploaded file removed.
- Upload never answers: gives up at 40 seconds with the offline message.

**Verified on scratch Postgres** (all migrations): a correct path attaches and
clears. A path under another account, a wrongly named file, a made-up face id
and an upload into someone else's folder are all refused.

**Depends on migration 0026 being applied**, which adds the photo rule and
accepts the new face ids. **Not verified:** the native picker, camera and
upload on a real phone.

## Record pages, one layout per kind of record, 2026-09-30 (cloud session, not seen on a device)

**What was wrong.** Every record opened in the lab-report template (gauge,
values, insight), whatever it was. Worse, the preview reader turned every
upload into the same blood count, and the phone upload never wrote the
values it read into `entities` (the old web build did), so uploads came out
thin and trends had nothing to compare.

**The model** (`src/lib/records/details.ts`, 48 tests with reading.test.ts).
Eleven types now:
- lab report, prescription, scan, discharge summary, medication list
- vaccination, insurance, bill
- consultation invoice, booking invoice, other

Each type keeps its own details in `extraction.details`. `readDetails`
rebuilds them field by field and never trusts the jsonb. A record whose
details can't be read falls back to a plain page instead of crashing. Pure
helpers cover the maths:
- medicine schedules ("1-0-1", "Twice a day after food, for 5 days")
- course days left and supply/refill dates
- where a value sits in its range, and the change since last time
- cover status and cover left, dose status, length of stay
- rupees the Indian way (₹1,23,456, ₹5 lakh)

**The pages** (`components/records/detail/`). Shared frame: a hero in the
type's colour, a member chip, the review check, the original page, and Ask
Cheeku. Between them:
- **Lab report:** the gauge, tallies, values grouped as the lab printed
  them, a range bar per value, "Down 0.8 from 11.2 on 12 Mar", sample
  details, lab notes.
- **Prescription:** the doctor card (tap to call), the visit (complaints,
  note, vitals), medicines in morning/afternoon/night slots with food timing
  and days left, "Add to Amma's medicines", "Book these tests at home"
  (attaches the prescription to the lab cart), and a follow-up reminder.
- **Scan:** the radiologist's conclusion first, then why it was done, the
  findings, and who reported and referred it.
- **Discharge:** a stay timeline, what happened, medicines to take home (with
  add to medicines), home instructions, a "go back to the hospital if" card
  in the caution hue (it is about health), and the follow-up.
- **Medication list:** "your day" by time slot, supply and expiry, and a
  refill reminder for whatever runs out first.
- **Vaccination:** dose segments, the next dose with a reminder, and the
  member's other doses of the same vaccine.
- **Insurance:** an e-card, cover left with a meter, who's covered (matched
  to family faces), key terms, waiting periods, claims, a helpline call, and
  a renewal reminder.
- **Bill:** the total and payment status, items by category, discount and
  GST lines as a receipt, and a "can be claimed" link to the policy.
- **Consultation and booking invoices:** receipts with status (paid, due,
  refunded, cancelled), and links to the appointment or lab tracker.

Payment and dose states never use green/amber/red; those stay health-only.

**Menu on every record:** move to another member, change the kind of record
(the page redraws), delete (row, values and file).

**Backend, migration 0028** (tested on scratch Postgres):
- New doc types.
- Lab bookings file their own booking invoice on creation. It is due until
  collection, then paid; cancelled with the visit. Existing bookings are
  backfilled for covered members.
- `file_consultation_invoice` checks the member and the plan. Video calls
  are paid in the app; clinic visits are "pay at the clinic". Cancelling an
  appointment refunds or cancels the invoice; rescheduling moves it.
- `move_document` moves the record, its values, timeline and inbox rows,
  and only to a member the plan covers.
- App-made invoices don't also post "is filed" to the inbox.

**Upload:** "What is it?" chips on Add a record ("Let Cheeku tell" by
default, otherwise a guess from the file name). The preview reader returns a
realistic sample per type. Uploads now write lab values, medicines and
vaccine doses as `entities`, so trends and dose history work.

**Records list:** each card has its type's one-liner ("₹608.75 · Paid",
"Dose 2 of 3 · next due 27 Feb 2027", "₹10 lakh cover · till 13 Mar 2027").

**Profile sync:**
- A record belongs to its member. Moving it switches the viewed member too.
- "Add to medicines" writes to that member's own list and skips what is
  already there.
- Doctor bookings file their invoice under the member they're for.

**Reminders** (follow-up, next dose, renewal, refill) are phone-only
one-offs, keyed per record so setting one twice replaces it. On web the
button says reminders work in the phone app.

**Apply:**
1. Migration 0028: `supabase/manual/0028-part-1-of-3.sql`, then part 2,
   then part 3, after 0027. The single file came through the SQL Editor
   cut off ("syntax error at end of input"), so it is split into three
   short parts, and 0028 is now safe to run again (create-or-replace
   functions, `if not exists` columns, trigger dropped before it is
   created). Tested: in order on a fresh database, all three twice, and
   over a database that already had the old 0028.
2. Optional, to see every page: superseded by the family demo below
   (`supabase/manual/demo-step-*`).

**Verified here:**
- Every page, the three sheets and the upload picker in a web export with
  seeded data.
- The migration and demo SQL on scratch Postgres.
- 194 tests.

**Not verified:** anything on a phone. Check these:
- scroll performance on the long pages
- the range-bar marker position on iOS
- the Share sheet
- tel: links
- reminders firing
- "Add to medicines" against a real member

## Worth knowing and the health file, rebuilt end to end, 2026-10-01 (cloud session, not seen on a device)

### Worth knowing (the content side)

**Before:**
- Home showed identical grey pills.
- The article page was a pale masthead and paragraphs.
- Articles had a colour and nothing else to organise them.

**Migration 0029** (tested on scratch Postgres, safe to rerun):
- **New article fields:**
  - `category`: reports, family, prevention, pregnancy, living.
  - `icon`: from a fixed list the app draws.
  - `key_points`: the "In short" list.
  - `author`, and a `featured` flag.
- **Backfill:** the nine published articles each get a category, an icon,
  three key points taken from their own text, and a "questions to take to
  your appointment" block. Questions only, no advice.
- **Corrected paragraph:** the vaccine-card article said the app does not
  remind you of doses. That stopped being true with the record pages, so it
  now says it can remind you of a date your clinic gave you, and still
  doesn't decide what is due.
- **`article_reads`**, one row per account per article (progress, saved,
  finished), with RLS:
  - `record_article_read` only ever moves progress forward and marks
    finished at 90%.
  - `set_article_saved` toggles Save.
  - Another account sees none of it.

**Design language** (`components/learn/parts.tsx`):
- Each category has its own colour family: field, ring, accent, and deep ink
  for titles. Violet is reports, teal family, blue prevention, rose
  pregnancy, terracotta living well.
- Each article has an emblem: a soft ring, a white disc, its icon and two
  dots.
- None of these colours are the semantic health hues.

**Home:** the rail is now pastel cards (category eyebrow, emblem, title,
read time, "For you", progress line, or "Read"), with "See all".

**Library** (`/learn`):
- Filters for All, Saved and each category.
- The featured pick as a large card.
- "Continue reading" for anything started and not finished.
- A shelf per category.

**Article page:**
- A pinned bar: back, reading progress, Save, Share. It gets a solid
  backdrop once you scroll.
- The category masthead with the emblem and a byline (author, date checked,
  minutes).
- "In short", then the body.
- New block types: steps, stat, and a questions card with "Get ready with
  Cheeku".
- "Ask Cheeku about this", "Read next" (same category first, unread first),
  then the sources.
- Progress is saved at each quarter and on leaving.

**Ranking** (`lib/knowledge/catalog.ts`, tested): for-you first, then
unread, then newest. Still only the reader's own declared conditions and
journey; never anything read from their documents. Every query falls back
cleanly before 0029 runs.

### The health file

**Before:**
- One cache key for whoever was in view, so a switch could show the last
  person's file until it refetched.
- Three separate reads.
- A flat page.

**`health_file_bundle(profile)`** (0029): one call returns the member's
profile, records and values. It only answers for a member of the caller's
own family that the plan covers; otherwise it returns nothing. Tested for
another account, and for a member locked by a downgrade.

**`lib/health/file.ts`** (tested) shapes the bundle into:
- the person (age, blood group, height, weight, allergies, conditions)
- totals
- tracked values, each with its full history, latest, previous and
  direction
- what the labs flagged
- medicines merged from records and the member's own list, never twice
- vaccinations
- active insurance cover
- who they've seen (with the app's own booking invoices not double-counted)
- recent records
- **coming up:** only dates the records and bookings gave (follow-ups, next
  doses including overdue ones, renewals within 60 days, booked visits,
  lab collections, refills within 3 weeks).

**The page:**
- A member switcher that switches the whole app.
- An identity card: allergies first, in the caution hue.
- Counts, and a "waiting for a check" banner.
- Coming up.
- Worth a look and values over time, with sparklines that shade the lab's
  normal band.
- Medicines (with where each came from), vaccinations, insurance cover, who
  they've seen, recent records.
- Type tiles that open Records already filtered (`/records?type=`).
- Share: a plain-text summary for a doctor, made of what the file says
  only.

**Home's card:** the member's face, three counts, and the one thing most
worth knowing (the next date, else flagged values, else allergies).

**Keyed per member** (`["health-file", id]`), refreshed with the
member-scoped and record queries, and warmed when the family tray opens.
The old overview module is removed.

**Apply:** see the SQL Editor note below.

**Verified here:**
- Home's rail and card, the library, the article page and the health file,
  in a web export with seeded data.
- The migration, run twice, and its access rules on scratch Postgres.
- 211 tests.

**Not verified:** on a phone, look at:
- the rail's snap scrolling
- the article bar over the masthead on iOS
- sparklines at small sizes
- Share

### SQL Editor pastes arriving cut off, 2026-10-01

Pastes into the Supabase SQL Editor kept arriving truncated ("syntax error
at end of input"; the last one stopped at character 5,290, mid-statement).
The SQL itself runs cleanly when sent whole. So 0028 and 0029 now ship as
small steps in `supabase/manual/` (0028 in 6, 0029 in 5, each under about
3,000 characters).

- Each step is its own transaction, so a bad paste changes nothing.
- Every step is safe to run again. The last step of each records the
  migration as applied.
- `0000-check-what-is-applied.sql` lists which migrations a database
  already has.
- Tested: every step in order on a fresh database at 0027, then all of them
  a second time.
- The longer-term fix is to connect the Supabase connector, so migrations
  can be applied without copying at all.

**Update, same day.** `0029-step-3` then failed in the SQL Editor with
`relation "it" does not exist`, though the file runs cleanly anywhere else.
That error means the text that ran contained SQL-like words outside their
quotes (`TABLE it` produces exactly that), so the English text in the
article steps was being mangled somewhere between GitHub and the editor.
The 0029 article steps now carry their text base64-encoded and decode it in
the database: no apostrophes, question marks or prose left in the pasted
SQL. Verified:
- the result matches the migration file byte for byte
- a rerun is safe
- starting from the user's actual state (old steps 1 and 2 applied, step 3
  failed) works, and the old helper function is cleaned up

## Demo records for Athar, Nisha and Imaad, 2026-10-01 (cloud session)

Nineteen sample records across the three of them, so every record page, the
health file and Upcoming have something real-looking to show. Athar: two
check-ups six months apart (lipids, HbA1c, sugar, vitamin D, so the trends
have two points), a prescription, a clinic invoice, a pharmacy bill, the
family floater policy and a chest X-ray. Nisha: two thyroid and iron panels,
a prescription left in "needs review", a lab bill, a flu shot and an
ultrasound. Imaad: a CBC with its Healthians booking invoice, a video visit
with its prescription and invoice, Hepatitis A dose 1 of 2 (dose 2 due in
ten days) and a flu shot.

**How it's built.** `mobile-react-native/scripts/demo-family-sql.ts` holds the
records as typed data, checks each one with `readDetails`, and writes
`supabase/manual/demo-step-1..12-of-12.sql`. Step 1 makes a loader function,
steps 2 to 11 hand it one base64 batch each (prose in base64 because the SQL
Editor mangles English text in a paste), step 12 drops it and prints counts.
Every step is under 3,100 characters and ends on `commit;`.

- No email in the repo: the loader finds the one account whose family has
  an Athar, a Nisha and an Imaad.
- Dates are written against 1950-06-15 and shifted to today when loaded, so
  "follow-up in 3 days" stays true whenever it is run.
- Re-runnable: each record carries `DEMO-RECORDS <key>` in `raw_text` and is
  skipped if already there. The "new record" notifications they raise are
  deleted. Removal is one line, noted at the top of step 12.

**Fixed on the way.** A yearly shot (dose 1 of 1 with a next date) showed in
Upcoming as "Flu, dose 1" again; it now reads "Flu, next dose", with a test.

**Verified here:** on scratch Postgres at 0029 with a family plan: all twelve
steps run as single SQL Editor commands, twice (second pass adds nothing),
counts 7 / 6 / 6, no 1950s dates left, and each member's
`health_file_bundle` fed through `buildHealthFile` gives sensible tracked
values, medicines, Upcoming and care team. Not seen on a device.

## The chat becomes a memory layer, 2026-10-01 (cloud session, not seen on a device)

Athar's brief: Cheeku is a longitudinal memory that remembers every record,
every chat and every reading, so answers are personal; it does not diagnose,
it uses general health models to understand a symptom to a point, cuts the
noise, reads the risk against the person's history and says what to do. The
spec he sent, reverse-engineered from a twelve-month family thread
(pregnancy, delivery, newborn), is kept at `docs/health-memory-layer-spec.md`.
The fine-tuned model comes later; everything around it is built now.

**The logic (`mobile-react-native/src/lib/memory`, pure, 40 tests).**
- `clock.ts`: a person-relative clock. Gestational age from the LMP and scan
  dating (earliest scan wins, a gap of a week or more is said out loud), day
  of life for newborns (birth is day 0), postpartum for six weeks.
- `thresholds.ts`: limits keyed on analyte AND clock (day of life, trimester,
  age band, term/preterm). Each row names its source. Guideline rows (WHO,
  ATA, IADPSG, NICE, ACOG) may reassure; "example" rows (the newborn
  bilirubin limits from the reference thread) can only raise concern. A
  value is read against the clock on the day it was taken.
- `series.ts`: every number with previous, delta, rate, baseline. A 24-point
  BP drop from the usual is what gets said, not "108".
- `ledger.ts`: running medicine state from prescriptions, discharge notes,
  pharmacy lists, boxes (new `pack` info on medication records: composition,
  licence class, batch, excipients) and the member's own list. Checks:
  ingredient stacking with vitamin D against IOM upper limits by age,
  FSSAI/cosmetic licence surfaced, age and route (steroid cream on a newborn,
  aspirin under 16), expiry.
- `loops.ts`: open loops, including the invoice insight (a billed test with
  no result). Raised in context: a pending newborn screen comes up the moment
  a product with aspartame is on the list.
- `symptoms.ts` + `ladder.ts`: twelve general symptom models, each with a
  base tier per kind of person, a recency window, home care (never a dose),
  watch-for signs and questions for the doctor. Four tiers. Clock-aware
  hard-stops (reduced movements from 24 weeks, fever under 3 months, waters,
  postpartum bleeding...) answer go-now without calling a model. The frozen
  safety lexicon is untouched and still runs first.
- `facts.ts`: readings said in the chat (BP from a monitor, weight in grams,
  °F) join the same series. A message that says it is a correction replaces
  the earlier reading and names the answers that leaned on it. A record and a
  chat reading that disagree on the same day are both shown.
- `script.ts`: the clinician script, built only from stored values. Shown at
  "call today" and above, with call and share buttons.
- `pipeline.ts`: the spec's loop, end to end. `model.ts` is the contract
  for the fine-tuned model (MemoryDigest in, paragraphs and an optional tier
  out; the rules' tier is a floor it can only raise). `mock-model.ts`
  answers from the digest alone, which proves the digest carries enough.
  `models.ts` switches to the `cheeku-chat` Edge Function with
  `EXPO_PUBLIC_CHAT_MODEL=edge`, falling back to the stand-in on any error.

**Backend: migration 0030** (and `supabase/manual/0030-step-1..6-of-6.sql`,
made by the new `scripts/sql-editor-steps.ts`). `memory_facts`, `open_loops`,
`pregnancies`, `profile_relations`, `profiles.birth`, `messages.tier/memory/
model_id`, `conversations.last_message_at`, `chat_thread()` (one continuous
thread per member, paged), `memory_bundle()` (one member's memory in one
call, plan-scoped; a relative contributes their name and blood group, nothing
else) and `promote_pregnancy()` (the baby becomes a member and inherits weeks
at birth, delivery, weight, mother's blood group and medicines; seat limits
apply). All new tables use the documents plan-scope trigger.

**Fixed on the way.** Emergencies were never recorded: the old send path wrote
`safety_status = 'escalate'` and the column only allows `'escalated'`, so the
insert failed silently. Emergencies and hard-stops are now saved as
`escalated`, which the quota never charges. Product checks now store their
card on the message, so it survives a reload.

**Screens.** Ask is one continuous thread per member with day breaks, "show
earlier" paging and a memory strip (clock, what's remembered, open items).
Each answer: correction note, tier badge with the clock, the answer, "what I
read" cards, the doctor script, watch-for list, medicine alerts, still-open
nudges, cited records, follow-ups. Go-now is a single red card with where to
go and 108. New: `/memory` (what's remembered, with correct/forget and
done/not needed), `/chats` and `/chats/[id]` (sittings by month, highest tier
each), `/pregnancy` (track, and "the baby has arrived"). Starters come from
memory. Record pages already open the chat with `?record=`; the health file
now does too. Copy across onboarding, Home, Help and About is reframed from
"never diagnoses" to what Cheeku does instead.

**Verified here:** typecheck, lint, 252 tests. 0030 applied twice on scratch
Postgres; the six editor steps give the same schema; promotion, seat limits,
plan downgrade hiding, relation ownership and thread order exercised by hand.
Real bundles from the test database run through the pipeline. Web preview
screenshots of the newborn thread, a hard-stop, an empty thread, Athar's BP
drop, the memory page and the conversation list. **Not seen on a device.**
Worth checking on iOS: keyboard and the thread's scroll position when
"Show earlier" loads, the horizontal reading cards, and the script's share.

**Demo:** `supabase/manual/demo-memory.sql` adds home BP readings for Athar
(a 24-point drop two days ago), Nisha's weight, Imaad's temperatures and
weight, and a "check BP every morning" reminder. Re-runnable.

**Needs a clinician:** every threshold row, the hard-stops and the symptom
models. Recorded under Open in PLAN.md.

## Settings pages redesign · 2026-10-03

About, Your plan, Personal information, Health profile and Help were rebuilt
as editorial pages that share one type ramp and one question list
(`src/components/settings/editorial.tsx`). Sections rise in once as they
scroll into view (`src/components/ui/reveal.tsx`, all on the UI thread, off
with Reduce motion). The settings menu now sets "Cheeku AI" in the wordmark.

**Your plan** opens on the plan you're on, what's left today (five segments on
Free), who it covers, and one next step. Then swipeable plan cards with Family
first, an honest comparison table showing that urgency levels and emergency
guidance are on every plan, the Daily Pass, billing questions and a plain
Cancel link. Plan copy in `plans.ts` was rewritten around the memory. The
paywall lost its green (plan state is not health), and checkout now lists the
plan's own features instead of "Health insights".

**Help** is a help centre: search over every answer, a call-112 strip first,
six topic tiles, a contact pair and the report form with its own button. Every
how-to answer was checked against the real screen it names.

**Verified here:** typecheck, lint, 256 tests, web preview screenshots of
every page. **Not seen on a device.** Worth checking on iOS: the snap of the
plan cards, the Reveal timing on long pages, and the help search keyboard.

## Notifications: read state and clean-up · 2026-10-03

The inbox stacked up and it was hard to see what still needed a look. Now:

- A yellow dot (and a thin yellow edge) marks a new notification; a green tick
  marks a read one. This is a deliberate, owner-approved exception to PLAN.md
  rule 3, recorded there, and limited to this screen.
- Two status tiles under the title: "3 new" (tap to filter to new) and
  "5 read" with Clear.
- Read notifications fold into one "Read" group at the bottom, closed by
  default, with one-line compact rows when opened.
- "Clear" removes every read notification in one tap; any row can be swiped
  left to clear it. Each clear shows a five-second Undo. Cleared rows are
  hidden (`dismissed_at`), not deleted, and Undo sets it back to null, which
  the existing column grant already allows. No migration.

**Verified here:** typecheck, lint, tests (two new for the read split), web
preview screenshots. **Not seen on a device:** the swipe gesture feel and the
Undo bar position above the home indicator are worth a look on iOS.

## One memory behind every chat and booking · 2026-10-04

Ask Cheeku (nav), Home's ask bar and the marketplace booking flows now all
read from and write to the same per-person thread.

- **Booking from the chat.** `src/lib/memory/intent.ts` reads "book", "repeat",
  "schedule" plus a service word. "Book test again" works out WHICH test from
  the memory (open loops first, then the latest lab panel) and why ("Due in 10
  weeks, last 5.9% on 12 Jul"). A booking with nothing worrying alongside is
  answered by rules with no model call (`rules:booking`); with a symptom, the
  model answers as usual and the card rides under it. Emergencies and
  hard-stops still win: no booking card on those. Test names are stripped
  before symptom matching, so "book the bilirubin test" is not read as
  jaundice.
- **The card** (`src/components/chat/booking.tsx`): lab (tests, from-price,
  fasting and sample, three steps, "Choose a lab" fills the lab cart and opens
  the chooser), doctor ("Start pre-consultation" opens the consult flow with
  who, mode and any named specialty already set, so those aren't asked
  again), and fitness/medicine (not live: joins the waitlist).
- **Member auto-switch.** A message naming another member ("Imaad has a
  cough", "my wife's thyroid test", "the baby") loads their memory and thread,
  switches the app to them, and sends the turn there, with a "Now in Imaad's
  memory · Back to Athar" chip. Two people named: no switch. A member the plan
  doesn't cover: nothing is sent, and it says why. PLAN.md rule 4.
- **Write-back.** `recordBooking` files every lab booking and doctor
  appointment, from the chat or the marketplace, in that person's thread as a
  "Booked" card (with the pre-consultation note for doctors). Assistant rows
  aren't charged against the free allowance. No migration: it uses the
  `messages.memory` column from 0030.

**Verified here:** typecheck, lint, 272 tests (11 intent, 3 pipeline booking).
Web preview of the real pipeline output for "Book test again" and a doctor
booking, the Booked card, and the consult flow opened from the chat.
**Not verified:** the member switch and write-back need a signed-in session;
worth trying on a device with the demo family: "Book test again" as Athar,
"Imaad has been sleepy" (should switch), then book the test and check it
appears in Athar's thread.

## Book services: one marketplace, open from day one · 2026-10-04

The marketplace will run on a partner network reached over one API
(diagnostics, consultations, pharmacy, and specialised care: ambulance, vision,
dental, mental health, physio, home care), so every category is open now
instead of "soon". The API docs aren't in yet; the structure is.

- **Catalogue** (`src/lib/services/catalog.ts`): Doctors, Lab tests, Medicines,
  Health insurance (fourth, still locked), then Mental health, Dental, Eye
  care, Physiotherapy, Home care, Ambulance; Fitness stays "soon" (not in the
  partner network). Each service lists what you can book inside it, how it
  works, and the words people search for.
- **Doctors are one segment.** Gynaecologist, dietician and the rest are no
  longer tiles; `/services/doctors` holds every specialty (new: clinical
  psychologist, psychiatrist, dentist, eye specialist, cardiologist,
  endocrinologist, neurologist, with sample doctors) and all of them run
  through the pre-consultation flow. New concerns in that flow: stress, mood or
  sleep; teeth; eyes; sugar, thyroid or BP; headaches.
- **The access point** (`src/lib/services/provider.ts`): one
  `MarketplaceProvider` interface (availability, quote, book, status, cancel).
  Today `marketplace()` returns a preview provider that confirms everything and
  charges nothing, and the screens say "Partner network · preview". When the
  API lands, a real implementation goes in and no screen changes. Nothing from
  records or chat crosses this line; only who, where, when and their own note.
- **Workflows:** `/services` (search, your open requests, shelves),
  `/services/[id]` (offerings, how it works, safety strip), `/services/request`
  (who, how, when, where, note; the note runs through the safety gate and an
  emergency stops the booking), `/services/booking/[id]` (status timeline,
  details, cancel). Every request is filed in the person's chat thread as a
  Booked card.
- **Safety:** Ambulance opens with "Is this an emergency? Call 108", and its
  emergency option is a call, never a form. Mental health opens with Tele-MANAS
  14416. Those red strips are health meaning (PLAN.md rule 3); tiles stay pastel.
- **Home:** "Book services" replaces "Book care": a dark "just tell Cheeku what
  you need" card, the four core services as big two-up tiles, and a "More care"
  row. Layout taken from the competitor's Explore screen (dark prompt card,
  two-up tiles with art in the corner), with our own shape-built art instead of
  stock renders.
- **Chat:** "book a physio", "need a nurse at home", "book an ambulance", "eye
  test" open the matching service; "a psychologist", "a dentist" are doctor
  bookings with the note. Medicines are live in the chat card now.

**Verified here:** typecheck, lint, 283 tests (9 services, 5 new intent).
Web preview of Home, the hub, Doctors, Mental health, Ambulance, the request
form and the status page. **Not seen on a device.** Worth checking on iOS: the
two-up tile heights, the request form's keyboard, and the swipe rows.
**To do when the partner API docs arrive:** implement `MarketplaceProvider`,
swap `marketplace()`, map service and offering ids to theirs, and move service
requests from the phone to the server.

## New mascot: Cheeku, the chikoo pebble · 2026-10-05

The Sprout character is replaced by the finalised Mascot Playbook design: a
soft sapodilla pebble with a purple sprout, glossy eyes, blush, tiny arms and
feet. `src/components/mascot/cheeku.tsx`.

- **3D in plain SVG.** Clay shading per part (key light top left, ambient
  occlusion at the bottom, a cool rim light, soft specular, fixed clay specks),
  glossy eyes with two catchlights, playbook palette (#F7D7C4 body, #A78BFA
  sprout, #FFB3C1 blush, #1F1B2E eyes). Crisp from 28 px to 240 px, no images.
- **Six expressions** (happy, calm, curious, reassuring, thinking, sleepy) and
  **seven poses** (stand, wave, sit, holding heart, listening, cozy curl, with
  phone/report), plus the optional glowing core.
- **Motion rig.** Stacked layers turning around real pivots (shoulder, stem
  base, eye line) on the UI thread: idle (bob, breathing, blinks, sprout sway),
  gentle bounce, tiny hop, micro-wave, slow breathing, still. Floating extras:
  hearts, zzz, a question mark, motion lines. Tap an interactive Cheeku for a
  reaction (hop, cheek lift, sprout wiggle). Reduce motion: a still drawing.
- **Which Cheeku where.** `MascotFigure` / `MascotBust` keep their names and
  now take mood, pose and motion. Greeting and sign-in wave; chat marks stay
  still and calm (there can be dozens); typing and report reading are
  thinking, the scan screen holds a report; Help and the push primer listen;
  bookings, purchases and a sent ticket hold a heart; the empty inbox is a
  sleepy curl; the app lock breathes slowly. The extra `Bob` wrappers are gone,
  since the rig moves on its own.

**Verified here:** typecheck, lint, tests; web preview of the expression and
pose sheet, a motion capture of all six motion styles, and About, Help,
Doctors and Sign in. **Not seen on a device:** check transformOrigin pivots on
iOS and Android (arm wave, sprout sway, blink), and frame rate on a long chat
thread.

**Rework, same day.** The first pass read as a shiny balloon: a dark rim from
a high-contrast radial gradient, a glossy specular, visible specks. Every part
now renders as matte clay: flat mid tone, Gaussian-blurred light and form
shadow clipped inside the shape (react-native-svg 15 filters), warm bounce
light, base occlusion, near-invisible grain, no specular. Eyes now have white
sclera and deep brown irises, the mouth is recessed with a tongue, the blush
is blurred into the skin, the leaf is matte and wider, and the ground shadow
is a soft wide pool plus a contact shadow. Under 64 px the blurs fall back to
gentle gradients for speed. **Check on device:** filter rendering on Android
(FeGaussianBlur inside ClipPath) and scroll smoothness with several large
mascots on screen.

## Mascot: the Lottie character, in brand colours · 2026-10-05

The drawn mascot is gone. Cheeku is now four Lottie animations of one
character (supplied as free LottieFiles downloads; check each licence before
release), recoloured from the artist's yellow into the app's lilac and violet.

- **Files.** `assets/mascot/source/` holds the downloads untouched;
  `scripts/recolor-mascot.mjs` writes the branded `assets/mascot/*.json`. Re-run
  it to change the palette. Exact colour table first (with snapping for the
  rounding variants exports carry), then a hue rule for anything missed. Body
  yellows to lilacs, orange outline to brand violet 500, the faint magenta
  cheek tint to a stronger rose blush (some files fade it on the layer, some on
  the fill: both handled), sparks to pink, the teal desk set to deep ink
  indigo. Never green, amber or red (rule 3).
- **Moments.** wave (greet), working (at a desk with a phone: reading,
  typing, scanning), celebrate (arms up with sparks: booked, bought, sent),
  shrug (empty states, not sure, Help). `components/mascot/lottie.tsx` crops
  each canvas to the character's measured box, so `size` is the character's
  height whichever file it is.
- **Stills.** Transparent PNGs of a good frame per moment, plus a head crop.
  Marks under 64 px (one per chat message) and Reduce motion always use these.
- **Screens keep their wording.** `MascotFigure` / `MascotBust` still take
  mood, pose and motion; `momentFor` picks the animation. Calm or still
  requests show the still.
- **Web.** The player is dotLottie's WebAssembly build; its `.wasm` is served
  from `public/` instead of a CDN (`components/mascot/wasm.web.ts`). Re-copy it
  from `@lottiefiles/dotlottie-web` when that package is upgraded.

**Verified here:** typecheck, lint, tests; web preview of all four
animations, the stills, About, Help, Sign in and Doctors. **Needs a native
rebuild** (`lottie-react-native` is a native module; Expo Go includes it, a dev
client needs `npx expo run:ios` / `run:android`). Not seen on a device: check
smoothness with two animations on one screen (Home), and Android hardware
rendering.

## Welcome: a fourth panel for booking · 2026-10-05

The carousel now ends on the marketplace: "The right care, picked for you."

- **Arc.** Ask me, I remember, the whole family, and now the care around you.
  Panel 3's button became "And when we need a doctor?" so the hand-off reads
  as one conversation.
- **Scene, second version.** The first try (a shelf of 3D emoji plus a busy
  "Cheeku's picks" card) was rejected by the owner as cluttered and off-brand.
  Now: one thin ring, four people on it with name tags in panel 3's style
  (Doctors, Lab tests, Therapy, Specialists), and the medicines bag in a
  lavender disc at the centre. Copy cut to a two-line headline and one short
  sentence.
- **Art.** The avatars and the medicines bag are illustrations the owner
  supplied, cut out here (avatars masked to circles, the bag lifted off its
  background, the half-white syringe dropped). They live in
  `mobile-react-native/assets/care`. **Licence:** these look like stock
  illustrations; confirm a licence that allows use in a paid app before
  release. A third reference the owner sent carried a "Magnific" watermark
  and was not used.
- **Small phones.** Under 760 pt the picture shrinks (box 260, faces 58).
  Checked at 375 x 667 and 393 x 852 in the web preview.
- No green, amber or red in the tags. Cheeku never decides a test is needed
  on its own say-so; "No extra tests" means it will not repeat one already on
  file.

- **Motion** (`components/onboarding/care-orbit.tsx`). The ring opens and the
  bag pops in with soft ripples; the four people fly out of the centre to
  their places; a small light orbits the ring; then a violet highlight moves
  from one service to the next every 1.6 s (the "picked for you" idea, shown
  rather than said), with a ping on each face. Tapping a face or the bag
  picks it and the cycle carries on from there. Plus marks twinkle outside
  the ring and a soft radial glow lifts the picture off the page. All on the
  UI thread; Reduce motion gets the finished picture, still.

**Not seen on a device:** check the motion's smoothness on a mid-range
Android (several looping animations at once), and that the avatars look sharp
at 3x (they are 240 px).

## Instant saves with a way back · 2026-10-05

Quick actions now change the screen first and save in the background. If the
save fails, the screen goes back to exactly how it was and a dark bar at the
bottom says so, with Retry.

- **One helper, one bar.** `src/lib/optimistic.ts` (`runOptimistic` for local
  state, `optimisticQueries` for TanStack Query caches: snapshot, cancel
  in-flight fetches, patch, roll back on failure) and
  `src/components/ui/save-bar.tsx`, mounted once in the root layout. The bar
  is neutral ink, never the semantic red (rule 3), sits above the tab bar on
  tab screens, and goes away after 9 s. A throw, `false` or `{ ok: false }`
  all count as failures; a server reason, when there is one, is shown.
- **Already instant, now with Retry:** inbox read, unread, mark all, dismiss
  and restore; notification switches; "Tell me when it's open"; saving an
  article.
- **Now instant:** record "Looks right", change type, move to another member
  (the screen's own effect follows `profileId`, so a rollback switches back
  too); memory follow-ups done or not needed; correcting a reading (the new
  fact id is made once so a Retry upserts instead of duplicating); reviews on
  doctor and lab pages; Personal info, Health profile and Edit member saves
  (fields are checked on the phone first; forms now fill in once per person,
  so a rollback never wipes what was typed); pregnancy dates (closes at once,
  saves behind); the onboarding journey pick (moves on at once; a failure stays
  silent, as before).
- **Deliberately still waiting for the server:** subscribe and cancel plan,
  every delete (record, member, account, forgetting a reading), cancelling a
  lab booking, lab and doctor bookings, uploads and profile photos (an edit
  with a new photo keeps the spinner), adding a member and recording a birth
  (both create a profile the server can refuse), password reset, app lock.

**Verified here:** typecheck, lint, 289 tests (6 new for the helper:
apply-before-save, rollback, `false` and `{ ok: false }`, Retry, exact cache
restore). In the web preview with a temporary harness (deleted): Save changed
the screen in 68 ms with no spinner; offline it rolled back and showed the bar;
Retry back online saved and cleared it. **Not checked against the live
database or on a device:** turn on airplane mode in the app and try a switch,
a record type change and a form save.

## Cheeku comes alive: eleven moments, moves and peeks · 2026-10-05

The owner noticed one wave on every early screen. The four files hold far
more than they played, so the mascot now has eleven moments, and each screen
gets the one that fits.

- **Hidden in the files.** `working.json` stops at frame 272 but its layers
  run to 1039, with the artist's markers for three more moods at the desk:
  steady (thinking), sad (worried), happy (joy). The standing three share one
  rig, so parts can be swapped. `scripts/mascot-variants.mjs` cuts them out,
  trimming keyframes and layers to each window (a single remaining keyframe
  becomes a static value; a lone keyframe blanks the player). The desk's last
  segment has a badge with Turkish text and is left out.
- **New moments.** `idle` (wave's tail: standing, glancing about), `cheer`
  (celebrate's held arms-up), `think`, `worried`, `joy` (desk), and one
  genuinely new pose, `present`: shrug's open arms with celebrate's smile.
  Plus sequences: `hello` waves once then idles; `celebrate` jumps once then
  cheers; `present` opens its arms once then holds them.
- **Moves.** `float`, `sway`, `pop`, `flip`, hop on tap, and `CheekuPeek`:
  head and shoulders rise over a card's edge every few seconds, glance about,
  and duck back. Reduce motion gets stills (new PNGs for every moment).
- **Where.** Home hero follows the person's state (hello when all is in
  range, present when there are no reports, think when reports wait for a
  check) and hops when tapped; "Just tell Cheeku" presents and sways; the
  health file card has the peek; Home's load failure is worried. Splash
  hello + float, sign-in present, profile idle + float, chat empty present +
  float, Doctors think, About joy, Help present + sway, paywall and booked
  service celebrate + pop, records empty present. The welcome carousel keeps
  the looping wave.

**Verified here:** typecheck, lint, 289 tests; every moment, move and the Home
placements in the web preview (temporary harness, deleted), and Doctors,
About, Sign in and Help as real screens. **Not seen on a device:** several
animations at once on Home (hero, Book services, peek) on a mid-range
Android; the desk cuts add about 540 KB of JSON to the bundle.

## No still Cheeku anywhere · 2026-10-05

Every mascot now moves, and each main page has its own version.

- **Records tab:** Cheeku at his desk, typing (filing), beside the title. The
  empty state opens its arms and sways.
- **Upload:** open arms beside "What are we filing today?"; worried at his
  desk when the last try failed; typing at the desk, floating, while a file
  is read.
- **Ask Cheeku:** the header, every message mark and the typing row are small
  faces, which used to be a frozen PNG. Under 64 px a face now breathes and
  glances about; a thinking face ponders with a slow tilt; a happy one
  bounces. Each starts at its own offset so a column of them never moves in
  step.
- **Profile tab:** waves hello beside the title, then floats.
- **Calm is not still.** "calm" and "breathe" requests (chat header, app
  lock) now get idle with a slow float instead of a frozen frame.
- **The game.** Any standalone Cheeku hops when tapped and reacts for a few
  seconds: cheers if standing, laughs if at the desk (a laughing one goes
  back to thinking). The reaction keeps the base moment's layout, so he does
  not jump. Mascots inside a tappable card do not take the tap.
- **Reduce motion** is the only place stills remain, on purpose.

**Verified here:** typecheck, lint, 289 tests; Records header on the real
screen; Profile, Upload and Ask pieces, the moving small faces (every frame
differs) and tap reactions in a temporary harness (deleted). **Not seen on a
device:** a long chat thread with many moving faces on a mid-range Android.

## Sign-in no longer flashes "Set up a profile first" · 2026-10-06

Signing in to an account with a family (Athar, Nisha, Imaad) showed "Set up a
profile first" for a second or two before Home loaded.

**Root cause.** Signed out, row level security answers every profile query
with zero rows, which the app could not tell apart from an account with no
profile. Sign-out cleared the query cache while Home and Profile were still
mounted; they refetched at once with no session and cached `profile: null`
as the family. The disk persister, throttled to 2 s, then wrote that empty
family AFTER `clearOfflineCache` had run. On the next sign-in Home found a
cached "no profile", rendered `NoProfile`, and only replaced it when its
background refetch returned.

**Fix, in layers.**
- `assertSignedIn()` (profiles/context): `loadFamily` and the Profile tab's
  query throw when there is no session, so a signed-out read is an error and
  is never cached as data. Regression test in `signed-in.test.ts`.
- Home, Profile and Ask only show "set up a profile" from a settled, fresh
  answer; a cached empty one being refreshed keeps the loader up.
- Sign-in starts from a clean cache (memory and disk), then loads the family
  before opening Home, so Home opens complete.
- Persisted cache `buster` v1 -> v2 throws away copies already poisoned on
  people's phones.

**Profile mascot.** The floating figure beside the title read as clutter.
Cheeku now peeks over the top edge of the person's card instead (head and
shoulders only, every few seconds), the same peek as Home's health file.

**Verified here:** typecheck, lint, 291 tests; the peek in the web preview
(temporary harness, deleted). **Needs the live app:** sign out, sign back in
as the family account, and confirm Home opens straight on the family.

## Fewer database calls per screen · 2026-10-06

Asked to find N+1 queries. There was no classic loop of one query per list
item; the cost was the same data fetched again and again on every screen.

**Measured, not guessed.** Each screen was opened cold in the web build
against a fake Supabase (a three-person family, 4 records, Family plan) that
counted every call. Same fixture before and after; every screen's visible
text compared word for word (identical, apart from Home's rotating ask-bar
hint, which is on a 3.2 s timer and was caught mid-fade).

| Screen | Calls before | After |
|---|---|---|
| Home | 25 | 14 |
| Records | 28 | 9 |
| Ask Cheeku | 25 | 12 |
| Profile | 20 | 9 |
| Upload | 19 | 2 |
| Health file | 12 | 3 |
| Family | 16 | 3 |
| Personal info | 7 | 3 |
| Subscription | 7 | 2 |
| Notifications | 1 | 1 |
| **All ten** | **160** | **58** |

**What changed.**
- `getEntitlement` was three calls in a row (auth server, `families`,
  `subscriptions`) and ran 3 to 6 times per screen. Now one nested select
  (`families?select=id,subscriptions(...)`) over the existing unique foreign
  key, with the user id from the local session. Handles the embed as an
  object or a one-row array.
- `loadFamily` asked for the profile list twice and the plan three times;
  now once each, with the active person chosen from the list already loaded
  (`activeProfileFrom`).
- `shared()` (lib/supabase/session.ts): identical asks made while one is in
  flight share that request. Nothing is kept after it settles, keys carry the
  user id. Used for the profile list and the plan.
- `sessionUser()` replaces `auth.getUser()` on read paths that only need the
  id (plan, personal info, notification prefs, reviews, inbox realtime).
  Writes and the launch check keep getUser so a revoked session is caught;
  row level security checks the token on every query either way.
- Indexes: every column these lookups filter on is already indexed (owner,
  family, user and profile keys, notifications by user and date, primary
  keys on article_reads and open_loops). No migration needed.

**Left as is, on purpose.** The lab catalogue is three small tables cached
for an hour; the two `families` reads (plan, and notification prefs for the
reminder scheduler) serve different consumers.

**Verified here:** typecheck, lint, 296 tests (5 new for `shared` and
`sessionUser`), the before/after count and text comparison above. **Needs
the live database:** open Home, Records and Profile and confirm the plan name
and family look right (the nested select is the one query shape the fake
backend had to imitate).

## Consent, privacy, storage and security · 2026-10-08

Asked for a consent layer that does not add friction, the backend behind it,
cache and cookie handling, a proper privacy policy and stronger security
settings.

**Consent, the person's side.** Sign-up keeps one unticked box ("I'm 18 or
older, and I agree to the Terms of Use, Privacy Policy and Health Data
Consent"), with the three names as links and a "What this covers" line that
opens to the five required uses in plain words. Nobody has to read anything
to sign up; anyone who later asks what they agreed to gets the exact text and
version. Optional uses (product improvement, research, marketing) are never in
the box: they are off-by-default switches in Privacy & consent.

`ConsentGate` (mounted in the signed-in shell) shows a full-screen sheet when
the database says consent is missing, with three versions of the copy: never
recorded (people who signed up before this), a material update (names which
document changed and what), and withdrawn by the person. It cannot be
dismissed, because the database would refuse every save behind it, but the
sheet itself offers Download my data and Sign out, so not agreeing never costs
anyone their records.

**Consent, the backend (migration 0031).**
- `legal_documents`: version, effective date, `material` flag and SHA-256 of
  each text. The app bundles the same texts; `documents.test.ts` fails if a
  hash or version is missing from a migration.
- `consent_log` gains method, bundle id, versions, text fingerprint, platform,
  app version, locale and an ordering `seq`. Still append-only.
- `record_consent()` is the only write: required uses are granted together or
  not at all, out-of-date texts are refused (`stale_terms`), optional uses need
  core consent first (`consent_required`). `my_consent_state()` is the only
  read and answers missing, stale and why.
- A trigger on `auth.users` writes the sign-up decision from the form's
  metadata inside the insert that creates the account. It never blocks a
  sign-up; the app re-checks and records it if the trigger could not.
- `enforce_core_consent()` refuses new documents, messages, memory facts and
  lab bookings without consent, behind `app_flags.enforce_consent`. Upload and
  chat catch the refusal and open the sheet at once.
- `privacy_requests` (access, correction, erasure, grievance, nomination,
  withdrawal; due 90 days out, status forced to `received` on insert) and
  `account_activity` (sign-ins, security and consent changes; never health
  data, detail capped at 200 characters).

Verified on a local Postgres 16 with a Supabase stub (auth schema, roles):
all migrations through 0031 applied in order, 23 scenarios in
`supabase/manual/local-check/0031-consent-scenarios.sql` behave as expected
(sign-up trigger, partial and stale grants refused, optional before core
refused, withdrawal pauses writes, RLS isolation between two users, forced
request status, material vs wording-only updates, guard switch), and
re-applying 0031 is a no-op.

**Privacy policy and documents.** Terms of Use, Privacy Policy, Health Data
Consent and a Cookie and Storage Notice, written for DPDP (purposes, data
categories, processors, retention, rights, grievance officer, Data Protection
Board). Readable at `/legal/[doc]` without an account. Company details are
placeholders in `src/lib/legal/entity.ts` and every document shows a neutral
draft banner until they are filled. Two claims were removed rather than
written because nothing in the code backs them ("staff access is logged" and
deletion of inactive accounts). The sign-in footer said "Encrypted end to
end", which this app is not; it now says "Encrypted in transit and at rest".

**Privacy & consent screen.** Status, the required uses, optional switches,
the four documents, rights (download, correction, access, nomination,
grievance requests with their status), consent history grouped per decision,
withdraw and pause, and the grievance officer.

**Cache and cookies.** No cookies exist, so there is no banner; Storage &
cache says so and lists everything the app does keep, from one registry that
sign-out also uses. A test scans the source for storage keys and fails on any
that are not in the registry. Offline copies can be switched off or kept for
1, 3 or 7 days (the persister checks on every write and restore), and Clear
cache removes the offline copy and the app's own temporary files.

**Found and fixed: sign-out left personal data on the phone.** Saved
addresses, appointments (with the concern typed into them), scheduled
reminders and picked or cropped photos all survived a sign-out. Every
sign-out path (Settings, the lock screen escape, the consent sheet) now goes
through `signOutAndWipe`.

**Security screen.** Moved onto the shared settings chrome. New: auto-lock
delay (immediately, 1 minute, 5 minutes; a longer delay needs the biometric
check, a shorter one does not), sign out of other devices (refresh tokens
revoked; the copy says open phones lose access "within the hour" because an
access token lives that long), recent account activity, and links to Privacy
and Storage. The app-switcher shield still goes up the moment the app goes
inactive whatever the delay, and a cold start always locks.

**Found and fixed: the app lock did not arm until a restart.** The gate read
the setting once at launch, so turning the lock on in Settings protected
nothing until the app was next killed. Settings changes now notify the gate.
Also: an offline snapshot dated in the future (phone clock moved back) was
treated as fresh forever; it is now dropped.

**Verified here:** typecheck, eslint on every touched file, 351 tests; root
`rls.test.ts` shows the same 14 failures as before this change, none on 0031's
tables. **Not verified, needs a phone:** the sign-up box and links, the
consent sheet in all three states, the Privacy, Storage and Security screens,
the auto-lock delay on real backgrounding, and sign-out wiping reminders.

## Old accounts and the consent switches · 2026-10-08

Reported: on an account from before the consent layer, the optional switches
in Privacy & consent did nothing but show "Agree to the required uses first".

**Why.** Three things together.
- The app's sign-up before 0031 required ticking a box and never saved the
  tick (only the legacy web build wrote `dpdp_processing`). 0031 therefore saw
  every older account as never having agreed: the write guard would refuse
  their uploads and chats, and the switches refused to move.
- The switch's "not agreed" branch only set a note: a dead end.
- The consent sheet was mounted in the tab shell, so a screen opened directly
  (a reload on web at /settings/privacy) had no sheet at all.

**Fix.**
- Migration 0032 carries the old tick over: one granted row per required use,
  dated at account creation, method `carried_over` (accepted only from the
  migration; `record_consent` still refuses it), old wording as fingerprint,
  versions `{"signup_agreement": "1.1.0"}`. These accounts read as `updated`,
  so they get a one-tap notice with its own wording, not three "what changed"
  cards. Optional uses are not carried over: owner's decision, they stay off.
- The sheet now lives in the root layout and re-checks on sign-in and
  sign-out. Tapping a switch without consent opens it; before 0031 is live the
  switches are dimmed and say why.

**Verified here:** typecheck, lint, 352 tests (one new for the carried-over
state); 0032 on local Postgres with four accounts (old app, legacy web, new,
withdrawn), 15 checks in `supabase/manual/local-check/0032-carry-over-scenarios.sql`:
old account blocked before and uploading after, `updated` with nothing
missing, optional uses untouched, withdrawn and new accounts unchanged, a
client cannot write `carried_over`, second run adds nothing. Web preview
screenshots of the notice, the sheet over a directly opened Privacy screen, a
saved switch and the pre-update state. **Needs a phone:** the same on device.

## Home stages: starter, building, Today · 2026-10-13

Owner's call: a new family with no history should not see a Today screen with
nothing on it. Home drives them to add records first and switches to Today once
there is something to plan from.

**The rule.** One real record unlocks Today: a lab report or discharge summary,
a prescription, medicines typed into a profile, a dated test or follow-up, or a
booked lab visit. **Chat alone never unlocks it** (owner, 2026-10-13: "No" to a
chat-volume unlock). A chat that saves a medicine or a due test counts, because
that is a record. The chat-volume path exists in `app_config` switched off, so
turning it on later is a config change, not a release.

**Why it scales.** The stage lives on `families.home_stage` and only moves
forward. `home_state()` evaluates signals only while a family is not on Today,
with EXISTS probes on indexed columns; once on Today it costs one family row,
a 14-day due query and a 35-day step log. The rules are config, not code.

**Backend (migration 0033).** `app_config` (deny-all), `families.home_stage`,
`home_stage_at`, `today_unlocked_via`, `today_actions` (RLS: own rows and own
profiles only), `home_signals` (not callable by users), `home_decide` (pure,
mirrored in `src/lib/home/rules.ts`), `home_state()`, and a backfill that puts
existing families with data straight on Today.

**App.** `src/lib/home/` holds the rule, the step picker, streaks and the
content. Starter and building show an unlock card whose copy pushes the latest
record, however old ("a WhatsApp forward or a PDF from your email all work"),
and a checklist of what each kind of record opens. Today shows one step chosen
from what Cheeku knows (an overdue test first, then a habit aimed at a flagged
reading or a condition, then medicines, then a rotating longevity habit), a
streak, a Monday-to-Sunday week, the five pillars (move, eat, sleep, mind,
check), family alerts for someone else's overdue test, and what is due across
the family. The stage is remembered on the phone (`cheeku.home`) so a returning
family never sees the starter screen flash first.

**Longevity as the game, kept quiet.** No points or confetti on medical data.
A streak that survives until the day is over, milestones at 3, 7, 14 and 30
days in Cheeku's words, and a "balanced week" when all five pillars are
touched. Semantic colour appears only on overdue and due-soon items.

**Verified here:** typecheck, lint, 33 new tests (decision parity with the
SQL, ratchet, step priority, kidney and thyroid guards, baby and pregnancy
sets, streak edges, due merging, alerts, copy rules); 0033 on local Postgres
with seven accounts, 15 checks in
`supabase/manual/local-check/0033-home-stage-scenarios.sql`. Web preview
screenshots of starter, building, the unlock moment, Today, Today after Done
and Today on a parent. **Needs a phone:** all of it on device, and the stage
re-check when returning to Home after the first upload.

## Today's action plan: five pillars, the whole day · 2026-10-13

Owner's report from the phone: the Move, Eat, Sleep, Mind and Check chips on
Today could not be tapped, and the day needed to be more than one step. Asked
for: every pillar opens its tasks; Move logs steps with a watch screenshot as
proof until wearables connect; Eat asks for a photo of every meal and drink
and says what works for their health; sleep and calm suggestions; one
personalised "today's action plan" mixing their own tasks with general
healthy-living ones.

**The engine** (`src/lib/home/plan.ts`, pure and tested). In: readings and
flags, conditions, medicines, what is due, age and life stage, pregnancy, the
week's logs, preferences, the hour. Out: a plan in a fixed shape. Due items
first; the daily spine (steps, four meals, last night's sleep, two minutes of
breathing); their own checks (BP, fasting sugar on alternate days, weekly
weight, medicines with their names); up to four personal habits aimed at what
their numbers say, each carrying the reason ("Your HbA1c came back high
(6.1%)"); general habits in every pillar so the plan is never only about what
is wrong. Sorted for the hour it is. Babies get due items only; children get
active play, not a step count; pregnancy and children get the gentle set and
nothing aimed at a reading; kidney flags drop every water task; the thyroid
task only appears for someone on a thyroid tablet.

**Steps.** Goal by age (10,000; 7,000 from 60; 5,000 from 75; 6,000 in
pregnancy "or what your doctor is happy with"), or the person's own. When the
week is well below the goal, today's target ramps from the week's average
plus 15%, so the target is reachable.

**Meals.** A photo per meal and the taps on what is on the plate. Version
one reads the taps, not the photo, so every line is explainable: a balanced
plate is praised, and at most two tips tied to their own areas (fast carbs
with high sugar, salt with high BP, fried and bakery with high LDL). The day
gets a one-line plate summary. `daily_logs.analysis` is kept for a model's
reading later and the app cannot write it.

**Backend (migration 0034).** `daily_logs` (own rows, own members, plan
scope, consent guard, 80 a day, photo keys that can only point into the
member's own daily folder, analysis stripped from app writes) and
`profiles.daily_prefs`. Readings also go into `memory_facts`, so they are on
the chart and in the next answer. Export and account deletion include the
logs and their photos.

**Verified here:** typecheck, lint, 400 tests (17 new for the plan, steps
and meals); 0034 on local Postgres, eight checks in
`supabase/manual/local-check/0034-daily-logs-scenarios.sql`; editor steps
run clean. Web preview screenshots of Home, the plan in every pillar, and
each sheet. **Needs a phone:** the camera and gallery pickers, photo upload
and thumbnails, the breathing animation, and the keyboard over the sheets.


## Chat metering and 20 free chats a day · 2026-10-19

Launch tracker tasks `rl-chat-edge` and `rl-free-20`.

**The hole.** The daily allowance was spent by a trigger when the message row
was saved, and the app calls the model before it saves. So the allowance never
stood between an account and the model: a signed-in account could call
`cheeku-chat` in a loop and get answers that were simply never saved, and the
function checked nothing but the sign-in.

**The fix: claim before forwarding.** `claim_model_call()` (migration 0035)
runs as the caller, through their own JWT, so nobody can claim for someone
else. Under a per-account advisory lock it refuses, in order: a spent free
allowance (it reads the same counter the trigger spends), more than 6 calls a
minute or 60 an hour, and a daily ceiling (free: the allowance plus 5 for
answers whose save failed; paid: 300 as fair use). Otherwise it writes one
`model_calls` row (who, when, tier, no content) and says yes. The function
returns 429 with the reason and a `retry-after`, and nothing reaches the model.
If the meter itself is unreachable the function answers 503 rather than make
an unmetered call; the app already falls back to its on-device stand-in.

**Two counters, on purpose.** `subscriptions.chats_used_this_month` stays the
allowance people see: one per saved question, never for an emergency.
`model_calls` is the meter and the base for `ai-cost-model`. Merging them
would have meant charging at model-call time, which charges for answers that
then fail to save.

**Safety.** Emergencies never reach the model, so nothing here can delay a
112 card. A pace refusal stops the turn with "give it a minute" only below
contact-today; at contact-today or go-now the stand-in answers instead,
because a careful answer now matters more than pacing.

**The app.** The allowance is read before planning: when it is spent the turn
is still planned (that is where an emergency is recognised, and an emergency
is never refused) but on the stand-in, so a refused question costs no model
call. `FREE_CHAT_LIMIT` is 20 and the chat shows "N free chats left today ·
Unlimited with a plan" from 5 down. The authority for the number is now one
row, `app_config('chat_limits')`, read by both the trigger and the claim;
defaults inside `chat_limits()` mean a bad edit to the row cannot remove a
limit.

**Order matters.** Migration first, then redeploy `cheeku-chat`, then the app
release. The new function before the migration answers 503 to everyone (the
stand-in takes over); the new app before the migration says 20 while the
trigger still refuses at 5.

**Verified here:** 0035 on local Postgres, 14 checks in
`supabase/manual/local-check/0035-chat-metering-scenarios.sql` (applied twice,
burst refused at the 7th call in a minute, meter not writable or readable
across accounts, free refused at 20 with the 21st save failing, an emergency
still saved after the allowance, paid ceiling, signed-out, emptied config,
anon); editor steps run clean; the edge function run under Node with stubbed
services (no model call without a claim, 401 without sign-in, 503 when the
meter is down, 429 with reason and retry-after); typecheck, lint, 406 tests
(6 new for the adapter). **Not verified:** a deployed function against real
Supabase, and the chat on a phone.

## A content system for cards and notifications · 2026-10-19

Asked for: the Today step card felt crowded ("Today's medicines, taken /
Tick it once every dose for today is in. Missed doses are the commonest
reason treatment seems not to work."), and a system so every card and
notification is short, human and engaging.

**The system** is `docs/content-system.md`: who Cheeku is (the friend in the
family who knows health), five rules (one idea per card; action first, payoff
second; specific beats general; their reason beats ours; cut until it hurts),
hard limits per slot, notification formulas by kind (news, nudge, attention,
win, account) and a never-list (shame, promises, medicine advice, "AI", em
dashes). Fun is earned: playful on habits and wins, plain on results.

**The split.** Every plan task now has `title` (the action, 30 characters),
`why` (the payoff, one line, 60) and `more` (the science, 200). The card shows
the first two; the plan shows a "Why this?" link that opens `more`. Nothing
that was true was thrown away, it moved one tap deeper.

**The card.** No eyebrow ("TODAY'S STEP" repeated the screen title), no filler
"Today" chip (minutes only when there are some), "For Papa" as a chip when it
is someone else's step, at most two short lines under the title, and a smaller
mascot on due cards so it no longer sits behind the buttons. The medicines
reason is one name and a count ("Atorvastatin 10 and 1 more"); two names ran
long and cut "Vitamin D3" to "Vitamin".

**Notifications.** Migration 0036 redefines the nine notification functions
with only their wording changed (same logic, dedupe keys and routes). It also
fixes a real bug: going back to Free said "You get 5 chats a day", wrong since
0035; it now reads the number from `chat_limits()`.

**Enforced.** `src/lib/content/copy.test.ts` checks every plan task, chip,
milestone, the unlock card and every notification in the latest migration
against the limits and the never-list. Pointed at the old 0024 wording it
finds two bodies over the limit, so it catches what it should.

**Verified here:** typecheck, lint, 411 tests (5 new); 0036 applied twice on
local Postgres and every rewritten notification fired once
(`supabase/manual/local-check/0036-notification-copy-scenarios.sql`; longest
title 37, longest body 85); editor steps run clean. Web preview screenshots of
Home and the plan. **Needs a phone:** the card on a small screen.

## Research ideas into the tracker, and a V2 list · 2026-10-23

Asked for: take the ranked ideas from the AQ / Ant Afu research
(`docs/research/aq-ant-afu.md`), put what we can build before launch into the
launch tracker, keep the rest for V2, and give investors one slide on markets
where this has already worked.

**Launch work.** Goal cards come first (`loop-goal-cards`, P1, M2) because
the action plan engine already builds the plan; the new part is picking a
goal and two or three questions. Then the staged symptom check
(`loop-consult-room`), privacy blur before a photo leaves the phone
(`sec-photo-privacy`), the medicine box photo (`ai-med-box`, after the
prescription reader and brand-to-salt), partner challenges (`loop-challenges`,
P2, a business decision first) and a dense-or-MoE benchmark for Suraj
(`ai-moe-eval`). `ai-meal-vision` went from P2 to P1 and `int-wearables`
notes Indian device brands.

**V2.** The tracker page has a new milestone, `V2`, shown as its own group
and left out of the readiness numbers, so saved ideas don't make launch look
further away than it is. Four tasks sit there: doctor twins, elder mode,
insurance pay, public counters. The page source in `docs/launch-tracker/
tracker.html` matches the published page.

**Decks.** Both v2 decks have a "Proven markets" slide: Ant Afu in China
(150M users, ~20M questions a day, 60% from tier-3 and smaller cities), the
US (ChatGPT Health, 230M weekly health askers by OpenAI's count) and India
beside China on population, density and payment rails. All figures are the
companies' own or UN and World Bank data, sourced on the slide.

## A second AQ report folded into the research note · 2026-10-23

The owner shared three tables from a separate competitive report on AQ / Ant
Afu. They are now in `docs/research/aq-ant-afu.md`, marked "(second report)"
and not re-checked: the fourteen service families with where Cheeku stands
on each, Ant's model stack (DeepSeek R1/V3, Qwen and BaiLing in March 2025,
on-premises for hospitals) mapped to our AI tasks, and a copy or
differentiate table. The report's main point became a proposal: pick five or
six workflows and finish them end to end before adding more. The note lists
six for the team to confirm. One tension is written down rather than
settled: the report would add wellness goals only after retention is proven,
and the tracker has goal cards at P1 in M2.

## Account deletion removes the sign-in · 2026-10-24

Asked for: the launch tracker's `sec-delete-auth`. "Delete my account" erased
records, files, the inbox and tokens, but left the account in `auth.users`,
so the same email signed straight back in to an empty account. DPDP erasure
and store review both need the sign-in gone.

**Why a function.** Only the service role can delete from `auth.users`, and
that key never ships in the app. `supabase/functions/delete-account` checks
who is calling with Auth (never the request body), wants `confirm: "DELETE"`
again, refuses with 409 while the caller still owns a family or a document
row, writes one resolved `privacy_requests` erasure row, then deletes the
user. It is idempotent: a retry after a half-finished run answers ok.

**Why the 409.** Deleting the sign-in cascades every row, but not the files
in storage those rows point at. The app's path deletes files first, then
rows; the function will only run after that, so no file is ever orphaned.

**What stays, and why a migration.** `consent_log` and `privacy_requests` are
the proof that consent was given and that rights were asked for and answered.
The app already kept them on purpose, but both had `on delete cascade` to
`auth.users`, so deleting the sign-in would have taken them. Migration 0037
drops those two foreign keys: the rows stay, keyed by an id nobody can sign in
as, unreadable through the API (RLS). Neither holds health data.

**In the app.** `src/lib/account/sign-in.ts` calls the function as the last
step of `deleteAccountData`; on failure the screen says the records are gone
but the sign-in is still there, and the next tap finishes. The confirm sheet
and the help answer now say the sign-in goes too.

**Verified here:** typecheck, lint, 416 tests (5 new for the call and its
messages); 0037 applied twice on local Postgres, then a throwaway account
deleted from `auth.users`: family and inbox gone, consent and request rows
kept, another account sees none of them
(`supabase/manual/local-check/0037-delete-sign-in-scenarios.sql`); the editor
step runs clean on top. The function compiles; it has not run against a real
project. **Not verified:** the function on Supabase, and the flow on a phone.

## UI batch 1: bugs, haptics, motion and wording · 2026-10-24

From the UI/UX audit (`docs/audits/2026-10-ui-ux-audit.md`, done with the
design skills in `.claude/skills`). Batch 1 is the quick wins; batches 2 to 4
(shared Sheet and Tap, the type and colour system, a calmer Today) are in the
launch tracker.

**Bugs.** Today's header read "Made for your what's due" (now "Built around
your sugar plan and what's due", via `softLower` and `joinAnd` in
`src/lib/content/words.ts`, which also stop "Vitamin D" becoming "vitamin d").
Ask's first chip said "hba1c". Ask opened scrolled to the end of an empty
thread, cutting the mascot off. Long conditions ran off the Health file (pills
now pack by length and wrap; still no flexWrap, see the Yoga note above). The
records member chip shows a first name, and rows drop the person's name when
the list is one person. Choose a lab no longer shows "₹0" for every lab with an
empty cart. Sign-in no longer shows three disabled "Soon" providers. Test names
and option lines wrap to two lines instead of cutting mid-word. The tenth item,
a gap on Welcome, was a screenshot taken mid-animation; nothing to fix.

**Haptics.** `expo-haptics` through `src/lib/feel.ts` (tick, tap, thud,
success, warn): tabs, the + button, picking a person, switches, pillar chips,
Done (success on the day's last step), booking confirmed, report filed, an
upload error, destructive confirms. One per action, always with a visual.

**Motion.** No more scale-from-zero `ZoomIn`: shared `ENTER_QUICK`,
`ENTER_SOFT` and `ENTER_POP` keyframes in `components/ui/motion.tsx`, bounce
kept only for booking confirmed. The family tray has no entrance at all (it
opens many times a day). `PopIn` starts at 90%. Mascot float, breath, glance
and peek, and the "Open now" dot, finish after a few cycles instead of looping
forever. Entrances 240ms, stagger 40ms, reveal 360ms. The peek's ease-in exit
became a strong ease-out.

**Words.** One severity ladder, In range / Worth a look / Ask your doctor,
from `SEVERITY_LABEL`, replacing "Normal", "Borderline", "Needs attention",
"High risk" and "High priority". A new `attention` (orange) tone; red is for
"go now". Home's red "FAMILY ALERT" became "OVERDUE" or "COMING UP".
Documented in `docs/content-system.md`.

**Web shell.** `public/index.html`: viewport-fit=cover, theme colour, no tap
highlight, no page overscroll, 16px inputs on touch screens, no text selection
on controls.

**Verified here:** typecheck, lint, 418 tests (2 new); before and after
screenshots of sign-in, Ask, Today, Health file and Records (worst-case
names), Choose a lab, Home and Scan. **Needs a phone:** every haptic (timing
and strength), the entrance feel, and a new native build for expo-haptics.

## UI batch 2: one sheet, one press, skeletons · 2026-10-24

Batch 2 of the UI audit (`docs/audits/2026-10-ui-ux-audit.md`): the
primitives every later screen builds on.

**Sheet.** All 13 bottom sheets were a `Modal` with `animationType="slide"`
and the dark layer inside it, so the backdrop slid up with the sheet like a
web modal, and every sheet drew a grabber that did nothing. Now there is one
`<Sheet>` (`components/ui/sheet.tsx`). The backdrop fades and never moves. The
sheet rises on a spring (300ms, damping 0.9) and leaves faster than it came
(220ms), because the app answering should feel quicker than the person
deciding. The top centre strip, where the grabber is drawn once for every
sheet, drags: release past 40% of the height, or a flick that would carry it
there, closes it with the release speed handed to the spring so there is no
seam; pulled up, it rubber-bands. The drag zone is only the grabber strip so
it never fights a close button or a list's own scroll. `dismissible={false}`
holds it while something is in flight. Reduce Motion fades instead of
sliding. Percent `maxHeight`s stopped working inside it (the box is sized by
its content, so "86%" had nothing to be a percent of); `useSheetMax(0.86)`
turns them into points. The consent gate stays a native full-screen and page
sheet on purpose: it is not dismissible by design.

**Tap.** About a third of the pressables reacted to a touch, with nine
different scales that snapped instantly. `<Tap>` (`components/ui/tap.tsx`)
dips to 0.97 on press-in in 120ms with a strong ease-out and comes back in
160ms, on the UI thread, with no re-render. Big cards use 0.98, small round
buttons 0.95; those three values are the only ones left. 55 surfaces moved,
the tab bar included. About 250 raw `Pressable`s remain for batch 3. Reduce
Motion dims instead of scaling.

**Skeletons.** Home, Records, Health file, Ask and Today showed a centred
spinner on first load. Each now shows its own shape (`ui/skeleton.tsx`) with
a slow pulse, so nothing jumps when the data lands. The pulse is the one loop
that runs until it is done, because it means "still loading"; under Reduce
Motion it is still.

**Blur, withdrawn.** The audit asked for a blur behind the floating tab bar.
Looking closer, no screen scrolls content under it: every screen pads its
list above the bar. A blur over the plain canvas does nothing but cost a
native module, so `expo-blur` was installed and taken out again.

**Batch 1's keyframes were broken on web.** The `ENTER_*` Reanimated
`Keyframe`s from batch 1 left their view collapsed or displaced on web: the
member page avatar sat on top of the name and the tray checkmark jumped.
They are replaced by `<Enter kind="quick|soft|pop">` in `motion.tsx`, plain
shared values with the same timings, which render the same everywhere. The
tray checkmark now has no entrance at all. PLAN rule 7 says not to use
`Keyframe`.

**Verified here:** typecheck, lint, 418 tests; web screenshots of every
sheet opening with the fading backdrop, a slow drag following the pointer and
snapping back, the member page and tray after the `Enter` fix, and the four
skeletons. **Needs a phone:** a fling to dismiss, a slow full pull, pulling
up, the keyboard with a sheet open on iOS, every press, and haptics (still
waiting on a new `eas build` from batch 1).


## Archit joins; trackers re-audited · 2026-10-24

Archit (full stack and AI engineering) now owns backend, security, sign-in,
database, scale, the app to AI API layer and the LabStack marketplace end to
end. In the launch tracker 38 tasks moved to him and 10 were added for gaps the
19 Oct audit missed: his onboarding, Google and Apple sign-in, sessions and
recovery, a secrets inventory, a job queue, Edge Function standards, data
retention, a scale plan, a versioned app to AI contract, and streamed chat
answers. In the LabStack tracker 30 tasks moved to him and contract tests were
added. Athar keeps the app, product and design; Suraj keeps the models and
pipelines. Work that crosses lines keeps one owner and lists the others in a
new `with` field, shown on both pages as "Working with". Ownership is
summarised in `docs/launch-tracker/README.md`.

Two judgement calls. Tasks already in progress kept their owner (Suraj's
reader, memory and resolver work, Athar's chat metering and delete-account
close-out) with Archit added alongside, so nothing in flight changes hands.
Google sign-in waits on the bundle rename, because OAuth client ids are tied
to the bundle id and Apple requires Sign in with Apple once Google is offered.

## UI batch 3: one type scale, one radius scale, one primary · 2026-10-24

Batch 3 of the UI audit. The design system had drifted: 33 font sizes in
about 1,300 places, 45 radii, around 200 hex colours, and two primary button
colours used side by side.

**How it was done.** Three AST codemods (the TypeScript compiler, not regex),
so only real `fontSize` and `border*Radius` values and real string literals
changed. Before and after screenshots of 28 screens were compared one by one.

**Type.** Ten steps: 11, 12, 13, 15, 17, 20, 24, 28, 34, plus 10 for counters
and chart ticks, plus display sizes from 36. Ties went up at body sizes,
because readability wins (14 became 15), and down at title sizes, because a
title that newly wraps is worse (22 became 20). 939 edits in 108 files.
Tailwind gets named sizes (`text-sm` is 13) without a line height, so a class
never changes the leading a screen already set. Two tick labels at 6.5 and 7
are now 10.

**Radius.** 8, 12, 16, 24, 32 and a pill. Anything whose radius was at least
half its own width or height became an explicit 999, so circles and capsules
stay round whatever their size. 6 and under stays free for hairlines (bars,
dots). Heroes at 34 and 36 went to 32; sheet tops moved from 28 to 32. 372
edits in 84 files.

**Colour.** Repeated category colours became `hue` (orange, blue, rose, plum,
teal, ocean, indigo, slate, lime: an fg, a bg and sometimes a wash), and the
lavender gradient stops became `lilac`. Every literal within a CIEDE2000
distance of 5 of a token now points at it (the eye barely separates under
about 2; 5 still reads as the same colour side by side). Health colours
moved only on exact matches, so nothing became `semantic` by accident. 390
literals replaced; 54 one-offs remain as lint warnings, mostly illustration
faces and Learn category art.

**One primary.** Brand purple means "do it". Ink means "selected" (chips,
segments, the active tab) and stays on the centre +. `PillButton` lost its
dark tone, and 25 hand-styled black actions moved to brand: Book collection,
Choose a video slot, Send, Save, Take photo, the cart bar, the add buttons.
Kept on ink on purpose: toasts, the swipe Clear, the active-filter chip, and
"Show emergency numbers", because a safety action should not look like a
sales button. The consent gate's agree button still turns purple only once
the box is ticked.

**Press.** `<Tap>` now takes `className` (registered with NativeWind's
`cssInterop`), so 186 more pressables moved over: 241 in all. Small round
buttons dip to 0.95, big cards to 0.98, the rest to 0.97. The 62 raw
`Pressable`s left already change colour on `pressed`, or are backdrops that
must not move.

**Guard.** A `no-restricted-syntax` block in the root ESLint config, scoped
to the mobile app, warns on font sizes and radii off the scales, raw hex
colours and arbitrary size classes. These are warnings, not errors, so the
54 known colours do not break CI.

**Verified here:** typecheck, lint (0 errors, the 54 known colour warnings),
418 tests, and before and after screenshots of 28 screens. **Needs a phone:**
the new sizes on a small Android (14 to 15 is the biggest jump, in about 200
places), purple buttons on the glass cards, and every press.

## UI batch 4: a calmer Today, and goal cards · 2026-10-24

Batch 4 of the UI audit, built together with `loop-goal-cards`. Batches 1 to
3 passed Athar's phone check the same day.

**Three, not fifteen.** "All" on Today used to be about fifteen equal cards,
each with a "Healthy living" pill and a filled button. Now it shows the three
that matter right now (`nowTasks` in `plan.ts`): anything due, then the
goal's check-ins that fit this part of the day, then the plan's own order,
which already puts the current window first. Everything else folds under
"Later today" and "Done today" as one-line rows. A row opens into the full
card in place, and a plain habit can be ticked from the row. A single pillar
is short enough (two to five tasks) to keep showing whole.

**Done folds the card.** Done or Later on one of the three plays one haptic
and folds the card away: its height closes over 220ms while it fades and
dips (`Fold` in `motion.tsx`). Only then is the change written, so the
next card rises into the gap instead of the list jumping. The write waits
220ms, which is invisible next to a network call. Reduce Motion: a quick
fade.

**Less noise.** The pill appears only when it says something: Overdue or Due
soon, "Your goal", or "For you". Home's plan rows lose "Healthy living" the
same way. The header's bar became a ring, with "A fresh start", "Keep going"
or "All done today" beside it.

**Goals.** Five goals: Sleep better, Lose a few kilos, Steady sugar, Stronger
legs, Calmer mind. Each has two quick questions whose answers pick its daily
check-ins from habits that already exist (nothing new to write or review).
The plan tags those tasks, adds the missing ones, and ranks them after
anything due. Rules:
- Weight and sugar are for adults only and never in pregnancy; those are a
  doctor's call. Every goal task still goes through the plan's own `allowed`
  gate, so a child only gets gentle habits. A goal left with nothing for
  this person is not offered, and babies get no goals at all.
- A saved goal that is no longer allowed (say, someone becomes pregnant) is
  simply not run. It is not deleted.
- The goal lives in `profiles.daily_prefs.goal`, so there is no migration.
  It is read through `readGoalPrefs`, because that jsonb was written by a
  client.
- The streak counts days in a row with at least one check-in. A habit counts
  through `today_actions`, a meal, reading or timer through `daily_logs`. An
  unfinished today does not break it.
- The optional daily reminder is a local notification at the hour the
  answers point to (an hour before the bedtime they gave, for sleep). On the
  lock screen it says "Two minutes for your goal" and never names the goal.

**Verified here:** typecheck, lint, 434 tests (16 new, covering goal copy
limits, who can pick what, tasks from answers, plan integration, ordering and
the streak). Web screenshots of the picker, the sheet, a running goal with a
streak, Later today open, a card folding away and the ring after it, and a
pillar view. **Needs a phone:** the fold timing, the reminder firing at the
right hour, and the swipe through the goal cards.

## What's built, on the launch tracker · 2026-10-24

The launch tracker now ends with **What's built**, so Athar, Archit and Suraj
start from the same picture. It was audited from this file, the app's screens,
the 37 migrations and the three Edge Functions.

It lists 34 features in eight groups. Each one says:
- its honest state: 24 live, 3 built and waiting on a phone check, 6 running
  on sample data or a mock, and 1 partly live
- where its code lives
- who looks after it
- the open tracker tasks that carry it on

"On sample data" is said out loud on purpose: labs, doctors, services,
billing, the chat model and the report reader all work end to end but are
not real yet, and nobody joining should mistake them for done.

Two parts keep it current without anyone editing it:
- A `built` feature turns Live by itself when all of its linked tasks are
  done.
- Every task marked done appears in "Completed in this tracker", newest
  first.

The data lives in the artifact's `features` collection, with a copy in
`docs/launch-tracker/features.json`.

## Skeletons on every first load · 2026-10-25

Batch 2 gave Home, Records, Health file, Ask and Today skeletons; the rest of
the app still showed a centred spinner, or nothing. Athar asked for the grey
shapes everywhere.

**The audit.** Two kinds of gap.
- **A spinner, often on a bare canvas with no way back (17 places):** scan,
  a record, an article, Learn, both chat screens, memory, the Profile tab
  (twice), and the settings pages for plan, health, personal details,
  notifications, privacy, storage and security (twice).
- **No loading state at all:** these screens flashed an empty list, a blank
  page with only a header, "This booking isn't here any more", or "Family
  Plan, 0 of 1 seat" until their data arrived. They are the labs home, Choose
  a lab, a lab partner, a lab test, lab bookings and a booking, the family
  list and a member's page, a doctor's reviews, editing a pregnancy, a
  service booking (which said "Loading…") and appointments.

**The kit** (`components/ui/skeleton.tsx`):
- `ScreenSkeleton` keeps the real header and back button, so a slow screen
  is never a dead end.
- Shapes: `ListSkeleton`, `FormSkeleton`, `DetailSkeleton` (with a round
  variant for people and labs), `GridSkeleton`, `ChatSkeleton` and
  `LinesSkeleton` for a few lines inside a card that is already on screen.
- All of them share the existing pulse, which stays still under Reduce
  Motion.

**The rule** (PLAN rule 7): a screen arriving gets a skeleton; a spinner is
only for an action in progress. Twenty-two spinners remain, all of them
inside buttons, uploads and saves. "Not found" now appears only after the
data has actually come back empty.

**Verified here:** typecheck, lint, 434 tests, and web screenshots of 26
screens with their data held back for nine seconds by the fake backend.
**Needs a phone:** the same screens on a slow connection (in Developer
options, or use airplane mode then reconnect).


## Medicines dose by dose, and the day's nudges · 2026-10-25

Athar asked for loop-meds, and for every booking, reminder, habit and action
to come with the notification that brings people back, several times a day.

**Doses (loop-meds).** Today used to carry one "Today's medicines" tick for
everything someone takes. The ledger already knew the schedule from a
prescription ("1-0-1"); declared medicines only had free text, so
`parseFrequency` now reads "BD", "twice daily", "at night" and the like into
the same shape. It returns nothing for weekly, monthly or SOS rather than
guess a daily dose. `src/lib/home/meds.ts` turns the active, scheduled
medicines into slots (morning, afternoon, night), each with its doses.

- A taken dose is a `today_actions` row keyed `dose:<medicine>:<slot>`. No
  migration: the streak, the week and the goal streak count it like any step.
- The person's own settings (slot times, a counted stock, a schedule they set
  when the record had none, the reminder switch) live in
  `profiles.daily_prefs.meds`, written back with only what differs from the
  defaults so the 2,000-byte cap is safe.
- Today gets one card per slot ("Morning medicines") with each dose ticked on
  its own and "Took them all". The old single tick stays only when no
  schedule is known at all; next to a dose card it confused, and it was
  wrong for a weekly sachet.
- New screen, Your medicines (`app/medicines.tsx`): today's slots, every
  medicine with how it is taken, the week's doses (counted from the first
  tick, so a new user is not shown a week of misses), and how long the strip
  lasts. Three sheets: count what's left, set when it is taken, and the dose
  times. A strip with five days or fewer shows a Refill banner into the
  medicines service. Opened from the dose card, Home and the memory screen.
- Cheeku never changes a dose. The schedule sheet says it only sets
  reminders, and the screen ends with "ask your doctor or pharmacist before
  taking extra".

**The day's nudges.** `src/lib/notifications/engage.ts` is a pure planner:
for one member, what to put on the lock screen over the next two days.
`syncNudges` in push.ts schedules it as local notifications under
`eng-<profileId>-`, cancelling and rescheduling in full like appointments, so
a ticked dose never leaves a stale buzz. `use-engagement.ts`, mounted in the
signed-in shell, plans again whenever the plan, the medicine settings, a
switch or the permission changes, and every time the app comes to the front.

- Medicines: a reminder at each dose time, one check an hour later only if
  the doses are still unticked, and a refill nudge while a strip is low.
- Daily, for the account holder once Today is unlocked: the morning plan,
  what's due, the lunch photo, the evening walk, the goal check-in, a streak
  about to break, and a Sunday reset. A family member gets doses, refills and
  what's due, named by first name only.
- Limits: four daily nudges a day at most (doses are not counted, they were
  asked for), 90 minutes clear of anything else, quiet from 10 pm to 7:30 am,
  and each one only while it still matters. A nudge has a few times it may
  go; it takes the first one that fits.
- Tomorrow is planned as if nothing is done. Doing anything means opening the
  app, which plans again.
- The goal reminder from batch 4 was a repeating daily notification that
  fired even on days the goal was done. It is planned with the others now;
  the old `goal-<profileId>` one is cleared on the next sync.
- After any appointment, two hours later (or 9 am next day after a late
  visit): "How did the visit go? Snap the prescription and I'll set up the
  doses and reminders." That closes the loop from a consultation into doses.
- Two new switches in Notifications settings, Medicine reminders and Daily
  nudges, both on by default. They are keys in `families.notification_prefs`
  (jsonb, no migration). Nothing asks the OS for permission on its own: a
  small "Turn on" card on Today, the goal sheet and the medicine switch are
  the only ways in.
- The lock screen never names a medicine, a condition, a reading or the goal.
  `engage.test.ts` holds every title to 40 and every body to 90.

**Not here:** server push for any of this (loop-notifs, Archit). Local
notifications cover a phone that has opened the app in the last two days;
someone who stops opening it stops being nudged after that, which a server
nudge would fix.

**Verified here:** typecheck, lint, 465 tests, and web screenshots of Today,
Your medicines with each sheet, Home, memory and Notifications settings.
**Needs a phone:** every notification. The web build schedules nothing, so
none of the timing, the Android "Medicine reminders" channel, the tap routing
into the right member, or the permission card could be seen from here.

**Phone check, same day.** Profile → Notifications opened the inbox, so the
new switches were only reachable through the inbox's settings button; the
row now opens Notification settings (PR #47). Athar then checked medicines
and nudges on a phone and everything worked: loop-meds and loop-nudges are
done. Matching ledger lines to LabStack's drugMasterId, for exact-pack
refills, rides with ai-brand-salt.

## Family care: caregiver view, alerts and server-side nudges · 2026-10-25

Athar asked for the caregiver view, parent alerts and server-side nudges
together. Every family member lives under the account holder's login (one
user_id, many profiles), so the account holder is the caregiver and alerts go
to their phones.

**Why the server.** The on-phone planner (engage.ts) reaches only people who
opened the app in the last two days, and it cannot know that Papa's evening
doses were not ticked on Papa's phone. The server sees every tick.

**How it works.**
- Each phone already works out a member's dose plan (meds.ts). It now writes
  a small copy to `profiles.care_plan` (src/lib/care): slot times, ledger
  keys, the last day each counted strip lasts, and two switches. Keys only,
  never a medicine's name, at most 2,000 bytes. Written when it changes, from
  the shell for the active member and from Family care for everyone.
- `run_care_sweep()` (migration 0038) runs every 15 minutes through pg_cron,
  in India time, never between 22:45 and 07:30, and writes inbox rows:
  - **parent_alert** to the account holder: a member's slot still unticked
    90 minutes on, a strip with three days or fewer left, or two days with
    nothing ticked after a week of ticking. Only for members being tracked
    (a dose ticked in the last two days), so nobody gets an alert every few
    hours about a parent nobody ticks for.
  - **dose_due, refill_due, daily_nudge, sunday_review** only for accounts
    nobody has opened in 36 hours. A phone in use plans these itself. Daily
    nudges go out on days 2, 3, 5, 8 and 13 of quiet, then stop.
  - **retest_due** for a test or follow-up due within three days or up to a
    month overdue, once a week each. Always in the inbox; `data.quiet` keeps
    the account holder's own one from buzzing while their phone is in use.
  - Paused members (beyond the plan's seats) and accounts without the
    required consent get nothing.
- push-dispatch learns three shelves (medicines, nudges, care) and three
  switches (Medicine reminders, Daily nudges, Family care alerts, all on by
  default). Rows the sweep writes go out as worded, since they are written
  for a lock screen; a due test is replaced by a generic line because its
  title names the test.
- On the phone, a family member's local plan keeps only their dose
  reminder. The check an hour later and the refill nudge now come from the
  server as caregiver alerts, so they are never sent twice.

**The view.** Family care (`app/care.tsx`): a card per member with today's
doses by slot, the week, their latest BP and sugar, what needs you (late
doses, overdue tests, low strips, quiet days), Call (from their saved phone
number), Open their day, and an alerts switch per member. Home shows one line
per member with a status dot. A caregiver alert opens Family care without
switching member.

**Verified here:** typecheck, lint (no new warnings), 476 tests, the
migration applied twice to a local Postgres 16, and 24 sweep scenarios in
`supabase/manual/local-check/0038-family-care-scenarios.sql` across a
caregiver, a quiet account, a paused member and an account without consent
(all pass). push-dispatch typechecks with a Deno shim. Web screenshots of
Family care, Home and Notifications settings.
**Not verified:** pg_cron and the webhook (neither exists on a plain
Postgres), and any real push. Both need the 0038 editor steps on Supabase
and a phone with an EAS build.

**Live, same day.** Athar applied 0038 steps 1 and 2 on production and
created the push webhook from Integrations > Database Webhooks (the SQL
version of step 3 fails until webhooks are enabled once: "schema
supabase_functions does not exist"). 0038-check.sql said yes on all six rows
and a test row reached push-dispatch. loop-caregiver, loop-notifs and
ops-push-webhook are done; loop-cron is under way (lab status sweep and
retention cleanup remain). Phones buzz once the app build has push keys.

## Fitness classes take insurance's place · 2026-10-25

The fitness partner's VP said yes to tiering up: they quote a base price per
session across their network (200+ cities), Cheeku adds its markup and sells
single classes. Athar asked for the whole flow now, with the master API to
follow, and for Fitness to replace Health insurance on Home. Insurance moves
to Coming soon for the next stage.

**The seam.** Every screen calls `fitnessNetwork()` (src/lib/fitness/
provider.ts). Today that is a preview network: 14 sample studios per ~2 km
cell around wherever the person is, deterministic so the same place shows
the same studios, with sample sessions and plausible base prices. They have
no address, phone or brand and every screen says "Sample". The partner's API
becomes a second FitnessNetwork and that one function returns it.

**Price.** 15% on the base, at least Rs 25, the total rounded up to the next
Rs 10 (`priceFor`, `MARKUP`). The server applies the same rule from
`app_config.fitness_pricing` when it records the booking, so the client never
names a price. The screen shows one price, not the split.

**Matching, on the phone.** `match.ts` turns the profile into needs:
conditions in the person's own words (obesity, PCOS, diabetes, BP, heart,
arthritis or knee pain, anxiety, insomnia), a BMI of 27.5 or more (Asian
cut-off), the Today goal, age and pregnancy. Each need ranks activities, can
cap intensity (BP moderate, heart gentle) and can rule out jumping (knees,
60+). Pregnancy shows prenatal yoga and meditation only. A doctor line shows
for pregnancy, a heart condition or 60 and over. Sessions are scored by fit,
distance and how soon they start, and the top picks are mixed so one studio
or one activity cannot fill the list. Women-only studios are hidden from
men. Reasons are card reasons (36 characters) and describe the class, never
an outcome. Nothing about health leaves the phone: the network sees a place.

**Flow.** Home tile, then `/fitness`: our own location card first (expo-
location, while in use only, kept on the phone rounded to ~100 m, listed in
the storage registry), or pick one of 16 cities. Then "Classes for Aarav"
with the lead need, search (an activity word or a studio name), chips in the
order that suits the person, the next booked class, "Picked for Aarav" and
studios ranked by fit then distance. A studio page has seven days of classes,
the suitable ones first and the rest under "Also here". The booking sheet
picks the family member (matching redone for them, with a plain warning if
the class is harder than their profile suggests), shows one price and books.
The ticket page has the check-in code, directions and cancel (up to an hour
before). Your classes lists upcoming and past.

**Chat.** "Any yoga near me", "find a gym", "suggest a swimming session for
Papa" become a fitness intent with the activity, even as a question; "is
yoga good for BP?" stays a question. The reply is written from the profile
("For the knees and joints, aqua aerobics, swimming, yoga suit Papa best")
and the card under it shows the three best classes nearby, bookable in the
same sheet without leaving the thread. A booking is filed in that member's
thread like labs and doctors.

**Server (0039).** `fitness_bookings` (read own rows only), with a snapshot
of the studio and session, the price split, the check-in code and the
reason. `create_fitness_booking` checks sign-in, consent, a covered member,
a start between 15 minutes and 15 days out, no overlapping class for that
member and at most 12 upcoming, then prices and writes an inbox row.
`cancel_fitness_booking` up to an hour before. Two kinds, fitness_booked and
fitness_cancelled, on the appointments shelf; the lock screen gets
push-dispatch's generic appointment line, so "Prenatal yoga" never shows on a
locked phone. Phone reminders an hour before and half an hour after, with no
activity named.

**Verified here:** typecheck, lint (no new warnings), 501 tests (25 new for
fitness, intent and copy), the migration applied twice to a local Postgres
16 and the scenarios in `supabase/manual/local-check/0039-fitness-scenarios.sql`
(prices, overlap, too soon, an invented activity, direct insert refused,
cancel, another family's booking, a paused member, no consent, titles within
40 and bodies within 90). Web screenshots of Home, location, discover, the
sheet, Papa's view, a studio, the ticket, the list and a filtered view.
**Not verified:** location, haptics and the sheet on a phone (needs a new
dev build for expo-location), and anything against the real partner.

**Live, same day.** Athar applied 0039 on production; 0039-check.sql said yes
on every row. Booking now records for real (on sample studios). What is left
for `loop-fitness` is the phone check on a new dev build.

## Location, live and saved (loc-live) · 2026-10-25

Athar checked fitness on the phone (web build) and found "Near you" where a
place should be, and nothing in Profile. Two causes: the web has no system
geocoder, so expo-location's reverse lookup returns nothing there; and the
place lived only on the phone, so no other screen or the server knew it.

**Provider.** Ola Maps (Krutrim) first: built on Indian data with
localities and pincodes, free up to at least 500,000 calls a month per API
at the time of writing (its pricing moved to prepaid credits from 1 Sep 2026
with the free allowance kept; the exact tier should be checked on the
console). OpenStreetMap Nominatim behind it: free, keyless, light use only.
Google gives 70,000 free Essentials calls a month on India pricing but needs
billing on the account; Mappls's free tier is undocumented. So: Ola for
quality, OSM so it works on day one with no key.

**Server.** A `geo` Edge Function holds the key and answers reverse lookups
and place search in one shape (`supabase/functions/geo/parse.ts`, tested from
the app suite). Every answer is cached for 30 days (reverse by ~110 m cell,
search by words and rough area) and each person gets 300 provider calls a
day; cache hits are free. Migration 0040 adds `member_locations`: one latest
place per family member (no history), rounded to 4 decimals, written only by
`set_member_location`, which skips GPS jitter under 100 m within 2 minutes,
caps 200 writes a day, cleans the address and drops a stale one when the
point moves. `forget_member_location` wipes one or all; account deletion
cascades.

**Live.** `useLiveLocation` in the signed-in shell takes a fix on open and
when the app comes back to the front, and watches for 200 m moves while it
is open. A new address is looked up only after 250 m; the server is written
after 250 m, a new pincode, or 30 minutes. Never in the background: that
needs "Always" permission and is more than booking needs. A picked place
holds for two hours so booking for elsewhere is not overridden.

**Asking.** A Home sheet a moment after the first open (sign-up lands
there): what location is for, that it is saved to the account, then the
system prompt. "Not now" waits a week; a city works instead. Booking
screens ask in place through the same chip.

**Everywhere.** The chip ("Indiranagar, Bengaluru · Change") on Home's Book
services, Fitness, Labs, Doctors and Services; Profile shows the place with
its age; Profile, Location has the live switch, each family member's place
("Papa lives in Lucknow", used when booking for him), and "Forget all".
Lab and service address fields fill from the place, with a one-tap "Use
Indiranagar, 560038".

**Privacy.** The policy said "we do not collect precise location". It now
says we do, when allowed, and the change is material: everyone agrees again
once (new version 2026-10-25, hash in 0040). A point goes to the maps
provider from our server, never with a name or user id.

**Verified here:** typecheck, lint (no new errors), 516 tests (16 new: the
parsers against Ola and OSM shapes, cache keys, the move and save rules,
words), 0040 applied twice on local Postgres 16 with its scenarios (save,
jitter skipped, stale address dropped, family place, nonsense refused, RLS,
other family refused, no consent refused, daily cap, quota, cascade on
account deletion) and the check (all yes). The function typechecks with a
Deno shim. Web screenshots with a fake GPS fix: the Home primer, Home with
the live chip, Profile, Profile Location, place search, Fitness, Labs and
Doctors.
**Not verified:** the deployed function against the real Ola and OSM APIs
(this container cannot reach them), and location on a phone (needs the new
dev build from the fitness change).

**Live, next day.** Athar applied 0040 (check all yes), deployed `geo` from
the dashboard with the one-file copy, and set the Ola key as a Supabase
secret. On the phone the place now shows with its pincode. The one-file copy
first broke the web app's production build: the root tsconfig typechecked
`supabase/manual` and failed on `Deno`; it is now excluded like
`supabase/functions` (PR #56). loc-live and int-ola-maps are done.

## Share to Cheeku, and Check and save (int-share-target, loop-scan-ux) · 2026-10-26

**Why.** Most Indian reports arrive as a WhatsApp PDF. Before this the only
way in was to save it, open Cheeku, find Scan and pick it again, and the
record was filed the moment the reader finished, wrong values and all.

**Share target.** `expo-share-intent` (8.0.x, the line for SDK 57; 9.x needs
SDK 58) registers Cheeku AI in the share sheet for one PDF or image (iOS
share extension, Android intent filters for `application/pdf` and
`image/*`). `ShareIntake` in the root layout takes the file, holds it in a
small in-memory store (`src/lib/scan/shared.ts`, never on disk), and opens
Scan once the person is signed in, so a share before sign-in is not lost.
iOS opens the app with a `dataUrl=` link, which `app/+native-intent.tsx`
turns into `/scan?shared=1`. A shared file replaces the three source cards
with the file itself and a "Read it" button; whose it is is still asked.

**Scan.** Two clear choices, Report and Prescription, with the other types
behind "Something else" (and "Not sure, let Cheeku tell"), then the member
pills, then the source.

**Check and save.** `uploadDocument` is now `prepareUpload` (validate,
store, read) then `fileUpload` (write the record). Between them the
person sees what was read. Only fields under the 0.7 confidence line are
asked about, each with an edit box and "Looks right"; the rest sit in a
folded "N read clearly" list. Save writes the corrected extraction
(`applyReview`: touched values get confidence 1, a changed number gets its
flag recomputed from the report's range, date, lab and doctor follow their
fields). Anything left unchecked files as needs_review, so the record says
"Waiting for a check" instead of passing a guess off as read. Discard
deletes the stored file; nothing reaches the documents table. Bulk upload
in the member form still files directly through `uploadDocument`.

**Verified here:** typecheck, lint, 523 tests (7 new: which items are asked
about, filed vs needs_review, corrections, ranges and flags, share
normalising and refusing a video). Web screenshots of the pick screen, the
other types, and Check and save in its states (unsure, ticked, corrected,
all clear for Papa) through a temporary preview route, since web cannot
read a picked file (an old `expo-file-system` limit, noted in PLAN Open).
**Not verified:** the share sheet itself and the whole flow on a phone.
Both need a new dev build (`npx expo prebuild --clean`) or `eas build`.


## DPDP readiness: requests answered, Grievance Officer named, breach plan (sec-dpdp) · 2026-10-27

**Why.** Since 0031 a person could open a rights request from Settings,
Privacy, and it went nowhere: nobody was told, there was no way to answer,
and the person never heard back. The legal texts still said "[Grievance
Officer name]" and the app showed support@baymax.health.

**Named.** Athar Ali is the Grievance Officer, privacy@cheekuai.in and
support@cheekuai.in are the contacts (`src/lib/legal/entity.ts`,
`src/lib/app-meta.ts`). The legal name, address, hosting region and courts
stay as placeholders until the company is incorporated, and the app keeps
saying so.

**Non-material legal versions.** Filling in a contact changes the text, so
Terms, Privacy and Health Data Consent got new versions (2026-10-27) and
hashes. They are published with `material = false`: nothing about what we
collect or share changed, so nobody already signed in is asked to agree
again, while new sign-ups agree to the new text. The database already
supported this (`current_material_versions` only counts material rows and
compares dates); the one thing in the way was a test that required every
consented document to be material. It now checks that each kind has a
material version in force, and that every version is published with the
same `material` the app declares. The Privacy Policy keeps the location line
as its first "what changed", because anyone who has not yet agreed to the
2026-10-25 version still sees the gate, and the gate shows the first change.

**Answering.** Migration 0041: `privacy_queue` (open requests, oldest due
first, days left, overdue; team only, revoked from the app roles),
`answer_privacy_request(id, status, reply, handled_by)` (the only way to move
one on: checks the status, needs a reply before closing, stamps
resolved_at), and a trigger that drops a note in the person's inbox when the
status changes. The note uses the existing `support_update` kind (account
category), so it follows their account notification setting and the push
shows the generic account line. It never repeats what they wrote; a copy
test checks the words and that `details` is never put into a body.

**Alerting.** `privacy-alert` Edge Function, fired by a Database Webhook on
INSERT, emails privacy@cheekuai.in through Resend: kind, received, due date,
id, and the two SQL lines to handle it. Never the text or the account email.
Without a Resend key it does nothing and says so, so the webhook can exist
before the mail account does.

**Written.** `docs/privacy/requests.md` (weekly routine, what each kind
needs), `docs/privacy/breach-runbook.md` (first hour, CERT-In in 6 hours,
people without delay, Board without delay and a full report within 72
hours), `docs/privacy/dpdp-readiness.md` (every duty and where it stands, the
questions for the lawyer, what is left).

**Verified here:** typecheck, lint, tests (legal and copy tests extended),
0041 applied twice on local Postgres 16 with scenarios: queue shows a new
request with 90 days left, closing without a reply refused, a bad status
refused, in_progress then resolved each notify once with the right words, a
closed request cannot be answered again, nothing the person wrote reaches a
notification, the app roles cannot read the queue or call the function, and
current material versions are unchanged. The check file says yes on all six
rows. The function typechecks and its email carries no request text.
**Not verified:** the function against Resend (no key, no network here), and
the webhook on the real project.

## Vision board: the 5-year plan, live and in git · 2026-10-28

**Why.** Athar, Suraj and Deepesh needed one place to brainstorm, prioritise
and stay in sync on the next five years: product, AI, supply, growth, revenue,
employers and insurers, funding, team and trust. The financial model says what
the numbers do; nothing said who does what, when, and what it depends on.

**What.** A live board at https://claude.ai/artifact/KUeA2YYdL4CmUKWhK3faAE,
mirrored in `founder-ops/vision-board/`. Nine lanes across Q4 2026 (pre-launch),
quarters to 2029 and half-years for 2030 and 2031, the grain the founders
picked. 93 cards, 12 risks, 6 moat pillars and 10 tags from the first fill.

**The decision that shapes it.** The board runs the financial model's own
engine (`founder-ops/vision-board/engine.js`, v2). Every column header shows that
period's users, revenue, EBITDA, cash and team, and a card can be placed by
the model instead of a date: "Employers go live", "Series B + 3 months",
"monthly users reach 50 lakh". Those cards move by themselves when a lever
changes, so a slower Series A or a dearer CAC visibly pushes the work that
depends on it. Levers are a private what-if until someone makes them the
plan for everyone.

**Data.** The artifact's shared database is the live record (only editors of
the artifact can read or write it). `board.json` is the git copy, synced by
Claude with `sync.py` (pull, push, diff); the README has both directions.
Owners are the three founders by name, as agreed; Archit is not on it.

**Verified here:** the page against a mock runtime with the seed data at
desktop (light) and phone (dark) widths, every view, no script errors and no
sideways scroll; the published seed read back at the editor level and hidden
at the view-only level; `sync.py pull` of the live data matches the seed
(`diff` empty) and `build` reproduces the published page byte for byte.
**Not verified:** two people editing at once, presence and comments in the
real viewer.

## Vision board v2: built for the weekly sync on a big screen · 2026-10-28

**Why.** The first board was too crowded to talk over: a fixed lane rail ate
a fifth of the width, every column header carried six numbers and a bar, and
every card showed everything at once. The founders wanted a calm surface on a
laptop or a TV, with one card at a time to discuss.

**What changed** (same URL, same data, same model engine):
- No lane rail. Lanes are thin bands with a sticky label, a status bar and a
  collapse toggle, so 4 to 5 quarters fit on a laptop instead of 3.
- Column headers show two numbers and up to two events; the rest is a click
  away in a popover.
- Cards are compact by default and expand in place (chevron per card, or
  Expand all). Low-signal marks are gone: no P2 badge, no "planned" status,
  no kind label on plain initiatives.
- A discussion sheet: the card grows out of the board into a large centred
  sheet, with arrow keys to walk the plan quarter by quarter, E to edit in
  place and Esc to shrink back into the card. Discuss starts from this
  quarter. Editing cards and risks happens in the same sheet.
- Filters, levers and the change feed moved into popovers off one
  translucent toolbar; the plan strip keeps four headline numbers, active
  filter tokens and the what-if state.
- Motion: model-placed cards glide to their new quarter when a lever moves
  (FLIP, interruptible), popovers scale from their buttons, cards stagger in
  on view changes, press feedback on every control, all off under reduced
  motion. System type with size-specific tracking; Apple greys.

**Verified here:** every view, the sheet (view, next and previous, edit),
risk editing, the lever glide, filters, collapse and expand, against a mock
runtime with the seed data at 1440 and 1280 (light) and 390 (dark): no script
errors and no sideways scroll. `sync.py build` reproduces the published page
byte for byte. **Not verified:** presence and comments in the real viewer.

## Vision board v3: tags, the card sheet, a live trajectory, three new moats · 2026-10-28

**Why.** After v2 the founders asked for: a visible way to open one card on the board; type and layer tags so product work reads at a glance; a better card layout for discussion; a Trajectory page you can play with rather than read; and three more pillars of defensibility.

**What changed** (same URL; the data change went in through the board's database, pinned to the versions read first, so a teammate's edit to "Incorporate the company" was kept):
- An eye at the bottom of every card opens that card's why, done-when and confidence in place.
- Tags now have groups. Type: Feature, Product addition, New product (solid pills). Layer: App, B2B, Model, Hardware (tinted pills). 73 cards are tagged, every product card has a type, and the filter and the editor show the groups.
- The card sheet is rebuilt. A lane-tinted header holds the pills, the title, four facts (owner, when, priority, a confidence ring) and a status track. The body has why, how as numbered steps when written as a list, a finish-line block, the card on a five-year timeline with now and model events, a connections flow (needs first, this card, then unlocks), risks, moat and decision votes.
- Trajectory is interactive. A month cursor drives six KPI tiles with sparklines and year-on-year change, a play button and scrubber with model events, crosshairs and tooltips on all three charts, legend toggles, a scenario switch on the page, the period column lit in the tables, and milestones under the users chart. Charts grow in on entry and tween between scenarios.
- Moats: three new pillars with live model numbers, nine new cards and 14 cards re-linked:
  - **Insurance risk infrastructure.** Metric: insurance revenue a year. New cards: corporate agent licence, claims help in chat, family floater priced from our risk score.
  - **Connected ecosystem in one app.** Metric: share of revenue from in-app services. New cards: one home for every service, family wallet, Cheeku ID.
  - **Pendant for elder parents.** Metric: pendants with elder parents. New cards: a 1,000-parent pilot, fall detection and SOS, the pendant through employers and insurers.

**Verified here:** the page against a mock runtime with the live data plus these writes, at 1440 and 1280 (light) and 390 (dark). I checked the board, the eye toggle, four card sheets (initiative with steps, model-placed milestone, decision, pendant), trajectory draw-in, hover on users and revenue, play, legend toggle, the bear tween and moats. There were no script errors and no sideways scroll. Both write batches committed atomically. `board.json` is pulled from the live board afterwards, and `sync.py build` reproduces the published page byte for byte. **Not verified:** the new pages in the real viewer with two people at once.


## Founder ops folder · 28 Oct 2026

Founders' planning material now lives in `founder-ops/`, outside the app. The
vision board moved there from `docs/vision-board/`. `founder-ops/library/` holds
text snapshots of the seed and DD decks v2, the founders' note, longevity thesis
v2, build list v2 and the launch readiness plan, with superseded docs under
`archive/`. `founder-ops/model/report.js` prints bear, base and bull from the
board's engine. ESLint and TypeScript skip the folder, and
`founder-ops/check-isolation.sh` fails a branch that mixes ops files with app
code. The launch and LabStack trackers stay in `docs/` because engineers update
them with app work. See `founder-ops/README.md`.

## Prescription scorecard on ten standards (loop-reading-v2, ai-rx-score) · 2026-10-31

**Why.** A new prescription raises the same questions every time: is it right for this person, what is actually in it, does it clash with what they already take, and can it cost less. Cheeku has the person's records, so it can answer from them rather than in general. This is the "8 of 10 checks" scorecard the tracker has carried since the first audit.

**The ten standards**, in the order they are shown:
1. Every salt identified (brand to salt).
2. No banned combinations (CDSCO notification, June 2023).
3. Allergies.
4. Their other medicines (from other prescriptions still running and their own list).
5. Dose for their age and weight (adult daily limits; mg/kg for children; under 3 months, paracetamol only on a doctor's word).
6. Not doubled up (same salt, or two of a class that should not stack).
7. Their conditions (kidney function from eGFR when on file).
8. Pregnancy and breastfeeding (from the pregnancy in memory).
9. Their reports (a statin with a high LDL fits; thyroxine with a very low TSH asks about the dose).
10. Clear instructions (dose, how often, how long; antibiotics need a course).

**How it decides.** Each check is clear, to sort, ask first, or couldn't check. "Ask first" (red) is kept for an allergy match, a banned combination, a medicine not used in pregnancy and a known dangerous pair. Nothing ever says "stop taking": every finding that needs action becomes a question for the prescriber, ready to send. A medicine outside the formulary is "couldn't check", never fine.

**Where it runs.** The rules are one file with no imports, `supabase/functions/rx-score/rx.ts`. The `rx-score` Edge Function scores as the signed-in person, with their own token and no service key, so RLS decides what it can read. The card is kept in `rx_scorecards` (migration 0042), with RLS that only allows a card for the owner's own prescription. A trigger clears the card when the prescription is edited. The app reads the kept card first, then calls the function, then scores on the phone with the same code if the function is not deployed. Metro, Vercel and EAS build from `mobile-react-native` only and cannot bundle code outside it. So the app keeps an exact copy of the rules (`src/lib/rx/engine.ts`), and a test fails if the two differ.

**Design.** The screen is built from the app's own parts: `Reveal`, `Gradient`, the `Card`/`Section` of record pages, `Tap` press feedback, semantic colours for health meaning only, and the type and radius scales the lint enforces. The order follows the questions:
1. The verdict, with a ring counting the clear checks.
2. The medicines and their salts.
3. The ten checks. Each opens to its findings and links to the record each one rests on.
4. The questions for the doctor, ready to send.
5. Same-salt prices.
6. Ordering.

Rows expand on a critically damped spring and skip motion under reduced motion. A scroll-edge fade sits under the floating bar.

**Verified here:**
- 12 engine tests: the demo family, an allergy, a banned combination, a statin in pregnancy, an overdose, a doubled salt, an unknown brand, a missing antibiotic course, the formulary, and the app copy in sync.
- The full suite passes (536 tests), and so do the typecheck and lint for the new files.
- Migration 0042 and its check, on a local Postgres with all migrations.
- RLS: another account reads none of the cards and cannot write one.
- The edit trigger clears the card.
- The function's code run as the person through a local PostgREST stand-in.
- The flow in the web preview: the prescription page card, the scorecard, expanding a check, opening a source record, and three members (8 of 10, 10 of 10, 10 of 10).

**Not verified:** the Deno function deployed on Supabase, a phone, and clinical sign-off of the formulary.

## The root vercel.json stopped the mobile deploys · 2026-10-31

Commit e58c00c added a root `vercel.json` with `git.deploymentEnabled: false` to stop the Next.js `cheeku-ai` project building. `cheeku-ai-mobile` reads the root file as well, so from that commit on it made no Preview or Production deployments, including the merge of #65 (303ab27) that carried the prescription scorecard and the rename. The file is removed, and the next push to `main` builds Production again. The Next.js project is switched off in the Vercel dashboard instead (AGENTS.md, "How a merge reaches people"). The `marketing/` typecheck exclusion stays, so its builds would not fail even if it ran.

## Dead code out of the mobile app · 2026-10-30

A reachability pass over `mobile-react-native`: every route in `app/` as an
entry point, imports followed through `@/` and relative paths, then knip for
unused exports and dependencies, then `tsc --noUnusedLocals` to catch what
each removal orphaned. Nothing a screen can reach was touched.

**Removed.**
- Files nothing imports: `components/app/coming-later.tsx` (every stub it
  served is a real screen now), `lib/cn.ts`, and `lib/ai/mock/fixtures/family.ts`
  (the seed data lives in the root project and `scripts/demo-family-sql.ts`).
  Also an untracked `index.js` from the Expo template that imported a
  non-existent `./App`; the entry is `expo-router/entry`.
- Unreferenced components: `Bob`, `Dots`, `StatsCard` and its `STAT_CELLS`,
  `RecordRow`, `SectionTitle`, `TapToWiggle`, `UploadScene`.
- Unreferenced functions and constants: `addReminder`, `endPregnancy`,
  `allFaceIds`, `isFaceId`, `canShare`, `clockTag`, `flagLabel`,
  `forgetCarePlans`, `hasSupabaseConfig`, `inheritAtBirth` (migration 0030's
  `promote_pregnancy` remains the one definition), `journeyFor`, `nudgeByKey`,
  `removeDailyLog`, `duration`, `SUPPORT_RESPONSE`, `CONSENT_VERSION`,
  `audienceSchema`, `SEVERITY_STAT_LABEL`, `SEVERITY_PILL`, `SEVERITY_DOT`,
  `FLAG_PILL`, and unused re-exports and inferred types.
- `changePassword` and `updateHealthProfile` with their schemas and the
  `parseMedications` helper. Both were superseded: Security changes a password
  by reset email, and Health profile saves through `saveMemberHealth`.
- Dependencies nothing imports: `clsx`, `tailwind-merge`, `react-hook-form`,
  `@hookform/resolvers`.

**Kept on purpose.** Tests and their fixtures; `mascot/wasm.web.ts`, which
knip flags but Metro picks for web; `babel-preset-expo`, used by
`babel.config.js`; seven helpers only tests call (`NUDGE_LIMIT`, `PLAN_ORDER`,
`courseQuantity`, `isRegistered`, `nextSlot`, `parseDoseKey`, `promptsFor`),
because each pins a rule; and exports used inside their own file.

**Found, not fixed.** `app.json` points Android's adaptive icon at
`./assets/adaptive-icon.png`, which does not exist; the
`android-icon-*.png` files beside it look like the intended art. A native
Android build will need this fixed.

**Verified here:** typecheck, typecheck with `--noUnusedLocals` (clean, as
before), 476 tests, and `expo export` for iOS, Android and web.
**Not verified:** on a device. No screen's behaviour should change, but
nobody has looked.

## The Next.js app is removed · 2026-10-30

The web app at the repo root had been the reference since 2026-08-09, when
Baymax became mobile-only. It was incomplete and unmaintained, the mobile app
imported nothing from it, and every flow it had now runs in
`mobile-react-native` (on the web too, through the Expo web export). So it is
gone: `src/`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, the
web copy of `scripts/build-lexicon.ts` (the mobile app has its own), the `pnpm
dev` launch config, and every web dependency. It is in git history before this
entry.

**What the root keeps, because the mobile app's backend needs it.**
`supabase/` (migrations, Edge Functions, SQL-editor steps; the mobile tests also
read migrations from here), the migration runner and seed scripts, and the two
database tests, moved from `src/lib/db/` to `tests/db/`. The demo-family
fixture `scripts/seed.ts` reads moved from `src/lib/ai/mock/fixtures/` to
`scripts/fixtures/`. The root `package.json` is now only that tooling:
supabase-js, pg, tsx, typescript, vite (for `loadEnv`), vitest and prettier.
`.env.example` keeps the `NEXT_PUBLIC_SUPABASE_*` names so existing
`.env.local` files keep working, and drops the two web-only variables.

**Docs updated:** the README now describes this layout; `AGENTS.md`,
`PLAN.md`, `SECURITY.md` (test paths, the service-role key, the web-only
headers section marked as removed) and `PRIVACY_NOTES.md` (paths now point
at the mobile files); and a dated note on `REACT_NATIVE_BUILD.md` and
`SHIPPING.md`, which describe the web app.

**Found, not fixed: `tests/db/rls.test.ts` fails 18 checks, and did before
this change** (same 18 at the previous commit, run from a clean worktree). All
of them are catalog and config tables (`app_config`, `app_flags`, `articles`,
`daily_logs`, `lab_offers`, `lab_partners`, `lab_result_templates` and
others) whose policies do not reference `auth.uid()` or have no select
policy. Those look intentional for public catalog tables, which would mean
the audit's rules are stale rather than the database being open, but each
needs checking by whoever owns the schema before the audit is relaxed.

**To do outside the repo:** disconnect the `cheeku-ai` Vercel project. It
built the repo root and has nothing left to build.

**Verified here:** root typecheck; `seed.ts` resolves its moved fixture
(stops at the missing-credentials check, as it should); the RLS audit runs
from its new path with the same results as before; the mobile app's
typecheck and 476 tests are unchanged.

## One folder for the app, SDK 58, and main merged in · 2026-10-31

**Why.** Expo Go on the owner's phone runs only SDK 58, so the app would not
open on a phone, and the app's docs, database and tests were spread across the
repo root, reached through `../` paths.

**What moved into `mobile-react-native/`.** `supabase/` (migrations, SQL-editor
steps, Edge Functions including the new `geo`, `rx-score` and
`privacy-alert`), `docs/` (with `docs/privacy`), `design/`, the database tests
(`tests/db`, run with `npm run test:db`), the root Markdown docs, every Claude
skill (the founder skills too), and, on the owner's call, `founder-ops/` and
`marketing/`. Those two stay walled off: excluded from `tsc`, Metro's
`blockList` and the root ESLint, and `check-isolation.sh` was repointed.

**What stays at the root, on the owner's call.** The Next.js web app (`src/`,
`next.config.ts`, pnpm files, `scripts/`), unchanged except that `migrate.ts`,
`sql-editor-steps.ts` and `src/lib/db/rls.test.ts` now read
`mobile-react-native/supabase/`. It is the reference and does not deploy. The
earlier note on this branch that it had been removed was corrected, and
`.github/pull_request_template.md` stays at the root because GitHub only reads
it there.

**SDK 58.** Expo 58, React Native 0.88, React 19.3. Code changes: the custom
tab bar takes `emitter` and `navigateToTab` (Expo Router dropped the
`navigation` prop), refs are typed `ScrollViewInstance` / `TextInputInstance`,
the data export uses `File.writeSync` (`write` is async now), `yaml` is a
direct dev dependency, and `expo-share-intent` moved to 9.0.0 (its SDK 58
line). That module is optional at runtime, so Expo Go opens the app and only
the share sheet waits for a development build. `app.json` lost three keys SDK
57 no longer accepts and points the Android icon at the files that exist.
Expo CLI needs Node 22.13+ or 24 (not 25).

**Verified here:** app typecheck, 537 tests, `expo-doctor` 20/20, an iOS
bundle export; the web app's typecheck and tests (unchanged from main), its
lint (fewer errors than main, since the demo code is no longer linted). The
RLS audit fails the same 22 checks in both copies, as it does on main.
**Not verified:** on a phone or in Expo Go.

## iPhone: rows that stacked, a blank Due soon, a hidden bell · 2026-11-01

Reported from Expo Go on an iPhone, on main after the SDK 58 move: on Home the action plan rows drew the icon, the title and the chevron one under another, and the streak card sat over the list. Due soon showed an icon in an empty box. Notifications fell apart (the selected "All" chip was blank, "Mark all read" stacked, the count tiles lost their shape). The Profile family row stacked, and the avatar picker misbehaved. The web build showed none of it.

**Why.** NativeWind registers React Native's `Pressable` for `className`, so every Pressable renders through NativeWind's native runtime, className or not. That runtime copies an inline style with `{ ...style }` (`react-native-css-interop` 0.2.6, `applyRules`), and spreading a function gives `{}`. 58 Pressables in the app used `style={({ pressed }) => ({ flexDirection: "row", ... })}`, so each lost every rule: direction, padding, gap, background and size. The "All" chip went blank because it lost its ink background and kept its white text. The web uses a different NativeWind runtime, which is why it looked right.

**Fix.**
- `src/components/ui/pressable.tsx` is a drop-in Pressable. It keeps the pressed state itself and works out the callback before NativeWind sees it, so a plain object always arrives. Same props, same callback, so the 37 files that used React Native's Pressable only changed their import.
- An ESLint rule (`no-restricted-imports`, an error) refuses `Pressable` from "react-native" in the app. `ui/tap.tsx` is exempt because it passes an array, never a callback.
- The bell's "9+" badge sat inside the circle and covered the top half of the bell. It now sits on the rim.
- Avatars draw the face first and lay a photo over it. The Profile card and its family row showed bare coloured circles on the phone, while Home showed the same people's faces. That cause is not pinned down from the cloud: the data is the same on both screens and the images bundle correctly for iOS (checked in an exported iOS bundle). A photo link that neither loads nor errors would leave exactly this, and now it leaves the face instead.

The streak card overlap should go once the rows have their height back. That needs checking on the phone.

**Verified here:** the typecheck, 537 tests, lint (no errors, the same 54 warnings as main), a probe file that the new rule rejects, and an iOS bundle export. Web screenshots of Home, Notifications, Profile and Edit profile against the local stand-in. Those only show layout and copy, and the web never had the bug.
**Not verified:** on an iPhone. Check Home (plan rows, streak card, Due soon, bell), Notifications (header, count tiles, chips, rows), Profile (avatar, family row) and Edit profile (the face grid and choosing a face).

## iPhone sweep: the rest of the app, the 8:00 pm tile, the inbox socket · 2026-11-01

After #68 the owner confirmed Home, Notifications and Profile on the phone and asked for every other screen to be checked for the same kind of fault.

**Checked across the whole app** (an AST pass over every `.tsx` in `app/` and `src/`, not a sample):
- A style callback on anything but our Pressable: none left.
- `className` on a component NativeWind does not handle on native (it keeps the class on web and drops it on a phone): one, the "Coming up" `Animated.View` on Notifications, whose margin was lost. Now an inline style.
- Tailwind classes React Native ignores (grid, space-x/y, divide, hover:, first:/last:, line-clamp, sticky, fixed and the like): none.
- Browser-only inline styles (fixed or sticky position, vh and vw, calc, grid display, cursor, backdrop filter): none.
- Line heights below the font size, which clip text on iOS: none.
- Web screenshots of 24 screens: services, doctors, consult chat, labs (home, choose, test, partner, bookings, booking), fitness (list, bookings, booking), chats, a conversation, appointments, care, records, add a record, medicines, today, family, plans and Ask. None looked off.

**Fixed:**
- Fitness class tile: "8:00 p / m". The tile strips " am"/" pm" by matching a plain space, but iOS formats times with a narrow no-break space (U+202F), so nothing was stripped and the full time wrapped in the 60pt tile. It now matches `\s`, and the line shrinks to fit rather than wrap.
- "cannot add postgres_changes callbacks after subscribe()": supabase-js returns an existing channel when the name matches, so when the inbox hook mounted again before the old channel was removed, it added listeners to a subscribed channel. Each mount now gets its own channel name. The filter, not the name, decides which rows arrive.

**Still open: bundled images that do not draw on the phone.** After the restart, faces were still empty circles on Add a record and Cheeku's face was blank in the chat header, while Home showed faces. The bundle hands `<Image>` valid asset ids, and the dev server returns both files (checked: the iOS dev bundle the phone loads, and the asset URLs it builds). So the failure is in loading on the device. In development, `src/lib/dev/image-failure.ts` now puts a LogBox warning up with the address and the native error whenever a face or Cheeku's face fails, so the next run says why. One guess to rule out: a `--tunnel` session throttling image requests.

**Verified here:** the typecheck, 537 tests, lint (no errors, the same 54 warnings) and the web screenshots above.
**Not verified:** on an iPhone.

## New accounts: a right swipe on Home "signed out" · 2026-11-01

Reported on an iPhone: a first-time user who swiped right on Home landed on the welcome screen, as if signed out.

**Why.** Nobody was signed out. Welcome pushes sign-in, sign-in hands over with `router.replace(landing)`, and each onboarding step pushes the next (who, profile, journey, first-upload, plan). The plan ends with `router.replace("/home")`. Replace only swaps the top screen, so a new account reached Home with the whole of onboarding and welcome still underneath. The iOS edge swipe popped back through it. A returning user had welcome under Home in the same way. The same pattern ran through other flows too: a finished booking replaced its last step with a second Home on top of the booking flow, and sign-out put welcome on top of the signed-in stack, so a swipe there went back into the app.

**Fix.**
- `startFresh(router, href)` clears the stack (`dismissAll`) and then replaces. It is used by sign-in, all three ways out of the plan step, the booking confirmation, the family "go home" exits, and the three sign-out paths (Profile, app lock, the consent gate).
- Swipe-back is off on the tab shell, the splash, welcome and who. These are roots: nothing should sit under them.
- Welcome now checks for a session. If one exists, it sends the person to their landing instead of showing what looks like a sign-out.
- New-user layout: on the starter Home the unlock card's body text ran under the mascot (the title had clearance, the body had none), and the first step's title was cut to "Add your latest rep…" by the "Opens Today" pill. The body now keeps clear of the mascot, and step titles wrap to two lines.

**Checked:** web screenshots of a brand-new account through the consent gate, who, profile, journey, first-upload and plan, the starter Home (all of it), Records, Ask, Profile, Add a record and Book services, plus welcome and sign-in signed out. Typecheck, 537 tests, lint (no errors, the same 54 warnings).
**Not verified:** on an iPhone, and the swipe itself, which a browser cannot do. Check a fresh sign-up end to end: a right swipe on Home should do nothing, sign-out should leave nothing to swipe back to, and finishing a booking should leave Home with nothing behind it.

## Records: the header + is gone · 2026-11-01

The owner asked for it: the centre + in the tab bar already adds a record from every screen, and a filed record lands in the list sorted and tagged, so a second add button in the Records header only made it busier. Cheeku at his desk stays. The empty state keeps its "Add your first record" button, because a new user with nothing filed needs the way in on the page itself.

## Insurance: the whole family's cover, and Cheeku explains it · 2026-11-01

**What the audit found.** Insurance existed only as a record type (0028): a full model (insurer, number, floater or individual, sum insured, claimed, members, TPA, cashless, co-pay, room rent, waiting periods, claims), a record page and a Health file card. There was no way to get a real policy in. The document reader is still a stand-in, so an uploaded policy filed with no details and never showed. The Niva Bupa card on the owner's account was demo seed data. Chat never saw insurance. There is no public insurer API: Bima Sugam isn't open to third parties and ABHA doesn't carry policies.

**What the owner chose.** Upload plus a quick form. No auto-fetch for now, but a shape a partner feed can fill later. One Insurance screen in Profile for the family, with a floater entered once and linked to everyone it covers. Chat explains cover from the policy's own terms.

**Built.**
- Migration 0043, `insurance_policies`. One row per policy, not per person.
  - `covered_profile_ids` lists the members it covers; `document_id` optionally points at the uploaded PDF, which is filed as an Insurance record under the first person covered; `source` is manual, document or partner.
  - RLS: only the owner reads or writes, a policy can only name the owner's own members and documents, and removing a member takes them off every policy.
  - It's a table rather than a record because a record needs a file and belongs to one person, and a partner feed will hand us fields, not files.
- `src/lib/insurance`. `policy.ts` handles reading, validation (rupees typed as "5 lakh", "5,00,000" or "1.5 cr") and rows; `explain.ts` has the plain-words summary and the chat answers; `queries.ts` loads and saves.
- Profile > Insurance (`app/insurance`): the family's policies as teal cards with faces, a policy page, and an add/edit form. The essentials come first; TPA, room rent, co-pay, waiting periods, inclusions and exclusions sit behind "More about this policy".
- Health file: the policies covering the person replace any record card for the same document, renewals within 60 days join "Coming up", there's a Manage link, and "Add insurance" shows when nothing covers them.
- Chat: a cover question with nothing medical in it is answered by rules from the saved policy, with no model call. The answer is either in a field or it isn't, and a model would only add room to guess. Where the policy is silent it says so and names who can confirm. A saved exclusion named in the question ("cosmetic surgery") is caught. With a symptom alongside, the model answers and the digest carries the cover as plain lines. "Cover the wound" is first aid, not insurance; tested.
- The data export includes the table.

**Verified here:** 0043 on the local Postgres with its check (five yes rows). RLS: another account can't read, can't name Arjun's members, and can't write as him. The member-removal trigger works. 560 tests, including 23 new ones. Typecheck, and lint with no errors. Web screenshots of the list, policy page, form (add and edit), Health file, Profile row and two chat answers.
**Not verified:** on an iPhone, and 0043 in Supabase. It has to be applied before anything saves.

## The insurance card, redesigned · 2026-11-01

The owner didn't like the dark teal card: distinct, but it sat on the lilac glass like something from another app. They asked for the lime of the "Open now" pill or baby pink.

**Lime, as a light pass.** Lime is already the app's "live, available" accent, so "you're covered" means what green already means here. Pink is the pregnancy and vaccine tint in this app, so it would have blurred meaning. The card is now a lime wash fading to white with ink text and a quiet shield watermark, laid out like the physical card:
- the insurer and plan at the top, at full width
- "Available to use" as the one big number, with how much of the cover is left as a slim bar
- the status as a pill beside it: ink with lime text while active, orange within 30 days of renewal, slate once ended or before it starts
- the faces of the people covered and a masked policy number ("•••• 0918") at the foot

The card colour never changes, only the pill, and these are `hue` accents, not `semantic` health colours (Rule 3).

**One component.** `CoverCard` in `src/components/insurance/parts.tsx` draws every policy: on the Insurance list and page, and in the Health file, which used to draw its own copy. The Health file's "Add insurance" row moved to the same lime and ink.

## The insurance card: back to the original teal · 2026-11-01

The owner rejected the lime card: the green didn't suit the app, and the washed-out, see-through look (the faint watermark, the faded ended state) made the card weak. They preferred the original teal, so the colours are back: the ocean-to-teal gradient (`hue.ocean.fg` to the new `hue.ocean.mid`, the same two stops as before) with white text. Nothing translucent is laid over the card, and an ended policy is no longer faded. Only the status pill changes, and it is solid: white with teal text while active, orange near renewal, slate once ended. The layout fixes stay because they only rearrange: insurer and plan at full width, status beside the amount, the people covered and a masked policy number at the foot. Lesson for next time: show the owner a colour change before shipping it.

## Cheeku's "hat": eyelids drawn unclipped on iPhone · 2026-11-01

Reported on an iPhone: a flat purple shape sat on Cheeku's head on Home (the desk pose) and elsewhere, and it moved, which looked like a bug.

**Why.** Those are his eyelids. In `working`, `think`, `worried` and `joy` each eyelid is clipped by an eye-shaped stencil (a track matte), and the file names that stencil with `tp`, a Lottie 5.7 field, with the stencil far down the layer stack. The web player honours `tp`. lottie-ios on the phone does not, so it never found the right stencil and drew the eyelids whole: a disc resting above the eyes that swung down over the face on every blink. Rendering the old file with the matte removed reproduces the owner's screenshot exactly.

**Fix.** Each stencil now sits directly above the eyelid it clips, and `tp` is gone: the classic matte form every renderer reads. A stencil is never drawn, so nothing else moves; rendered with lottie-web, the blink is now correct at frames 66 and 118. `scripts/recolor-mascot.mjs` does the same rewrite (`classicMattes`) so a re-export can't bring it back, and rerunning it reproduces the committed files byte for byte. `think`, `worried` and `joy` have no source copies, so they were fixed directly.

**Not verified:** on the iPhone itself.

## Back buttons: "GO_BACK was not handled by any navigator" · 2026-11-07

Reported on an iPhone while moving around the app and going back: a red console error, "The action 'GO_BACK' was not handled by any navigator".

**Why.** `router.back()` throws when the screen is the first entry in its stack. That is common here: sign-in and onboarding clear the stack (`startFresh`), a reminder or link can open a screen cold, and a `replace` swaps out whatever was behind. Eight back controls already checked `canGoBack()` first. Six did not:
- the doctor's slot screen, both its back button and the "That doctor isn't available" link
- an article's "That article isn't available" link
- removing a policy on the insurance page
- removing a family member
- saving pregnancy dates

**Fix.** One helper, `goBack(router, fallback)` in `src/lib/nav/go-back.ts`: back when there is something behind, otherwise straight to a sensible screen. The fallbacks are the doctor list, Home, Insurance, Family and the Health file. All 14 back controls now use it, the ones that were already safe included, so there is one way to do it. A lint rule (`no-restricted-properties` on `router.back` and `navigation.goBack`) fails the build on a bare call. The only exception is onboarding's back, which has no fallback on its first step and keeps its own check.

**Not verified:** on the iPhone itself. Typecheck, lint (0 errors) and all 560 tests pass.

**Follow-up, same day.** The owner still saw the warning. One gap was left: Expo Router queues navigation, so a second tap on back while the screen is still sliding out reads the old stack, passes `canGoBack()`, and sends a GO_BACK with nowhere to go. `goBack` now ignores a repeat within 600ms, the length of the slide. Three tests cover back, fallback and the double tap. Note that `main` doesn't have any of this yet, so a build from `main` still shows the warning.

## Neutral redesign, batch 0 and 1 · 2026-11-11

**Why.** The owner's review: too many things competing on every screen, and
a look that reads as generated. The reference they liked is a grey-white
canvas, flat white cards, black actions and one accent used only for state.
An audit of all 59 screens found the same causes everywhere: lavender on
every surface, violet doing every job (buttons, links, icons, labels, hero
cards), glass and shadow on every card, a colour per category, the mascot
inside cards on 34 files, uppercase tracked labels, and violet italic
headline lines.

**Decisions (owner, 2026-11-11).** Neutral canvas with ink actions and violet
as the single accent. The mascot stays in Ask, empty states and onboarding
only, and stays the blob for now (the sparrow is the logo, not yet the app
character). Restyle and declutter are allowed; flow, data and backend are not
touched.

**Batch 0, foundation.** Done in `src/theme/tokens.ts`, `tailwind.config.js`
and the shared components, so most screens changed without being opened:

- ink, canvas, surfaces and lines are neutral; `lilac.*` and every `hue.*`
  resolve to neutrals; `brand` 50 to 300 are neutral and 400 up stay violet.
- `Gradient` draws a flat fill (white, or its own first stop when dark, or
  nothing when it fades into the canvas). `Backdrop` draws nothing.
- `glass.fill` is the canvas grey (a chip on a white card), `fillStrong` is
  white (a panel on the canvas); shadows are near zero except `e2`.
- `Button`, `PillButton`, `GlassCircle dark`, save bars and message bubbles
  are ink. A scripted pass moved 47 solid violet backgrounds to ink and 204
  unconditional icon colours to ink; ticks, badges, toggles, selection and
  links keep violet.
- `<Brand />` inside a sentence is plain text; `type.eyebrow` and 29 inline
  uppercase labels are sentence-case captions.

**Batch 1, core tabs.** Home, Today's plan, Ask, Records, Profile: mascot out
of cards and headers, text at full width, grey second headline line, grey
plan sub-lines, no sparkle icons.

**Still to do.** Batches 2 to 6 (records and health, family, booking,
settings, onboarding): per-screen leftovers such as hard-coded pink, teal and
peach fills, mascots in cards and stacked boxes.

**Verified.** `tsc` and 563 vitest tests pass. Screens were looked at in the
web build against the local mock backend only. ESLint would not start in the
cloud session (module resolution error), so lint was not run. Not verified on
a device.
