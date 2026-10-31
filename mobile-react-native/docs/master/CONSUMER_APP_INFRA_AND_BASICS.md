# Consumer App Infra and Basics

**A master brief for Claude.** Put this file in a new Claude Code session
together with one more file, `IDEA.md`, that describes the product. Claude
reads both, then sets up everything below before building a single feature:
design system, components, app shell, backend, security, deployment, docs and
working rules. Every product built from this brief should feel like the same
studio made it: clean, warm, a little playful, fast, and safe.

Distilled from building Cheeku (a family health app on Expo, Supabase and
Vercel): what worked, what broke, and what we would set up on day one next time.

---

## 0. Instructions to Claude: read this first

You are the founding engineer and designer for a new consumer app. The owner
gives you this brief and an `IDEA.md`. Work through the phases in section 11
**in order**, and finish each phase's definition of done before starting the
next one. Use these rules throughout.

1. **Read `IDEA.md` and write `PRODUCT.md`** before any code: the user, the job
   they hire the app for, the three core loops, the first-week experience, what
   is free and what is paid, and every assumption you made. Ask the owner at
   most five questions, and only ones that change the architecture (money,
   regulated data, offline needs, audience age, platforms). Pick sensible
   defaults for everything else and list them in `PRODUCT.md`.
2. **Check the skills available in this session** (the system reminder lists
   them). If any UI/UX, design-system, frontend-design, artifact-design or
   content skill exists, load it before you design. If none exists, this brief
   is the design authority. Then create the project skills in section 12.
3. **One codebase, every platform.** iOS, Android and the web come from the
   same Expo app, so a change ships everywhere at once. Never fork a separate
   web app for the product itself.
4. **Free first, never fragile.** Use the free tiers in section 9, design so
   moving to a paid tier is a settings change, not a rewrite, and say clearly
   when a free tier stops being safe.
5. **Security and cost are features.** Every table has row-level security.
   Every call to something that costs money is metered on the server. Secrets
   never reach the app.
6. **Ship small, document everything.** Every change reaches `main` through a
   pull request whose description follows the template in section 10. Keep
   `PLAN.md`, `PROGRESS.md` and `AGENTS.md` current in the same change.
7. **Show your work.** After any UI change, export the web build, take
   screenshots with Playwright, look at them yourself, fix what is wrong, then
   share them. Say plainly what you could not verify (anything native).
8. **Write like a person.** Plain words, no jargon, no em dashes, no hype.
   Follow the content system in section 5 for every string the user reads.

---

## 1. Product principles

These are about how the app feels, not about colour. Any palette works if
these hold.

1. **One idea per screen, one idea per card.** If a card needs "and also",
   it is two cards.
2. **The first minute is the product.** A new user should do the core action
   within 60 seconds of opening the app. No tour, no wall of permissions.
   Ask for a permission at the moment it is needed, with one line on why.
3. **Earn the full home screen.** Home grows with the user: a *starter* state
   (one clear thing to do first), a *building* state (progress toward the
   real experience), and a *daily* state (the habit loop). Never show an empty
   dashboard.
4. **Empty states teach.** Every empty list says what goes there, why it
   matters, and has one button to add the first item.
5. **Progress you can feel.** Streaks, small milestones, a progress bar on the
   day, a short celebration when something is done. Fun is earned: playful on
   habits and wins, calm and plain on anything serious (money, health, safety,
   deletion).
6. **Personal beats generic.** When the app knows why something matters to
   this user, say that reason in their words ("Your sugar is high") instead of
   a general tip.
7. **Detail lives one tap deeper.** Cards carry the action and the payoff.
   The science, the fine print and the history live behind "Why this?",
   a sheet, or a detail page.
8. **Never a dead end.** Every error says what happened and what to do next.
   Every limit offers the next step (wait, upgrade, contact).
9. **Fast beats clever.** Optimistic updates, skeletons instead of spinners,
   one network call per screen where possible.
10. **Trust is designed.** Clear consent, an easy export, an easy delete, and
    a plain privacy page. People share more with apps they trust.

---

## 2. Design system

Build the design system before any feature screen. It lives in `src/theme`
(tokens) and `src/components/ui` (components), and it is shown on a hidden
**kit screen** (`/dev/kit`, dev builds only) that renders every component in
every state. Screenshot the kit screen as the first visual deliverable.

