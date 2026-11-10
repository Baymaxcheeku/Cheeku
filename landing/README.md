# Landing page

The public site for Cheeku AI while we are in stealth. One page, three
readers: families (early access), employers and insurers (pilots), and
investors (the deck). It is a separate project from the app and shares
nothing with it.

## Run it

```
cd landing
npm install
npm run dev        # http://localhost:3100
npm run build      # static files in out/, ready for any host
```

Stack: Next.js (static export), Tailwind v4, Motion for animation, Lenis for
smooth scroll, lottie-web for the mascot. No server code.

## Rules

- Everything for the site lives in this folder. Nothing here imports from
  `mobile-react-native/` or the root `src/`, and nothing there imports from
  here. The mascot files and fonts in `public/` are copies.
- The root ESLint and TypeScript configs skip this folder.
- It deploys on its own. An app release never waits on the site.

## What is on the page

| Section | File | Job |
|---|---|---|
| Top strip, nav | `src/components/chrome.tsx` | a16z "State of Longevity" link; scroll progress; menu |
| Hero | `hero.tsx` | The 71 vs 60 line, the signup form, cards that follow the pointer |
| Proof strip, the 90 days, the lost decade | `problem.tsx` | What is built; the scroll-driven Day 0 to Day 90 story; the numbers |
| For families | `families.tsx` | Four pains, each as "today" against "with Cheeku" |
| How it works, daily jobs, safety | `product.tsx` | Remembers, decides, books; five jobs; rules decide |
| Employers and insurers | `business.tsx` | The buyer's view, pilot signup |
| Investors | `investors.tsx` | Why now, the loop, deck request |
| Final call, footer | `closing.tsx` | Signup again, disclaimer, sources |

Shared motion pieces (reveal, word-by-word headline, magnetic button, tilt
card, count-up) are in `src/components/ui.tsx`.

## Colour

Light theme, in three weights. All tokens are in `src/app/globals.css`.

- 60%: lilac and near-white surfaces (the app's own lilac values).
- 30%: indigo ink and brand violet: type, icons, the dark investor block.
- 10%: marigold (`--color-loud`, `#ff6a2b`): calls to action and "live"
  moments only. To try another loud colour, change that one token and its
  two neighbours (`loud-deep`, `loud-wash`).

## Copy rules

- No em dashes. Never say AI-powered, platform, disrupting, ecosystem or
  revolutionise.
- Every number has a source in the footer. Product visuals are illustrations
  with sample data, and the business dashboard is labelled "Illustrative".
- Not on this page, on purpose: the raise amount, valuation, equity, revenue
  projections, partner names and founder names.
- a16z is quoted from its public report with a note that it is not an
  investor or affiliate.

## Signups

The three forms (family, company, investor) write one row each to a Supabase
table. Until the two variables in `.env.example` are set, the form finishes
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

- Check the "23 crore people a week ask ChatGPT a health question" figure
  against its original source and fix the footer credit.
- Add a privacy note beside the form once the policy page exists.
- Add a share image (`opengraph-image`) and the real domain in metadata.
- A short launch film (Remotion) for the hero is planned, not built.
