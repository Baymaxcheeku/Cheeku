# Cheeku's chat: personality, prompt and data contract

For Archit, who is wiring the real model in (Nov 2026). Everything around the
model is built and tested; the model's job is to write the answer well and
propose the right buttons. Swapping the model changes wording, never safety.

## 1. How a turn flows

```
person types
  │
  ├─ safety gate (lib/safety)          emergency words → handled by rules, model never asked
  ├─ steps / sleep said? (lib/chat/activity.ts)   → saved to daily_logs, listed in world.today.justLogged
  ├─ booking asked? (lib/memory/intent.ts)        → booking card by rules, model not asked
  ├─ insurance-only question?                     → answered from the saved policy by rules
  │
  ├─ MEMORY digest   (lib/memory/model.ts: digest)      records, readings, medicines, follow-ups, cover
  ├─ WORLD digest    (lib/chat/world.ts: gatherWorld)    longevity areas, today, care, watch, family
  ├─ FLOOR           (lib/memory/ladder.ts)              urgency the rules already reached
  │
  ├─ model.respond(ModelRequest) → ModelReply
  │     cheeku-chat Edge Function → Gemini today, your model once it has a URL
  │     (a photo, when sent, rides along as ModelRequest.image)
  │
  └─ app takes max(model tier, floor), shows paragraphs, citations,
     follow-up chips, care offer and action buttons (checked by lib/chat/safe-actions.ts)
```

Every model turn goes to the Edge Function; nothing to switch in the app. The
secrets pick the model: `GEMINI_API_KEY` for Gemini, or `CHEEKU_MODEL_URL` (and
`CHEEKU_MODEL_KEY`) for the fine-tuned model. There is no stand-in (removed
2026-11-17): if the model is down or the allowance is spent, the chat says so
and nothing is saved. The one exception is a floor of contact-today or above,
where the rules still say "call the doctor today" with their reasons.

## 2. The personality

Owner's choice (11 Nov 2026): **a playful sparrow**. Cheeku is the little
purple gauraiya at every Indian window: warm, light, quick, a little bird
humour, and completely serious the moment something is worrying.

The full system prompt is `supabase/functions/cheeku-chat/prompt.ts`
(`SYSTEM_PROMPT`). Its rules, in short:

- One person per turn, by name, with their real numbers and dates.
- Plain words (sugar, BP, tablets, tests). Hinglish only if they used it first.
- Two to four short paragraphs or a list. One clear next step.
- At most one playful line, and none when the floor is monitor or higher.
- No em dashes, no emoji, never "as an AI".
- Never diagnose, prescribe, or change a medicine. Tier never below the floor.
- Only what is in the request. Sample data is said to be sample data.

## 3. What the model receives

`ModelRequest` (`src/lib/memory/model.ts`):

| Field | What it is |
| --- | --- |
| `question` | The person's words |
| `history` | Last 12 turns |
| `memory.person` | Name, age, clock ("Week 12 + 2 of pregnancy"), stage, conditions, allergies |
| `memory.readings` | Up to 14 series with latest, previous, change, the rules' read, `focus` for the ones asked about |
| `memory.medicines`, `flags` | Current medicines with salts; overlaps and warnings found by rules |
| `memory.loops` | Open follow-ups: tests billed without a result, follow-up visits, vaccines due |
| `memory.records` | Up to 20 records with key values, by document id (for citations) |
| `memory.symptoms` | Symptom guides matched by rules, with home care and watch-for |
| `memory.logged`, `changes` | Readings said in this message; changes worth saying |
| `memory.cover` | Their insurance, as plain lines |
| `memory.world.longevity` | Six areas, worst first: `{ label, status: on_track/watch/act, line, sample }` |
| `memory.world.today` | Goal, steps so far, what was logged today, `justLogged` from this message |
| `memory.world.care` | Bookings coming up and recently done (doctor, home test, class) |
| `memory.world.device` | The watch's lines for the week (sample data is prefixed as such) |
| `memory.world.family` | One line per member, only when the account holder asked "how is everyone" |
| `floor` | `{ tier, reasons }` from the rules |

