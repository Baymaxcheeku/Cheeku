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

# Every change reaches `main` through a documented PR

The team (app engineers and the data scientist) reads the PR, not the chat
that produced it. So every piece of work goes to `main` through a pull request
whose description follows `.github/pull_request_template.md`: what changed,
why (with launch tracker ids), how it works, database and deploy steps in
order, what it means for data and AI (new tables, what is and is never
logged), what was tested and what was not. Merge commits, not squash, so the
individual commit messages survive. In the same change, keep `PLAN.md`
(Open/Rules), `../PROGRESS.md` (the reasoning) and the trackers current; a PR
that changes behaviour without them is not finished.

# Words follow the content system

Any string a person reads on a card, in a notification or in a small line
around them follows `../docs/content-system.md`: who Cheeku is, the five rules,
the slot limits (card title 30, card line 60, notification title 40 and body
90), the notification formulas and the never-list. `src/lib/content/copy.test.ts`
enforces the limits on the plan tasks, chips, milestones, the unlock card and
the latest notification migration; extend it when you add a new kind of copy.

# How a merge reaches people

- **Web (Vercel).** Only `cheeku-ai-mobile` deploys: it builds
  `mobile-react-native` (the Expo web export). Every push to a branch makes a
  **Preview**; a push to `main` makes **Production**
  (`cheeku-ai-mobile.vercel.app`). Nothing else is needed.
- **The Next.js web app does not deploy any more.** Switch the `cheeku-ai`
  project off in the Vercel dashboard (its Settings, Git: disconnect the
  repository, or set Ignored Build Step to "Don't build anything"). **Never
  add a `vercel.json` at the repo root to do it:** `cheeku-ai-mobile` reads
  the root file too, and a `git.deploymentEnabled: false` there stopped
  every mobile Preview and Production build (2026-10-31, commits e58c00c to
  303ab27, fixed by removing the file).
- **Vercel builds a commit once.** If the same commit lands on a branch and on
  `main` at once, the branch can win and `main` gets no Production build. So
  after a PR is merged, do NOT push the working branch at `main`'s merge commit
  until `main`'s Production deployment shows Ready (this happened with PR #31,
  2026-10-19). Starting the next branch from the first NEW commit is fine.
  If it happens anyway: Vercel, project, Deployments, the "..." menu, Create
  Deployment from `main`; or merge the next PR.
- **Database and Edge Functions** are not deployed by a merge: migrations are
  applied in the Supabase SQL editor (`supabase/manual/*-step-*.sql`, then the
  matching `*-check.sql`), functions from the dashboard or
  `supabase functions deploy <name>`. The PR body says which, in order.
- **Native app.** `expo-updates` is not installed, so an installed build never
  changes by itself: run from a computer, `git pull` on `main` and
  `npx expo start -c`; an installed build needs a new `eas build`.

# Launch tracker: update it when work ships

The team tracks launch work in a live page:
https://claude.ai/artifact/FWQhpm3j1KJWiNrCgpraHe. Tasks are split
between Athar (app, product and design), Archit (backend, security, sign-in,
scale, the app to AI API layer and the marketplace) and Suraj (AI models and
pipelines); a task's `with` names who works on it alongside the owner. When a change
you make completes, starts or blocks one of its tasks, update that task in
the same session with the `ArtifactData` tool and add a `log` entry, as
described in `../docs/launch-tracker/README.md`, which also lists every
task id. Device verification is part of "done" for app work.

The LabStack marketplace work has its own internal tracker,
https://claude.ai/artifact/47jpFQDfdqQLKUPdNeatV1, kept in step with the
launch tracker by hand. Changes to the partner gateway, partner orders,
lab, consult or medicine integrations update it too, as described in
`../docs/labstack-tracker/README.md`.
