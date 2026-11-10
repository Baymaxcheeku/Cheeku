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

## Direction

Written before the page was built, and every section follows it (the top of
`src/app/globals.css` has the same five lines).

- Product: Cheeku keeps a family's reports, medicines and doctor visits in one
  app, explains them in simple words and books the next step.
- Character: calm, plain-spoken, protective.
- World: the health drawer of an Indian home. The report file, the medicine
  strips, the family WhatsApp group.
- Moments: the product film in the hero, and real app screens in true iPhone
  frames.
- Signature: the person tag ("Papa", "Ma", "Baby"). Everything is about
  someone in particular.

## What is on the page

| Section | File | Job |
|---|---|---|
| Top line, nav, hero | `src/components/top.tsx` | "Stop googling your family's health", the signup form, the product film |
| The questions | `worries.tsx` | Six worries in the reader's own words |
| Who it's for | `journeys.tsx` | The six families from the app's onboarding, each with a real screen. The fertility tab carries its own film |
| How it works | `how.tsx` | Send it, understand it, get it done |
| Medicine check | `how.tsx` | All of a person's medicines checked together, and cheaper options with the same salt |
| Is it safe | `trust.tsx` | Not a doctor, danger means go now, nothing made up, your data |
| Questions | `trust.tsx` | Six short answers |
| Final call, footer | `closing.tsx` | Signup again, the disclaimer |

The six families are the same six the app asks about on the way in
(`mobile-react-native/src/lib/onboarding/journeys.ts`): trying for a baby,
expecting, new parent, caring for parents, getting healthier, just keeping
track.

## The app screens

`public/screens/*.webp` are the real app, taken from the product demo
recordings (393 points wide, sample data). `src/components/phone.tsx` draws
the frame: it adds the status bar back so the screen is 393 by 852, an iPhone
15's proportions, and nothing is stretched. To replace a screen, export a
393 by 778 point capture at 2x and keep the file name.

## The films

Both are YouTube videos, loaded only when played (`src/components/video.tsx`):
the product film in the hero (`mI4FmQt_8Qk`) and the fertility film
(`YHAdRiJ32Fo`). The poster is YouTube's own thumbnail.

## Colour

All tokens are in `src/app/globals.css`.

- 60% white: the page, cards and most sections.
- 30% brand purple (the app's own): the three "stage" panels, tabs, ticks and
  headline accents. One hue, lit from the top left. No second colour in it.
- 10% marigold (`--color-loud`): the signup button and nothing else.

Glass is used where there is purple behind it to blur: the film's frame and
the medicine check points.

## Copy rules

- Written for a patient, not a doctor: sugar, BP, tablets, tests. No lab names
  or drug names in the copy (the app screens show them, because that is the
  product).
- Short. Headlines end without a full stop. No em dashes. Never AI-powered,
  platform, ecosystem or revolutionise.
- Nothing invented: every feature named is in the app, and every number
  (12,000+ pincodes, 300+ cities, 5,000+ doctors and specialists) is from the
  seed deck.
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

- Decide whether the a16z line at the very top stays. It is one component
  (`TopLine` in `top.tsx`); the page reads fine without it.
- Confirm "early 2027" and "small batches" are what we want to promise.
- The form takes an email. A phone number may suit Indian families better.
- Add a privacy note beside the form once the policy page exists.
- Add a share image and the real domain in metadata.
