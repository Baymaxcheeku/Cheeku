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
2. **Sign-ups are rate limited to roughly 2/hour.** Email confirmation is on and
   no custom SMTP is configured, so every sign-up sends through Supabase's
   built-in mailer, which is throttled hard. `email rate limit exceeded` will
   block Phase 4 testing and anything resembling real use. Either turn off
   "Confirm email" for development, or configure SMTP. **Unresolved — needs a
   dashboard change.**

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

## Phase 4 — Memory core (D1–D3, C1–C2) · not started
