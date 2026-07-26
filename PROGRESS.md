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

## Phase 2 — Safety + data model · not started

Next up: `lib/safety/` (lexicon, detector, frozen 150/150 test suite), then
migrations with RLS in the same file per table, then seed fixtures.