### 2.1 Tokens (structure, not colours)

Create these token groups in `src/theme/tokens.ts`, mirrored in
`tailwind.config.js` for NativeWind:

| Group | Contents | Rule |
|---|---|---|
| `brand` | 50 to 900 scale of the main hue | 600 for primary actions, 50 for tinted backgrounds |
| `ink` | 300, 500, 700, 900 | 900 for titles, 700 for body, 500 for secondary, 300 for placeholders |
| `surface` | page, card, tint, line | page is slightly tinted, cards are white or glass |
| `semantic` | success, caution, danger, info, each with `Bg` and `Text` | never use brand colour for status |
| `accent` | one playful highlight (a lime, a coral) | for badges, "live", streaks; used sparingly |
| `glass` | fill, fillStrong, rim, shadow | translucent cards over a soft gradient backdrop |

Contrast: body text at least 4.5:1 against its background, large text at
least 3:1. Check every token pair you use for text.

### 2.2 Type

- **Text font:** Inter (or another clean grotesk), loaded with `expo-font`.
- **Personality font:** one display face used only for the wordmark and a few
  hero words (for example an italic serif). Never for body text.
- **Data font:** a monospace for numbers in tables and receipts, optional.
- **Scale:** 11 (eyebrow, caps, tracked), 12.5 (meta), 14 (body), 15.5
  (list title), 18 (section), 24 to 27 (card hero), 34 to 40 (screen hero).
  Line height about 1.4 for body, about 1.2 for titles.
- Respect the system text size setting. Test at the largest size once per
  release.

### 2.3 Space, shape, depth, motion

- **Spacing:** 4-point grid. Screen gutter 16 to 20. Card padding 16. Gap
  between cards 12 to 16.
- **Radius:** 12 (inputs, small tiles), 16 to 24 (cards), 32 (hero cards),
  999 (pills and buttons).
- **Depth:** at most two shadow levels. Prefer a soft gradient backdrop with
  glass cards over heavy shadows.
- **Motion:** 150 to 250 ms. Press feedback is a scale to 0.97. Celebrations
  are short (under 1.2 s) and skippable. Honour "reduce motion".
- **Haptics:** light on primary taps, success on completion. Never on scroll.
- **Touch targets:** at least 44 by 44 points, including small links
  (use `hitSlop`).

### 2.4 Core components

Build each with its states (default, pressed, disabled, loading, error) and
show them all on the kit screen.

| Component | Anatomy and rules |
|---|---|
| **Button** | Variants: primary (dark or brand fill), secondary (glass), ghost (text), danger. Height 44 to 52, pill shape, label of 1 to 3 words, verb first. Optional leading icon. |
| **Card** | Container with radius 24, padding 16. Anatomy: optional chip row, title, up to two short lines, actions. Nothing else. |
| **Hero card** | The one big card on Home. Gradient, illustration or mascot bottom right, never behind the buttons (shrink it if it would be). |
| **Chip** | Pill, 11 to 12.5 text, optional icon. A noun of at most 16 characters. |
| **List row** | Icon tile (44 square, radius 14), title, one line of meta, chevron or trailing action. |
| **Sheet** | Bottom sheet for any task that needs more than a tap. Title, one line, the form, one primary button. |
| **Input** | Label above, helper or error below, 48 high, clear button, correct keyboard type. |
| **Tab bar** | Glass, 4 or 5 tabs, an optional centre action. Labels always visible. |
| **Toast** | One line, auto-hides, optional Undo. Never for errors that need action. |
| **Empty state** | Illustration, one-line title, one-line why, one button. |
| **Skeleton** | Matches the real layout. Use instead of spinners for content. |
| **Progress** | Bar for "3 of 8 done", ring for a single goal, streak dots for a week. |
| **Avatar** | Photo, illustrated avatar, or initials, with a coloured ring per person. |
| **Paywall** | What they get (three outcomes, not a feature list), plans, a timeline ("Today / In 30 days / Any time"), one button, "Not now". |

### 2.5 Screen patterns to set up on day one

- **Auth:** email OTP or magic link, plus Google and Apple sign-in. One screen
  each, no password rules to read.
- **Onboarding:** at most three screens, then straight into the first core
  action. Collect only what the first experience needs.
