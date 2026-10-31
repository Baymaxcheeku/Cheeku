# Cheeku's content system

How Cheeku talks on cards, in notifications, and in every small line around
them. It's the rulebook for anyone writing a string the app shows: engineers,
designers, Suraj's model prompts, and Claude sessions. The limits are enforced
by `src/lib/content/copy.test.ts`; a string that breaks
one fails the build.

## Who is talking

Cheeku is the friend in the family who happens to know health. Warm, quick,
a little cheeky, never preachy. Talks like someone at the dinner table, not a
pamphlet.

- **Plain words.** If a twelve-year-old would stumble on it, swap it.
- **Indian life.** Chai, sabzi, roti, namkeen, the evening walk, the pressure
  cooker. Not kale and brunch.
- **"I" is Cheeku, "you" is the reader.** "I'll file it", not "Cheeku will
  file it", inside notifications and chat. On cards, Cheeku can stay silent
  and let the action speak.
- **Fun is earned.** Playful on habits, streaks and wins. Calm and plain on
  results, symptoms, money and anything deleted. Never joke about a reading.

## The five rules

1. **One idea per card.** If it needs "and also", it's two cards.
2. **Action first, payoff second.** The title is what to do. The line is what
   it gets you. The science lives one tap deeper.
3. **Specific beats general.** "10 chair stands", not "Exercise more".
4. **Their reason beats ours.** When we know why it's for them ("Your HbA1c
   is 6.1"), that line replaces the generic one.
5. **Cut until it hurts, then stop.** Read it aloud. If you ran out of
   breath, it's too long.

## Slot limits

| Slot | Limit | Shape | Example |
|---|---|---|---|
| Card title | 30 characters | An action, no full stop | `10 chair stands` |
| Card line (`why`) | 60 characters | One sentence, the payoff | `Strong legs, longer independence.` |
| Personal reason | 36 characters | Starts with their data | `Your HbA1c is 6.1%` |
| Detail (`more`) | 200 characters | Up to two sentences of how and why | shown in the plan, never on the card |
| Chip | 16 characters | A noun | `Sugar plan` |
| Button | 3 words | Verb first | `Log steps` |
| Notification title | 40 characters | What happened, or what to do | `Papa's CBC is filed` |
| Notification body | 90 characters | The next step, two lock-screen lines | `Tap to see what changed.` |
| Milestone / celebration | 40 characters | The win, one beat of fun | `A full week. Look at you.` |

Two lines on a card, total, under the title. If the card has a personal
reason, the reason and the line share them.

## Card anatomy

```
[ chip ] [ 10 min ]            ← area, and time only if it has one
10 chair stands                ← title: the action
✦ Your knees will thank you    ← reason, only when it's theirs
Strong legs, longer...         ← line: the payoff
[ ✓ Done ]  [ Later ]          ← buttons
```

No eyebrow saying "Today's step": the screen already says "here's today". A
step for someone else says so in the chip: `For Papa`.

## Notification formulas

| Kind | Title | Body | Tone |
|---|---|---|---|
| **News** (filed, booked, collected) | What happened, with the name | What happens next or what to tap | Light |
| **Nudge** (reminder, streak at risk) | The action | The tiny payoff | Playful |
| **Attention** (flagged values, review needed) | A plain fact | One calm next step | Calm, no emoji |
| **Win** (plan on, streak, launch) | The win | One line of delight | One emoji allowed |
| **Account** (removed, plan ended, security) | Exactly what changed | What it means, what to do if it wasn't them | Plain |

Emoji: at most one, only in Win notifications, never next to health results.

## Never

- Shame, fear or guilt: "Don't forget", "You missed", "Warning".
- Promises about outcomes: "This will lower your sugar".
- Medicine advice: start, stop or change a dose. Only "ask your doctor".
- "AI", "algorithm", "smart". Cheeku reads, remembers, notices.
- Exclamation marks in a row, or in anything about health results.
- Em dashes. Use a full stop or a comma.
- Jargon without a translation: "HbA1c (3-month sugar)" the first time.

## Health meaning words

One ladder for how a record or a value reads, on every screen (source:
`SEVERITY_LABEL` in `src/lib/records/types.ts`):

| Tier | Words | Colour |
|---|---|---|
| normal | In range | safe (green) |
| borderline | Worth a look | caution (amber) |
| high_risk | Ask your doctor | attention (orange) |

Red (`danger`) is kept for "go now" and emergencies. A single value can still
say "High" or "Low": that is its direction against the lab's range, not a
judgement. Never "High priority", "High risk", "Borderline" or "Alert".

## Before and after

| Before | After |
|---|---|
| Title `Today's medicines, taken` / line `Tick it once every dose for today is in. Missed doses are the commonest reason treatment seems not to work.` | Title `Today's medicines` / line `Tick once every dose is in.` / detail keeps the science |
| `Take a seated BP reading this evening` | `Check your BP tonight` |
| `Some values in CBC need a look` / `They're outside the range the lab printed. Worth showing your doctor, and I can help you get your questions ready.` | `A few CBC values are outside range` / `Worth a word with your doctor. I can help you prep.` |

## Where the strings live

- Habits and the Home step card: `src/lib/home/content.ts`
  (`NUDGES`, unlock card, milestones) and `catalog.ts` (the plan's tasks).
  Each task has `title`, `why` (the card line) and `more` (the detail).
- Personal reasons: `src/lib/home/today.ts` and `plan.ts`.
- On-phone reminders: `src/lib/notifications/push.ts` (appointments, labs,
  records) and `src/lib/notifications/engage.ts` (doses, refills and the
  day's nudges; `engage.test.ts` holds them to the limits and the never-list).
  A dose reminder says "Time for your morning medicines", never which one.
- Server-side nudges and caregiver alerts: `run_care_sweep` in
  `supabase/migrations/0038_family_care.sql` ("Papa hasn't ticked morning
  doses", first name only, at most 10 characters). Its scenarios in
  `supabase/manual/local-check/0038-family-care-scenarios.sql` hold them to
  40 and 90 and check no medicine is named.
- Goals: `src/lib/home/goals.ts` (title 30, line 60, question 40, chip 24;
  `goals.test.ts` holds them to it). A goal's lock-screen reminder never names
  the goal: "Steady sugar" on a lock screen is health information.
- Fitness: reasons in `src/lib/fitness/match.ts` (`NEED_RULES`, card reason
  36, they describe the class, never an outcome), chips in `catalog.ts`
  (16), inbox rows in `supabase/migrations/0039_fitness.sql` ("Class booked
  for Papa", checked in `copy.test.ts`) and phone reminders in `push.ts`
  ("Your class starts in an hour", never the activity: "Prenatal yoga" on a
  lock screen says too much).
- Location: the Home primer and chip in `src/components/location`
  ("Care near you", "Indiranagar, Bengaluru · Change"), Profile, Location in
  `app/settings/location.tsx`. A place label is at most 80 characters from
  the geo function and is truncated on one line in a chip.
- Inbox and push notifications from the server: the `notify_*` functions,
  latest wording in `supabase/migrations/0036_notification_copy.sql`.

Change a string, run `npx vitest run`; the copy test tells you which limit it
broke.
