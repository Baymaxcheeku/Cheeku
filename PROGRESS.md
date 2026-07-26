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

## Phase 3 — Auth + onboarding (A1–A6) · not started

Email/password primary per the ruling, with Google, Apple and Phone(OTP)
secondary. DPDP consent checkbox on the Create account tab, unticked by default,
written to `consent_log` with version and timestamp.