- **Home (staged):** starter, building, daily (principle 3). The server
  decides the stage (section 4.6) so every device agrees.
- **Detail page:** header, key facts, actions, history.
- **Settings hub:** profile, plan, notifications, privacy and data (export,
  delete), help, about.
- **Inbox:** notifications grouped by Today, Yesterday, This week, Earlier,
  with unread state.

### 2.6 Accessibility

Labels on every icon button, roles on everything tappable, focus order that
matches reading order, text that survives 200% size, colour never the only
signal, captions for any video or voice.

---

## 3. Personality

Give the app a voice, and if it fits, a mascot. A mascot (an illustrated
character with a few poses: present, think, celebrate, joy) does a lot of
work. It makes empty states friendly, celebrations feel earned, and waiting
feel shorter. Keep illustrations in one style, use the mascot sparingly (hero
cards, empty states, celebrations), and never next to bad news.

---

## 4. Tech stack and architecture

### 4.1 The stack

| Layer | Choice | Why |
|---|---|---|
| App (iOS, Android, web) | **Expo** (latest SDK) with **Expo Router**, TypeScript strict | One codebase, file-based routes, static web export |
| Styling | **NativeWind** (Tailwind for React Native) plus the token file | Fast, consistent, readable |
| Server state | **TanStack Query** | Caching, retries, optimistic updates, offline-friendly |
| Local state | React state; Zustand only if truly global | Less to learn |
| Validation | **Zod** at every boundary (forms, API responses, Edge Function input) | Bad data stops at the door |
| Icons | Lucide, plus a second softer family (Phosphor) for meaningful icons | Avoid generic "AI" icons |
| Backend | **Supabase**: Postgres, Auth, Storage, Edge Functions (Deno), Realtime | One service, free to start, SQL you own |
| Web hosting | **Cloudflare Pages** (static Expo web export) | Free plan allows commercial use, unlimited static bandwidth |
| Native builds | **EAS Build** and **EAS Submit** | Store builds without a Mac farm |
| Over-the-air updates | **expo-updates** with **EAS Update**, from day one | JS changes reach installed apps without a store release |
| Errors | **Sentry** (free Developer plan) | Crash and error reports, with PII scrubbing |
| Product analytics | **PostHog** (free tier) | Funnels and retention, no PII, no sensitive content |
| Email | **Resend** (free tier) as Supabase's custom SMTP | Auth emails that arrive |
| Tests | **Vitest** (logic), **Playwright** (web screenshots and flows), **Maestro** (native flows) | Fast unit tests, real UI checks |
| CI | **GitHub Actions** | Typecheck, lint, test, deploy |

### 4.2 Repository layout

```
/
├── app/                    Expo Router screens (one file per route)
│   ├── (auth)/             sign-in, verify
│   ├── (app)/              tabs: home, …, profile
│   ├── settings/           settings hub and sub-pages
│   └── dev/kit.tsx         component gallery (dev only)
├── src/
│   ├── theme/              tokens.ts, type.ts, motion.ts
│   ├── components/ui/      Button, Card, Chip, Sheet, …
│   ├── components/<area>/  feature components
│   ├── lib/<area>/         pure logic + queries per feature (tested)
│   ├── lib/supabase/       client, typed helpers
│   └── lib/content/        copy tests
├── supabase/
│   ├── migrations/         0001_*.sql … numbered, never edited once applied
│   ├── manual/             SQL editor steps and read-only check queries
│   ├── functions/          Edge Functions (one folder each)
│   └── manual/local-check/ scenario scripts for a local Postgres
├── docs/                   content-system.md, any partner or design docs
├── .github/                pull_request_template.md, workflows/
├── .claude/skills/         project skills (section 12)
├── AGENTS.md               rules for any AI or human contributor (CLAUDE.md imports it)
├── PLAN.md                 status, rules, open items, how to run
├── PROGRESS.md             dated log of decisions and their reasons
└── PRODUCT.md              the product, from IDEA.md
```

### 4.3 Data flow rules

- **The app talks to Supabase directly** for its own data, protected by RLS.
- **Anything with a secret or a cost goes through an Edge Function:** AI
  models, payments, third-party APIs, email. The function checks the user's
  JWT, meters the call, then forwards.
