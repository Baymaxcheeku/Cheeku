# Landing page

The public site for Cheeku while we are in stealth. One page, one reader: an
Indian family. Its only job is to get them onto the waitlist. It is a separate
project from the app and shares no code with it.

## Run it

```
cd landing
npm install
npm run dev        # http://localhost:3100
npm run build      # static files in out/, ready for any host
```

Stack: Next.js (static export), Tailwind v4, Motion for the few animations,
Geist for type. No server code.

## Rules

- Everything for the site lives in this folder. Nothing here imports from
  `mobile-react-native/` or the root `src/`, and nothing there imports from
  here.
- The root ESLint and TypeScript configs skip this folder.
- It deploys on its own. An app release never waits on the site.

## Where the design comes from

The structure was studied from octohealth.com with the clone-website skill
(notes in `docs/research/octohealth/brief.md`). The words, colour, type,
photographs and app screens are Cheeku's. Product facts are in `PRODUCT.md`.

## What is on the page

| Section | File |
|---|---|
| Floating nav, full-screen photo hero, moving line | `src/components/top.tsx` |
| How it works (three photo cards), the product film | `how.tsx` |
| The family, sliding past | `people.tsx` |
| Six family situations, each with a photo and a real app screen | `journeys.tsx` |
| Stacked cards: what Cheeku does, and what is coming | `follow.tsx` |
| The pinned wheel of everything Cheeku remembers | `memory.tsx` |
| Cheeku against Google and WhatsApp | `compare.tsx` |
| Safety, questions, signup, footer | `closing.tsx` |

## Photographs

`public/photos/*.webp` were generated for this page (10 Nov 2026) and show
no real people. The footer says so. Replace them with real photographs when
there are some: keep the subject on the right and the left side calm and
dark, because the words sit there.

## App screens

`public/screens/*.webp` are the real app with sample data.
`src/components/phone.tsx` frames them at an iPhone 15's true proportions.

## Films

The product film (`mI4FmQt_8Qk`) plays in its own section, reached from the
hero's second button. The fertility film (`YHAdRiJ32Fo`) opens from the
"Trying for a baby" tab.

## Colour and type

Tokens are in `src/app/globals.css`. About 60% white, 30% brand purple,
10% marigold (the signup button only). Headlines are Instrument Serif with
italic for the words that matter; everything else is Inter. Both are the
faces the app uses.

## Copy rules

- For a patient: sugar, BP, tablets, tests. No lab or drug names in the copy.
- Short. No em dashes. Never AI-powered, platform, ecosystem, revolutionise.
- Only what the app does today is stated as fact. Wearables and Strava, meal
  and label scanning, insurance comparison and voice are marked "Coming soon".
- Not on this page: investors, employers, pricing, partner names.

## Signups

The forms write one row each to a Supabase table. Until the two variables in `.env.example` are set, the form finishes
but saves nothing and labels the confirmation "Preview, not saved".

To switch it on, run this once in the Supabase SQL editor (a separate project
from the app's is cleanest), then put the project URL and anon key in
`landing/.env.local` and in the host's environment settings.

```sql
create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) between 5 and 254),
  audience text not null check (audience in ('family', 'business', 'investor')),
  source text check (source is null or char_length(source) <= 40),
  created_at timestamptz not null default now(),
  unique (email, audience)
);

alter table waitlist enable row level security;

-- The public key may add a row and nothing else: no read, edit or delete.
create policy "anyone can join" on waitlist for insert to anon with check (true);
grant insert on waitlist to anon;
```

Read the list from the Supabase dashboard. A repeat signup returns a
conflict, which the form treats as success.

## Before it goes public

- Confirm "early 2027" and "small batches".
- Replace generated photographs with real ones if possible.
- The form takes an email. A phone number may suit Indian families better.
- Add a privacy note beside the form, a share image and the real domain.

## Skills kept with this project

`.claude/skills/clone-website/` is a third-party skill (JCodesMore,
ai-website-cloner-template, MIT, copied 10 Nov 2026). It is three instruction
files and nothing else: no scripts, no dependencies. It tells an agent how to
study a live page (layout, type, spacing, motion, breakpoints) and rebuild it.

How we use it: to measure how a reference site is built, then apply that to
our own page. What we do not do with it: ship another company's text, images,
logos, fonts or videos. Those belong to them. Its default instruction is to
copy the source's real content and assets, so say "structure and motion only,
our content" when you invoke it.

Only the skill was copied. The repo's Next.js starter app was left out, since
this folder already is one.

`.claude/skills/impeccable/` and `.claude/agents/impeccable-*.md` are
Impeccable 4.8.2 (Paul Bakaus, Apache 2.0, copied 10 Nov 2026): design
commands such as critique, audit, polish, typeset and layout, plus a detector
for common AI-looking patterns. Notes:

- It runs a compiled engine (0.1.22). The engine is not in this repo. On first
  use the launcher downloads it from the project's GitHub releases into
  `~/.impeccable/bin/` and refuses it unless the SHA-256 matches
  `scripts/engine-checksums.txt`.
- Its automatic hooks (a check after every file edit and at the end of every
  turn) are not switched on. Run the detector by hand:
  `.claude/skills/impeccable/scripts/impeccable detect src/`, or against the
  running site for the full rule set.
- Do not use its `live` mode without reading the README section on it first:
  its Apply step can start a second agent with permission checks turned off.
- `/impeccable init` writes a `PRODUCT.md` here. It has not been run yet.
