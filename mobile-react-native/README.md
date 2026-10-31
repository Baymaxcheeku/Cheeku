# Cheeku AI

A family health-memory app. Upload medical documents, have them read and
organised, and ask questions that are answered **from your own records** — never
from general medical knowledge.

India-first: ₹ pricing, UPI checkout, Hindi/Hinglish in the safety lexicon,
112/108 and Tele-MANAS as the emergency numbers.

**It ships as a mobile app** (Expo, React Native). Everything lives in
`mobile-react-native/`; start with `PLAN.md` and `AGENTS.md`. The Next.js web app that used
to live at the repo root was removed on 2026-10-30 — it is in git history before
that date. The web is served by the Expo web export of the same app.

## The five rules the code enforces

These are not aspirations in a doc. Each is enforced somewhere specific, and
most have tests whose only job is to fail if someone reverts them. Paths are
relative to this folder.

1. **Never diagnoses, prescribes or gives dosages.**
   `src/lib/ai/mock/answer.ts`, `src/lib/records/insight.ts`. The tests in
   `answer.test.ts` assert the output never names a condition, a drug or a
   quantity.
2. **The safety gate runs before any AI call** — on the device, deterministic,
   well under 200ms. `src/lib/safety/detect.ts`.
3. **Profiles are isolated**, enforced at the database layer.
   `tests/db/profile-isolation.test.ts` proves it at runtime
   against a real database.
4. **Grounded or silent.** If the records do not cover a question, the app says
   so and explains why, rather than improvising.
5. **Never sells or leaks data.** No analytics, no third-party SDKs. See
   `PRIVACY_NOTES.md`.

## How it is arranged

```
app/ src/ assets/      the app (npm) — see PLAN.md for running it
supabase/
  migrations/          the schema, RLS and server-side jobs
  functions/           Edge Functions: cheeku-chat, push-dispatch, delete-account
  manual/              migration steps sized for the Supabase SQL editor
scripts/               lexicon build, demo family SQL, mascot and pod tooling
tests/db/              RLS audit and runtime profile isolation (npm run test:db)
docs/  design/         content system, specs, trackers, design frames
.claude/skills/        the project's Claude skills
```

## Database

Migrations are applied in the Supabase SQL editor: `supabase/manual/*-step-*.sql`
in order, then the matching `*-check.sql`. Edge Functions deploy from the
dashboard or with `supabase functions deploy <name>`. The pnpm migration runner
and seed scripts that used to live at the repo root were removed on 2026-10-31;
they are in git history before that date.

| Command | What it does |
|---|---|
| `npx tsc --noEmit` | Typechecks the app, scripts and tests (not the Deno Edge Functions). |
| `npx vitest run` | The app's logic tests. No secrets needed. |
| `npm run test:db` | The RLS audit over `supabase/migrations`, and the live isolation proof, which runs only when `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are exported in the shell. Never put the service key in `.env.local`. |

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

All illustrations are **original** art in
`src/components/illustrations/`. They
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
