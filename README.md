# Cheeku AI

A family health-memory app. Upload medical documents, have them read and
organised, and ask questions that are answered **from your own records** — never
from general medical knowledge.

India-first: ₹ pricing, UPI checkout, Hindi/Hinglish in the safety lexicon,
112/108 and Tele-MANAS as the emergency numbers.

## The five rules the code enforces

These are not aspirations in a doc. Each is enforced somewhere specific, and
most have tests whose only job is to fail if someone reverts them.

1. **Never diagnoses, prescribes or gives dosages.**
   `src/lib/ai/mock/answer.ts`, `src/lib/records/insight.ts`. Ten tests in
   `answer.test.ts` assert the output never names a condition, a drug or a
   quantity.
2. **The safety gate runs before any AI call** — client-side, deterministic,
   well under 200ms. `src/lib/safety/detect.ts`, called as the first statement
   of the chat's only send path.
3. **Profiles are isolated**, enforced at the database layer.
   `src/lib/db/profile-isolation.test.ts` proves it at runtime against a real
   database.
4. **Grounded or silent.** If the records do not cover a question, the app says
   so and explains why, rather than improvising.
5. **Never sells or leaks data.** No third-party origins in the CSP. No
   analytics. See `PRIVACY_NOTES.md`.

## Running it

```bash
pnpm install
cp .env.example .env.local        # then fill in the Supabase values
pnpm db:migrate                   # apply migrations (idempotent)
pnpm seed                         # optional: the demo family
pnpm dev
```

`.env.local` needs a Supabase project URL, its publishable and secret keys, and
`DATABASE_URL` (Dashboard → Connect → Session pooler) for the migration runner.
Everything is documented in `.env.example`.

**Demo account** after seeding: `demo@baymax.test` / `baymax-demo-2026!`

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm verify` | typecheck → lint → test → build. Run before committing. |
| `pnpm db:migrate` | Applies pending migrations. Safe to re-run. |
| `pnpm db:reset` | Drops and re-applies. **Refuses if any table has rows.** |
| `pnpm seed` / `seed:reset` | Demo family. Refuses a non-local project without `SEED_ALLOW_REMOTE=1`. |
| `pnpm safety:build` | Recompiles the safety lexicon from YAML. |
| `pnpm test` | Vitest. Includes the live RLS and isolation suites. |

## How it is arranged

```
src/
  app/
    (onboarding)/      A1–A6  splash, carousel, auth, audience, profile, first upload
    (app)/             the signed-in shell — tab bar, offline banner, error boundary
      home/            B1     scoped to the active family member
      records/         D1/D2  list, and one document with its extracted values
      timeline/        D3     the same records by month
      scan/            C1/C2  upload, processing, extraction review
      ask/             E1/E2  chat, grounded and cited
      settings/        I1     plan, family, export, delete
  components/
    illustrations/     original SVG artwork — see "Artwork" below
    safety/            G1 emergency escalation
    billing/           paywall and checkout
  lib/
    safety/            the gate: lexicon.yaml → generated matcher → detect()
    records/           queries, grouping, severity, insight
    ai/mock/           extraction and answer engines behind a mock adapter
    billing/           plans, quota, entitlement
    account/           export and delete
```

## Design fidelity, and where it stops

The build follows the 42 design frames closely — tokens are **sampled from the
PNGs**, not taken from the written spec. Where a frame and the spec disagreed,
the frame won.

Where a frame and a **safety rule** disagreed, the rule won. Three cases, all
recorded in `PROGRESS.md`:

- The chat frames answer with a diagnosis (*"may indicate mild anemia"*) and a
  dosage (*"2000–4000 IU daily for 8–12 weeks"*). The layout is reproduced
  exactly; the content is not.
- The escalation's final step marks "Notified your emergency contacts" as
  *Completed*. Nothing is sent, so it does not claim to have been.
- The home insight card shows an invented appointment reminder. The shape is
  kept; the content comes from the records.

The frames also disagree with each other on pricing. ₹99 / ₹249 is used — the
profile screen, both paywall screens and the paywall filenames agree on it; one
frame's ₹499 / ₹899 is the outlier.

## Artwork

All illustrations are **original SVG** in `src/components/illustrations/`. They
were previously crops from the design mockups, which could not be made to work:
the crop carries the frame's near-white backdrop, that backdrop cannot be keyed
out (it sits eight levels from the mascot's white body), and the resolution is
fixed at whatever the mockup was exported at.

Vector art has no backdrop, stays sharp at any density, and took `public/` from
1.7MB to 20K. The mascot is built from the same primitives the frames use
rather than traced from them — which also means the app is not shipping a copy
of a character somebody else owns.

## What is not built

- **F1 pre-consult brief** — cut from V1 deliberately.
- **C3 camera verdict** — not started.
- **A real payment provider** — checkout is a mock. No credential is ever
  collected; `activateTier` is the only place a plan changes, so a real webhook
  calls that and nothing else moves.
- **A live AI model** — answers come from a deterministic mock behind the same
  adapter shape a real one would use.
- **Rate limiting** on auth and AI endpoints. The chat quota bounds free-tier
  cost; the rest is unbounded.
- Licensed General Sans / Clash Display fonts — Inter is the spec'd fallback.

## Before this goes anywhere real

- Re-enable **email confirmation** with real SMTP. It is off for development, so
  anyone can register an address they do not own.
- Rotate the Supabase **secret key and database password**.
- Raise Supabase's **minimum password length** from 6 to 10 to match the app.
- Add rate limiting.
- Decide a **retention policy** — there is currently none.

## Further reading

- `PROGRESS.md` — the build log, phase by phase, including every defect found
  and every divergence taken.
- `SECURITY.md` — what is enforced, how to verify it, and the known gaps.
- `PRIVACY_NOTES.md` — what is collected, what never leaves the device, and how
  the DPDP rights are implemented.
- `design/SCREEN_INVENTORY.md` — the frames, the measured tokens, the conflicts.