`renderRequest(body)` in `prompt.ts` turns all of this into readable sections
(PERSON, FLOOR, MEMORY, WORLD, THREAD, QUESTION). Use it as the user turn.

## 4. What the model returns

`ModelReply`, as JSON matching `REPLY_SCHEMA` in `prompt.ts`:

```json
{
  "paragraphs": ["Hopped through your numbers. Here's how Arjun is doing, area by area:\n• Sugar: worth watching. Average sugar (HbA1c) 5.9% is in the early-warning band.\n• Sleep: on track. Sleeping about 7h 10m a night this week.", "If I had to pick one thing, it's sugar. One small change a day."],
  "citations": [{ "documentId": "1840f48f-...", "label": "Annual health check-up, 11 Oct" }],
  "followUps": ["How was my week?", "What helps sugar?"],
  "tier": null,
  "basis": "grounded",
  "careOffer": false,
  "actions": [
    { "type": "set_goal", "goal": "sugar", "label": "Make sugar my goal" },
    { "type": "open", "route": "/today", "label": "Today's plan" }
  ]
}
```

Actions are proposals. The app drops anything that is not a known goal
(`sleep`, `weight`, `sugar`, `legs`, `calm`) or an allowed screen (list in
`src/lib/chat/safe-actions.ts`), shows at most three, and does nothing until
the person taps. "Make it my goal" writes the goal to the person's daily
settings, and tomorrow's plan is built around it.

## 5. How it all feeds the longevity engine

- **Areas** (`src/lib/longevity/areas.ts`): heart, sugar, sleep, movement,
  weight, check-ups, each on track / watch / act from reports, readings said in
  chat, the watch (through the wearables layer's `longevitySignals` slot) and
  open follow-ups. Worst signal wins; numbers older than 18 months are dropped;
  a child's areas come from check-ups and the watch only.
- **Chat writes back**: steps and sleep said in a message go to `daily_logs`
  (the plan and areas read them); readings like "BP 140/90" go to
  `memory_facts` (already); a goal tapped in chat goes to `daily_prefs.goal`.
- **The plan** already reads goals, steps and readings, so a chat turn changes
  tomorrow's plan without any new plumbing.

## 6. The scripted conversations (the stand-in, for testing now)

`src/lib/memory/sparrow.ts` answers these from the digest in Cheeku's voice,
so the product can be felt before the model is in. Treat them as the golden
set: the real model should do at least this well on each.

| Try saying | What happens |
| --- | --- |
| "How am I doing overall?" | Areas worst first, one to pick, buttons: make it a goal, today's plan |
| "How was my week?" | Movement, sleep, heart, goal, coming up, still open; asks how it felt with chips Tired / Okay / Flying |
| "I want to lose weight" / "help me sleep better" / "control my sugar" | Goal pitch with where they are now, button: Make it my goal (pregnancy: no weight-loss goal, offers sleep or walks) |
| "walked 6k today" / "slept 5 hours" | Saved to today's log; says how far from 8,000 steps, or a sleep nudge |
| "How did I sleep this week?" / "my steps" | The watch's lines; or a connect button if no device |
| "Any appointments?" / "what's booked" | Coming up and recent: doctor visits, home tests, classes |
| "How is everyone?" (from your own profile) | One line per family member, worst first |
| "Book my HbA1c again" | Booking card (rules, unchanged) |
| A symptom, a high reading, or anything urgent | Never the sparrow: the careful symptom and reading answers, with the floor |

## 7. Before calling it done

Check each on real family data, and on an empty new account:

1. Every number in the answer appears in the request. No invented dates or doctors.
2. Tier is never below the floor. A contact_today answer says "call the doctor today".
3. No playfulness when the floor is monitor or above, or a symptom is involved.
4. One person per answer. A family round-up only from the account holder's chat.
5. Sample data is called sample data.
6. Actions: only known goals and allowed routes; never more than three.
7. No em dashes, no emoji, no "as an AI".
8. Hinglish question gets a light Hinglish answer; English gets English.
9. Under 25 seconds, or the stand-in answers (the Edge Function times out at 25 s).
10. Nothing about the request is logged on the model server.
