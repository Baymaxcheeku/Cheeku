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

The structure was studied from octohealth.com, and the hero and menu from
trylifelong.com, with the clone-website skill (notes in `docs/research/`). The words, colour, type,
photographs and app screens are Cheeku's. Product facts are in `PRODUCT.md`.

## What is on the page

| Section | File |
|---|---|
| Menu bar with two drop-downs, photo-card hero, moving line | `src/components/top.tsx` |
| Ask by chat or voice, languages | `ask.tsx` |
| How it works (three photo cards), the product film | `how.tsx` |
| The family, sliding past | `people.tsx` |
| Six family situations, each with a photo and a real app screen | `journeys.tsx` |
| The care ring: everything families bring, round six kinds of care | `care-ring.tsx` |
| Stacked cards: twelve things Cheeku follows through on, and what is coming | `follow.tsx` |
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

The product film is a file on this site (`public/video/cheeku-film.mp4`,
7 MB, 720p, with a poster image), played by our own player in
`src/components/video.tsx`: no other company's name or logo on it. It starts
muted when it scrolls into view. To replace it, export a new MP4 and run:
`ffmpeg -i new.mp4 -vf scale=1280:720 -c:v libx264 -crf 25 -preset slow -c:a aac -b:a 96k -movflags +faststart public/video/cheeku-film.mp4`.
If the page gets real traffic, move the file to a video host that adjusts
quality to the viewer's connection (Bunny Stream, Cloudflare Stream or Mux).

The fertility film (`YHAdRiJ32Fo`) still opens on YouTube from the "Trying
for a baby" tab, until its file is supplied.

## Colour and type

Tokens are in `src/app/globals.css`. A light page throughout: white, with
brand purple for accents, buttons and pale lilac panels, and marigold for
the signup button only. No dark sections. Headlines are Instrument Serif with
italic for the words that matter; everything else is Inter. Both are the
faces the app uses.

## Copy rules

- For a patient: sugar, BP, tablets, tests. No lab or drug names in the copy.
- Short. No em dashes. Never AI-powered, platform, ecosystem, revolutionise.
- Only what the app does today is stated as fact. Meal and label scanning,
  insurance comparison, Fitbit through Google and voice are marked "Coming soon".
- Not on this page: investors, employers, pricing, partner names.

## Signups

Every "Join the waitlist" button on the page scrolls to the one form, puts
the cursor in the email field, and remembers which button it was. Each signup
is one row in a Supabase table, with `source` saying where it came from
(`closing:nav`, `closing:top` for the hero, and so on). A hidden field
catches simple bots. Until the two variables in `.env.example` are set, the
form finishes but saves nothing and says "preview, not saved".

To switch it on:

1. Run `supabase/waitlist.sql` once in the Supabase SQL editor. The app's
   project is fine; the website's key can only add rows to this one table.
2. Put the project URL and the anon (public) key in `landing/.env.local`
   and in the host's environment settings as `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, then rebuild. They are baked in at build
   time, so a change needs a new build.

Read the list in Supabase, Table Editor, `waitlist`. A repeat signup returns
a conflict, which the form treats as success.

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

## Logo

The logo is a little purple sparrow, the gauraiya that lives in every Indian home and turns up at the window each morning. Calm (closed, smiling eyes), friendly (round, nothing sharp), and always around. No letters in it.

There are two versions:

- **3D sparrow** for anywhere with room: the app, the website, posters, social posts. These are generated renders (Figma AI), cut out onto transparent backgrounds.
- **Flat sparrow** (SVG, drawn by hand to match) for anything under 48 px and for one-colour use: favicons, print, stamps, embroidery.

All files live in `public/brand/`. `kit-sheet.png` shows every version, the colours and the rules.

| File | Use it for |
| --- | --- |
| `cheeku-sparrow-1024.png`, `cheeku-sparrow.webp` | The main 3D sparrow |
| `mood-hello`, `mood-thinking`, `mood-celebrate`, `mood-calm` (`.webp` and `-1024.png`) | Greetings, "let me check", little wins, all-clear screens |
| `cheeku-mark-flat.svg` | Flat sparrow, full colour |
| `cheeku-mark-purple.svg`, `-ink.svg`, `-white.svg` | One colour, eyes and beak cut out |
| `lockup-horizontal(-white).svg`, `lockup-stacked(-white).svg` | Flat sparrow with the name (name drawn from Instrument Serif as outlines) |
| `app-icon-1024.png`, `-512`, `-180` | App stores and home screen (square, the store rounds the corners) |
| `favicon.svg`, `favicon-16/32/48/192/512.png` | Browser tab and bookmarks |

The site uses the flat sparrow in the nav and footer, `public/icon.svg` and `public/favicon.png` for the tab, and `public/apple-icon.png` for iPhone home screens.

Colours: sparrow #7A6AF2, Cheeku purple #4A2ADE, belly lilac #DDD6FE, beak #FF8A3D, blush #F6A5CF, ink #17123A.

Keep clear space of half the sparrow's height around it. Don't stretch it, recolour it, add a shadow to the flat version, or put it on a busy photo without a white or lilac tile behind it.

The renders were made with an AI image tool, so before trademark filing get a professional search, and have a designer redraw the 3D sparrow as a proper 3D model if you need new poses that match exactly.
