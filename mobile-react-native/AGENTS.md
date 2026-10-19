# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Read `PLAN.md` before changing anything

Its **Rules**, **Open** and **Running it** sections are the short version of
everything below. `../PROGRESS.md` holds the reasoning behind the surprising
decisions; most things that look wrong are recorded there with why.

# Working in a cloud session

A cloud session can do real work on this repo, and there is a hard line through
the middle of it. Know which side you are on before you claim something works.

## What a cloud session CAN verify

    cd mobile-react-native
    npm install
    npx tsc --noEmit
    npx vitest run          # 129 tests, no secrets needed

The suite is pure functions — safety detection, the prompt picker, grouping,
insight, quota expiry — and passes with **no Supabase environment at all**
(verified with the env vars explicitly unset). A failing test here is a real
failure, not a missing key.

The repo root is a separate pnpm workspace for the legacy Next.js build:
`pnpm install` there, `npx vitest run` for its own suite. The mobile package
uses **npm** and has its own `package-lock.json`. Do not mix them.

## What a cloud session CANNOT do, at all

- **Run the app.** `.env.local` is gitignored and holds the Supabase URL and
  anon key. Without it the app builds and immediately cannot sign in.
- **Run or write to the database.** `DATABASE_URL` is in the root `.env.local`.
  You can author a migration; you cannot apply it. Say so rather than implying
  the schema changed.
- **See anything.** No simulator, no device, no browser preview. Layout,
  gestures, camera, biometrics and cold-start routing are unverifiable here.

## The rule that follows from that

**Never report a visual or native change as verified from a cloud session.**
Two bugs in this app looked perfect in a browser for weeks and were broken the
first time it ran on iOS — a wrapped row that stretched its tiles to the full
screen height in Yoga, and a stacking order that painted a "behind" element in
front on web only. Both are written up in `../PROGRESS.md`.

Write the change, run the typecheck and the tests, and hand the verification
back explicitly: name the screen, say what should be looked at, and say that
you could not look at it yourself.

**After any dev work, share screenshots of what was built.** The owner asked
for this on every change. Export the web build, open the changed screens in
Playwright (Chromium is preinstalled) against a fake Supabase, look at each
shot yourself first, fix what is wrong, then send them. They show layout and
copy only; they still do not count as device verification.

## Handing work back to a local session

Push a branch and open a PR rather than committing to `main`, so the local
session can pull, run it on the simulator, and fix what the browser could never
have shown. Migrations are the exception worth flagging loudly in the PR body:
they are inert until somebody runs `npm run db:migrate` from the repo root, and
the app will behave as though the change never happened until they do.

# Launch tracker: update it when work ships

The team tracks launch work in a live page:
https://claude.ai/artifact/FWQhpm3j1KJWiNrCgpraHe. Tasks are split
between Athar (app and backend) and Suraj (AI integration). When a change
you make completes, starts or blocks one of its tasks, update that task in
the same session with the `ArtifactData` tool and add a `log` entry, as
described in `../docs/launch-tracker/README.md`, which also lists every
task id. Device verification is part of "done" for app work.