- **Heavy reads are one RPC per screen.** A `home_state()` function returns
  everything Home needs in one round trip, instead of six queries.
- **Writes are optimistic.** Update the cache, send, roll back on error with
  a toast.
- **Files go to Storage under `<user_id>/<entity>/<file>`**, enforced by a
  storage policy. Resize images on the device before upload (longest edge
  about 1280 px). Read them through short-lived signed URLs.

### 4.4 Backend patterns (copy these)

**Row-level security on every table, from the first migration:**

```sql
alter table things enable row level security;
create policy "own rows" on things for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

**Server logic as SECURITY DEFINER functions, locked down:**

```sql
create or replace function do_the_thing(p_id uuid) returns jsonb
security definer set search_path = public as $$
begin
  -- check auth.uid() owns p_id before doing anything
  …
end; $$ language plpgsql;
revoke execute on function do_the_thing(uuid) from public, anon;
grant execute on function do_the_thing(uuid) to authenticated;
```

**Config in a table, not in code:** an `app_config(key, value jsonb)` table
(no policies, read only by definer functions) for limits and switches, with
defaults inside the reading function so a bad edit cannot remove a limit.
An `app_flags(key, enabled)` table for kill switches.

**Metering anything that costs money:** a `claim_<thing>()` function, called
by the Edge Function with the user's own JWT, that takes a per-user advisory
lock, checks the daily allowance, a per-minute and per-hour burst limit and a
daily ceiling, writes one usage row (no content), and returns
`{ ok }` or `{ ok: false, reason, retry_after }`. The function returns 429 on
a refusal and 503 if the meter is unreachable, never an unmetered call.

**Notifications:** a `notifications` table (user, kind, title, body, route,
dedupe_key unique per user, read_at) written by a `notify_user()` definer
function called from triggers. Push is sent by an Edge Function from a
webhook on insert. Lock-screen text never contains sensitive details.

**Consent and trust:** a `consent_log` (versioned, per purpose), an
`account_activity` log (sign-ins, exports, deletions), a `privacy_requests`
table, an export function that returns everything the user owns, and account
deletion that removes rows, files and the auth user itself.

### 4.5 Migrations

- Numbered files, `0001_init.sql` onward. Never edit an applied migration; add
  a new one. Every migration is safe to run twice (`if not exists`,
  `create or replace`, `on conflict do nothing`).
- Apply with the Supabase CLI from CI on merge (`supabase db push`), or, if
  the owner prefers the dashboard, generate SQL editor step files (each under
  about 3,000 characters, each its own transaction ending in `commit;`) plus
  a **read-only check query** per migration that looks for the actual
  objects. The editor does not record what it ran, so the check query is how
  anyone knows what a database has.
- Test every migration on a local Postgres with a scenario script (allowed
  writes succeed, forbidden writes fail, cross-account reads return nothing)
  before it reaches production.

### 4.6 Server-decided state

Anything that must be the same on every device (the home stage, the plan,
the allowance left today) is decided by a server function and cached on the
device. The device can guess while offline, but the server is the truth.

---

## 5. Content system

Set this up as `docs/content-system.md` and enforce it with a test.

**Voice:** a warm, quick, slightly cheeky friend who happens to know the
subject. Plain words a twelve-year-old would follow. Local life, not stock
phrases. "I" is the app, "you" is the reader.

**Five rules:** one idea per card; action first, payoff second; specific
beats general; their reason beats ours; cut until it hurts.

**Slot limits (enforced by `src/lib/content/copy.test.ts`):**

| Slot | Limit |
|---|---|
| Card title | 30 characters, an action, no full stop |
| Card line | 60 characters, one sentence, the payoff |
| Personal reason | 36 characters, starts with their data |
| Detail ("Why this?") | 200 characters |
| Chip | 16 characters |
| Button | 3 words, verb first |
| Notification title | 40 characters |
| Notification body | 90 characters, two lock-screen lines |
| Celebration | 40 characters |

**Notification formulas:** News (what happened, what's next), Nudge (the
action, the tiny payoff), Attention (plain fact, one calm step, no emoji),
Win (the win, one line of delight, one emoji allowed), Account (exactly what
changed, what to do if it wasn't them).

**Never:** shame or guilt ("Don't forget", "You missed"), promised outcomes,
advice the app isn't qualified to give, "AI" or "smart" as a feature name,
stacked exclamation marks, em dashes, unexplained jargon.

Store every task or card as `title`, `why` (card line) and `more` (detail),
so the card stays short and nothing true is thrown away.

---

## 6. Security checklist

Set up on day one, check before every release:

- [ ] RLS on every table, including join tables. A test proves another
      account reads nothing.
- [ ] Every definer function sets `search_path`, checks `auth.uid()`, and is
      revoked from `public` and `anon`.
- [ ] No secret in the app bundle. Only the Supabase URL and anon key, which
      are public by design.
- [ ] Edge Functions keep JWT verification on (except signed webhooks, which
      verify their own signature).
- [ ] Rate limits on auth (Supabase settings), on every metered function, and
      on uploads (daily cap per user, storage quota per plan).
- [ ] Storage paths prefixed with the user id and enforced by policy; signed
      URLs short-lived.
- [ ] Logs never contain user content, health, money or messages. Sentry
      scrubs PII.
- [ ] Payments only through hosted checkout (Razorpay, Stripe) or store
      billing; verify on the server; store only payment ids. Digital goods in
      apps must use App Store and Play billing.
- [ ] Account deletion removes data, files and the auth user. Export works.
- [ ] Demo and seed data, test switches and "free upgrade" functions are
      behind flags that are off in production, and removed before launch.
- [ ] Auth settings (redirect URLs, providers, email templates) kept in
      version control, not only in the dashboard.
- [ ] Staging and production are separate projects with separate keys.

---

## 7. Scale and efficiency

- **Query budget:** at most one RPC per screen load; paginate every list
  (cursor, 20 to 50 rows); index every foreign key and every column you
  filter or sort by.
- **Cache on purpose:** set `staleTime` per query (profile: minutes; feeds:
  seconds); invalidate precisely after writes.
- **Payloads:** select only the columns a screen shows; never ship a whole
  table to the phone.
- **Images:** resize before upload; serve thumbnails; lazy-load lists.
- **Realtime:** only for things that truly change live (chat, a delivery);
  everything else polls on focus.
- **Background work:** scheduled jobs with `pg_cron` or scheduled Edge
  Functions, each idempotent, each respecting the user's settings.
- **Expensive calls:** behind the meter (section 4.4), with a cheaper path for
  free users and a stand-in when the service is down.
- **Load test** with 10,000 simulated users before a public launch.

---

## 8. Observability and quality

- Sentry in the app and in every Edge Function, with releases tagged by
  commit.
- PostHog events for the funnel only (opened, signed up, first core action,
  day-2 return, paid). No content, no PII.
- Alerts: Edge Function error rate, slow RPCs, failed payments, a key or
  certificate about to expire.
- A short manual QA list per release: sign up, first core action, the paid
  flow, export, delete, offline open, largest text size, a low-end Android.

---

## 9. Free tiers, and when they stop being enough

Figures are what vendors and reviewers reported in October 2026. **Check each
pricing page before relying on a number**; they change.

| Service | Free tier (approximate) | Watch out for | Upgrade when |
|---|---|---|---|
| Supabase | 2 active projects, 500 MB database, 1 GB storage, 5 GB egress, 50,000 monthly active users, 500,000 Edge Function calls | **Free projects pause after a week without traffic**; limited or no backups | Real users depend on it: Pro (about $25 a month) for no pausing, backups and more room |
| Cloudflare Pages | Unlimited static requests and bandwidth (fair use), 500 builds a month; Functions share the Workers free quota (100,000 requests a day) | Keep server logic in Supabase, not Pages Functions | Rarely, for a static Expo web app |
| Vercel Hobby | Generous limits | **Personal, non-commercial use only.** Any commercial product needs Pro | Use only for prototypes, or pay for Pro (about $20 a month per member) |
| Expo EAS | 15 iOS and 15 Android builds a month (low-priority queue); EAS Update for 1,000 monthly active installs | Builds stop for the month when the quota runs out | Above 1,000 installs receiving updates, or when queue times hurt |
| Sentry | Developer plan, about 5,000 errors a month, 1 user | One seat | A team needs to see errors |
| PostHog | About 1 million events a month | Do not send PII | Event volume grows past the free tier |
| Resend | Small free monthly allowance (a few thousand emails) with a daily cap | Use for auth email via custom SMTP; Supabase's built-in email is heavily rate-limited | Marketing or high sign-up volume |
| GitHub Actions | Free minutes for private repos | Keep workflows fast; cache installs | Long test suites |

**Cost rule of thumb:** the app should run free until it has real users, then
cost about the price of two coffees a month until it has a business. Anything
per-use (AI, SMS, maps) is metered from the first day.

---

## 10. Working rules (the process)

### 10.1 Files Claude keeps current

- `AGENTS.md`: rules for contributors, including everything in section 0,
  what a cloud session can and cannot verify, how a merge reaches each place
  (web, database, functions, phones). `CLAUDE.md` contains `@AGENTS.md`.
- `PLAN.md`: status, screen inventory, rules, open items, how to run it.
- `PROGRESS.md`: one dated entry per piece of work with **why**, what was
  verified, and what was not.
- `PRODUCT.md`: the product as understood, with assumptions.
- `docs/content-system.md`: section 5.

### 10.2 Pull requests

Every change reaches `main` through a PR whose description has these
sections (save as `.github/pull_request_template.md`):

```markdown
## What changed
## Why
## How it works
## Database and deploy steps   (in order; what breaks if the order is wrong)
## For data and AI             (new tables, what is logged, what never is)
## Tested                      (what passed, and what was NOT verified)
## Docs and trackers updated   (checklist)
```

Merge commits, not squash, so commit messages survive. Commit messages say
what and why in plain English.

### 10.3 How a merge reaches people (set this up in phase 5)

- **Web:** a push to `main` builds and deploys the Expo web export
  (Cloudflare Pages Git integration, or a GitHub Action). Branches get preview
  URLs.
- **Phones:** a GitHub Action runs `eas update --branch production` on every
  merge to `main`, so installed apps get the change on next open. A new
  native build is only needed when native code or permissions change.
- **Database:** a GitHub Action runs `supabase db push` on merge (needs the
  project ref and a database password as repository secrets), or the owner
  runs the editor steps and the check query. Either way, migrations go first,
  then functions, then the app.
- **Edge Functions:** `supabase functions deploy <name>` in the same action.

Lesson from Cheeku: if a hosting provider builds each commit only once, do
not push a working branch pointing at `main`'s new merge commit until `main`
has deployed, or the branch can win and production never builds.

### 10.4 Secrets

The owner adds secrets in GitHub, Supabase and EAS settings themselves.
Claude never asks for a token, key or password to be pasted into chat; it
names the secret, says where it goes, and waits.

### 10.5 Verification honesty

From a cloud session Claude can run typecheck, lint, unit tests, a local
Postgres, the web export and Playwright screenshots. It cannot see a real
phone. Native-only behaviour (gestures, camera, keyboard, push, layout on a
small screen) is reported as unverified, with exactly what to check.

---

## 11. Phases for the first sessions

Finish each phase's **Done when** before moving on. Share screenshots after
every phase with UI.

**Phase 0: Understand.** Read `IDEA.md`. Write `PRODUCT.md` (user, job,
three core loops, first week, free versus paid, data the app will hold,
assumptions). Ask at most five architecture questions.
*Done when:* the owner has seen `PRODUCT.md`.

**Phase 1: Repository and tooling.** Create the Expo app (TypeScript strict,
Expo Router, NativeWind, TanStack Query, Zod, Vitest, ESLint, Prettier), the
layout in 4.2, `AGENTS.md`, `CLAUDE.md`, `PLAN.md`, `PROGRESS.md`, the PR
template, and a GitHub Action that runs typecheck, lint and tests on every PR.
*Done when:* a clean clone installs and passes all checks.

**Phase 2: Design system.** Tokens, type, motion, every component in 2.4 with
states, the kit screen, `docs/content-system.md` and the copy test.
*Done when:* screenshots of the kit screen at phone and desktop width, light
and dark if supported, have been reviewed.

**Phase 3: Backend base.** Supabase project (staging first). Migrations for:
profiles, `app_config`, `app_flags`, notifications with `notify_user()`,
consent log, account activity, privacy requests, a usage meter with a claim
function, push devices, storage buckets with policies, export and delete.
Local scenario scripts proving RLS. Check queries.
*Done when:* every scenario passes locally twice and the check query says yes.

**Phase 4: App shell.** Auth (OTP, Google, Apple), onboarding (at most
three screens), tabs, staged Home (starter, building, daily) driven by a
`home_state()` RPC, settings hub (profile, plan, notifications, privacy,
export, delete, help, about), inbox, toasts, error and empty states.
*Done when:* screenshots of every screen in every stage, and a Playwright
flow from sign-up to Home passes against a stubbed backend.

**Phase 5: Delivery.** Cloudflare Pages (or Vercel Pro) for web,
`expo-updates` plus the EAS Update action, migrations and functions in CI,
Sentry and PostHog wired with PII scrubbing, separate staging and production.
*Done when:* a merged PR shows up on the web and on an installed preview
build without a manual step.

**Phase 6: The first core loop from `IDEA.md`.** Build the smallest version
of the main loop end to end, with its metered server call if it has one.
*Done when:* a new user can complete the loop in under 60 seconds, and the
PR description explains it to an engineer who has never seen the project.

---

## 12. Project skills to create

Create these in `.claude/skills/<name>/SKILL.md` during phase 1 so every
later session follows the same habits. Keep each short.

**`ship`**: "Use when a piece of work is ready. Run typecheck, lint and tests;
export the web build and screenshot changed screens; update PLAN.md,
PROGRESS.md and any tracker; commit with a what-and-why message; open a PR
with the template filled in; merge with a merge commit; do not push the
working branch at main's merge commit until production has deployed."

**`design-review`**: "Use before sharing any UI. Check the screen against
CONSUMER_APP_INFRA_AND_BASICS.md sections 1, 2 and 5: one idea per card, at
most two lines under a title, touch targets of 44, contrast, copy limits,
the mascot never behind buttons, empty and error states present. Fix, then
screenshot."

**`migration`**: "Use for any database change. New numbered file, safe to run
twice, RLS on new tables, definer functions locked down, a local scenario
script (allowed, forbidden, cross-account), editor step files and a read-only
check query, and the deploy order written in the PR."

**`metered-call`**: "Use when adding anything that costs money per call (AI,
SMS, maps, partner APIs). Edge Function with JWT on, a claim function with
allowance, burst limits and a daily ceiling, a usage row without content, 429
with reason, 503 if the meter is down, and a stand-in or friendly message in
the app."

---

## 13. Lessons from Cheeku (avoid these)

1. **A wrapped row stretched its tiles to full screen height on iOS** but
   looked perfect on the web. Test layouts on a phone before calling them done.
2. **A stacking order painted a "behind" element in front on the web only.**
   Same lesson: the browser is not the phone.
3. **The free allowance was charged when a message was saved, but the model
   was called before the save**, so one account could call the model in a
   loop. Meter at the point of cost, on the server.
4. **SQL pasted into the dashboard editor was not recorded anywhere**, so
   nobody could tell which migrations a database had. Write check queries.
5. **The editor silently cut off long pastes.** Split into steps under about
   3,000 characters, each ending in `commit;`.
6. **A copy change in the app left a database message saying the old limit**
   ("5 chats a day" after it became 20). Read limits from one config source
   everywhere.
7. **Phones did not get updates** because over-the-air updates were never set
   up. Install `expo-updates` in week one.
8. **Production did not deploy after a merge** because the same commit was
   pushed to a branch first. See 10.3.
9. **Cards grew crowded** as features piled on. The content limits and the
   `title / why / more` split keep them calm.
10. **A brain icon read as "AI app"** before it read as anything about the
    person. Choose icons that say what the thing does.

---

## Appendix: what `IDEA.md` should contain

Give Claude one page in this shape. Short answers are fine.

```markdown
# IDEA

## One line
What it is, for whom.

## The person
Who they are, what their day looks like, what frustrates them today.

## The job
What they hire this app to do. The moment they open it.

## Core loops (up to three)
1. …
2. …

## First minute
What a new user does first, and what they get back.

## What makes it fun
Streaks, progress, a character, a reveal, a social moment…

## Money
Free versus paid. Price ideas. Any marketplace or partner payments.

## Data
What the app will hold (and anything sensitive: health, money, children, location).

## Platforms and market
iOS, Android, web. Country and languages.

## Must not
Anything the product should never do or say.

## Inspiration
Apps whose feel you like, and what exactly you like about them.
```
