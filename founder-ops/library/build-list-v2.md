# Cheeku build list v2: the daily companion

2026-10-12 · Athar Ali · Replaces the v1 build list.

## How to use this list

**This is the build backlog for thesis v2: Cheeku becomes a daily health companion with a longevity layer in every chat, a prescription check, and booking from chat through the lab partner, on the existing subscription tiers.** Each item says what changes in UI/UX, in the backend, and how urgent it is.

### What changed from the v1 list

| v1 list said | v2 list says |
|---|---|
| Replace subscriptions with passes (F11) | **Dropped.** Free, Daily Pass ₹29, Solo ₹99, Family ₹249 all stay. Free goes from 5 to about 20 chats a day |
| Remove the ₹29 Daily Pass | **Dropped.** It stays |
| Five 90 day programs as the core | Programs become goals inside the daily companion. The retest stays as the quarterly loop |
| Chat moves off the home hero | Chat stays central, but opens with today's next step instead of an empty box |
| Medicines were stored only | **New:** prescription check with ten scored checks, built on the existing medication ledger |
| Labs bundled into passes | **New:** partner tests booked from chat at partner price plus a markup |
| Nothing on fitness, food or sleep | **New:** daily nudges, plate checks, wearable sync, dietitian and physio bookings |

### Priority tags

| Tag | Meaning |
|---|---|
| **P0** | Needed for the pilot. Without it the daily loop does not exist |
| **P1** | Needed before scale and before marketing spend |
| **P2** | After the pilot shows the habit forms |

Two rules run through everything. Rules decide anything clinical and the model only explains it. And Cheeku never tells anyone to stop, skip or change a medicine.

## Changes to current features, screen by screen

**Most of v2 is a change of job for screens that already exist.** Home stops being a launcher and becomes today's plan, chat gains the longevity layer, and the booking pieces that already exist get wired to the lab partner.

| Where (file) | Change | UI/UX | Backend | Pri |
|---|---|---|---|---|
| Home, app/(app)/home.tsx | Becomes "Today" | Top card is today's one nudge (a dose, a walk, a meal swap, a test due) with a done button. Under it: what's due this week, parents strip, then the ask bar. | A today RPC that picks one nudge per person from memory and returns due items in one call | P0 |
| Ask chat, app/(app)/ask.tsx | Longevity layer on every answer | Answers end with one next step chip (remind me, book it, log it). Context chips at the top show what Cheeku used ("HbA1c 6.4, Mar"). | Pipeline calls memory tools for labs, medicines, goals, due items before the model. Output check blocks numbers that did not come from a tool | P0 |
| Free chat limit, src/lib/billing/plans.ts and 0022_daily_free_chats.sql | 5 to about 20 a day | Quota line only appears after 15 ("5 chats left today"), never a hard wall mid-answer | Change FREE_CHAT_LIMIT and enforce_chat_quota together. Route free chats to the smaller model | P0 |
| Plans, app/plan.tsx, app/settings/subscription.tsx | Same four tiers, new reasons to pay | Paid tiers show the booking benefit (lower markup or free home collection) and the family caregiver view | Entitlement flag booking_discount read at checkout | P1 |
| Scan, app/scan.tsx | Adds "Prescription" as a first-class type | Two big options: Report or Prescription. WhatsApp share sheet lands here. Low confidence values and medicines confirmed in one tap | Real report reader replaces src/lib/ai/mock/extract.ts. New Rx reader | P0 |
| Record detail, app/records/[id].tsx | Reading v2 for reports, scorecard for prescriptions | Reports: where you stand, what changed, what next. Prescriptions: the ten checks and questions for the doctor, shareable on WhatsApp | Compare across reports. Prescription check service | P0 |
| Memory and medicines, app/memory.tsx | Shows the medication ledger as "Your medicines" | One list per person: what, why, how often, refill date, flags. Edit or stop logging (never "stop taking") | Existing ledger in src/lib/memory/ledger.ts gets dose schedule, refill date and the new checks | P0 |
| Health file, app/health-file.tsx | Body system dashboard | Tiles for sugar, heart, kidney, liver, thyroid, blood, vitamins, bones, plus activity and sleep from wearables | Measurements table, wearable daily summaries | P1 |
| Labs, app/labs/* | Lab partner catalogue and booking | Same screens, real partner tests and slots, one price with breakdown on tap | Partner adapter for catalogue, slots, booking, status and results. Markup applied server side | P0 |
| Services, app/services/*, app/book/* | Dietitian, physio, trainer and home care join doctors | Cards appear in chat when the answer calls for them; the hub stays for browsing | src/lib/services/provider.ts gets real providers per category | P1 |
| Family, app/family/* | Caregiver view for parents | A parent card shows doses taken, readings, anything overdue. Alerts go to the caregiver | Caregiver roles on profile_relations, alert rules | P0 |
| Notifications, app/notifications.tsx | Daily nudge and due items | Morning nudge, dose reminders, refill alerts, retest due, Sunday review, parent alerts. Each opens the exact screen | New kinds, scheduled by pg_cron, sent by push-dispatch | P0 |
| Onboarding, welcome.tsx, journey.tsx, who.tsx | Sets up the companion | Who you care for, what you want more of (energy, sugar under control, stronger knees), add a report or prescription, connect Apple Health or Health Connect | Save goals and care targets on the profile | P0 |
| Learn, app/learn.tsx | Content attached to the person | Short reads linked from nudges, marker cards and prescription flags | Content keyed by marker, drug class and goal | P2 |

## New features to build

**Sixteen features. F1 to F****9**** make the daily companion real and are the pilot. The rest deepen it.** IDs are for tickets.

| ID | Feature | What the user sees | What it takes underneath | Pri |
|---|---|---|---|---|
| F1 | **Report reader** | Any lab's PDF or photo becomes clean values in under a minute, unclear ones confirmed in a tap | Marker dictionary, unit conversion, plausibility checks, confidence per value | P0 |
| F2 | **Reading v2** | Where you stand, what changed, what next, in Hindi or English | Band rules signed by a clinician. The model only words them | P0 |
| F3 | **Longevity layer in chat** | Every answer uses their numbers and medicines and ends with one next step | Memory tools (get_latest_labs, get_medicines, get_goals, get_due_items, book_test), next step picker, output check | P0 |
| F4 | **Daily nudge** | One useful thing each morning, never more than one, easy to snooze | Nudge picker over memory and goals, nudge library, mute tracking | P0 |
| F5 | **Prescription reader** | Photo of a handwritten or printed prescription becomes a medicine list to confirm | Rx extraction, brand to salt lookup, person confirms low confidence lines | P0 |
| F6 | **Prescription check** | A scorecard of ten checks with questions for the doctor, shareable on WhatsApp | Licensed drug and interaction data, CDSCO banned FDC list, NPPA and Jan Aushadhi prices, Beers and STOPP rules, eGFR dosing. Checks 1, 2, 4, 5, 6 first | P0 |
| F7 | **Doses and refills** | Dose reminders, "taken" in one tap, refill alert five days before the strip runs out | Schedule on the ledger, dose log, refill maths from quantity and frequency | P0 |
| F8 | **Lab partner booking from chat** | A booking card in the thread: test, why, one price, slot, home collection. Result returns to the same thread | Partner adapter, markup engine, payment, status webhooks, auto filing into the right person | P0 |
| F9 | **Caregiver view** | A child sees a parent's doses, readings and overdue items and gets alerts when something slips | Caregiver roles and consent, alert rules, a weekly summary | P0 |
| F10 | **Sunday review** | A 60 second check-in: what moved, one change for next week | Check-ins table, weekly summary built from memory and wearables | P1 |
| F11 | **Wearable sync** | Steps, sleep, heart rate and weight flow in from Apple Health or Health Connect | HealthKit and Health Connect permissions, daily summaries only, never raw streams | P1 |
| F12 | **Food for your body** | Meal ideas in Indian portions that fit their markers, diet type and medicines. Photo of a plate gets one swap | Meal library, plate estimate with the model's vision, rules for diabetes, BP, kidney and lipids | P1 |
| F13 | **Retest and change card** | Retest due, booked in chat, then a card: "HbA1c 6.4 to 5.9 in 84 days" | Due dates per marker, compare two reports, render a shareable image | P1 |
| F14 | **Care bookings beyond labs** | Dietitian, physio, trainer and home nurse cards appear in chat when needed | Provider adapters per category, commission tracking | P1 |
| F15 | **Risk scores** | Heart risk, kidney stage, liver score, diabetes risk, each with one line of meaning | eGFR CKD-EPI 2021, FIB-4, WHO CVD charts, IDRS. Clinician sign-off on each | P2 |
| F16 | **ABDM link** | Link ABHA, pull past records from hospitals and labs on the network | ABDM PHR app certification, FHIR mapping, consent artefacts | P2 |

Already built and reused: the medication ledger with ingredient stacking (src/lib/memory/ledger.ts), the booking intent router (src/lib/memory/intent.ts, service ids lab, doctor, fitness, medicine, care), the in-thread booking card, open loops, the safety router and the consent ledger.

## New workflows

**Eight journeys, each with a trigger, the steps and where it ends.** Design and backend should build to these, not to screens.

### W1. Morning nudge

Trigger: 8am local, or the person's chosen time.

1. Nudge picker looks at memory: doses due, goals behind, tests due, yesterday's chat.
2. Picks one. Safety and due items win over habits.
3. Push: "Walk 10 minutes after lunch today, your sugar likes it."
4. Tap opens Today with the nudge and a done button. Done, snooze or "not today" is logged and shapes tomorrow's pick.

### W2. A question in chat

1. Safety router runs first. A red flag goes to W8 and nothing else happens.
2. Memory tools pull the latest numbers, medicines, goals and due items for the person being asked about.
3. Rules return any band, score or interaction that applies.
4. Model answers in plain words from those facts only. Output check blocks numbers that did not come from a tool.
5. One next step chip at the end: remind, log, book or ask a doctor.
6. Question and advice saved to memory. Ends when the person leaves or taps the chip.

### W3. Prescription in

1. Photo or WhatsApp share lands in Scan as a prescription.
2. Rx reader extracts each medicine, dose, timing and days. Person confirms unclear lines.
3. Brand to salt lookup, then merge into the medication ledger.
4. Ten checks run. Anything urgent goes to W8.
5. Scorecard and questions for the doctor shown, with a share button.
6. Dose reminders and refill dates set. Any monitoring test the drug needs is offered for booking. Ends at the reminder confirmation.

### W4. Booking from chat

1. A need is spotted in W2, W3 or W6: overdue test, symptom, new prescription needing a check.
2. Cheeku says why in one line and shows a booking card: test, one price, slot, home collection.
3. Person picks a slot and pays by UPI or card. Subscribers see their discount applied.
4. Partner confirms. Status updates post in the same thread: booked, collector on the way, sample collected.
5. Result arrives through the partner webhook, is filed to the right person, and Reading v2 posts in the thread.
6. Next step offered. Ends when the result is read.

### W5. Sunday review

1. Sunday 9am push.
2. Card shows the week: doses taken, steps, sleep, readings logged, any symptom chats.
3. Asks one or two things the data cannot know: energy, meals off plan.
4. Cheeku names one win and one change for next week. Goals adjust. Caregiver gets the parent's version.

### W6. Retest cycle

1. Due date reached for a marker that was off (set by the band rules).
2. Reminder at 14 days with the panel already chosen.
3. Runs W4. Result compared with the last one, change card shown first.

### W7. Parent slips

Trigger: two missed doses in a row, a reading in a worse band, or a test overdue by 30 days.

1. Caregiver gets the alert written for them: "Papa missed his BP tablet yesterday and today."
2. Options: call Papa, remind him through the app, book a home visit or a consult.
3. The parent gets a gentle version if they use the app themselves.

### W8. Red flag

Trigger: a dangerous value, a dangerous drug combination or dose, or an emergency described in chat.

1. One screen: what was found and why it matters today. No scorecard, no upsell.
2. Call emergency services, call a doctor now, alert family.
3. Logged for clinician review and a check-in the next day.

## Content mechanics

**The daily companion needs far more content than v1, because a nudge a day for a year is 365 small pieces.** Most of it is short, written once, and reused across people by the nudge picker. Clinical pieces need a signature, habit pieces need a good writer.

| Content set | Size to start | What each piece has | Who signs | Pri |
|---|---|---|---|---|
| **Nudge library** | About 300 nudges across food, movement, sleep, medicines, tests | One line, the condition it fits (marker, goal, age, medicine), a done action. Under 15 words | Product, physician checks the clinical ones | P0 |
| **Marker cards** | 40 common markers first, 120 by month 3 | Plain name, bands with Indian cut-offs, common reasons, what moves it, when to see a doctor | Physician and lab specialist | P0 |
| **Prescription check rules** | 10 checks, with flag wording per check | Rule, threshold, source, flag line, question for the doctor | Physician and clinical pharmacist, mandatory | P0 |
| **Drug class cards** | Top 100 drug classes Indian families take | What it is for, common side effects, food and timing notes, monitoring tests | Clinical pharmacist | P1 |
| **Meal library** | 150 swaps and 60 meal ideas | Veg, egg, non veg and Jain. North, South, Gujarati, Bengali. Portions in katori, roti and fist | Dietitian | P1 |
| **Movement library** | 40 routines | 5 to 15 minute walks, chair and wall strength for 50+, knee friendly options, with a safety line | Physiotherapist | P1 |
| **Answer templates for common questions** | 50 top questions (mango, fasting, painkillers, BP readings, thyroid tablet timing) | The grounded answer pattern plus the one next step | Physician | P1 |
| **Red flag scripts** | 20 situations including drug danger | What was found, why today, what to do now | Physician, mandatory | P0 |
| **Notification copy** | About 60 lines | Per kind, per language, self or caregiver voice | Product | P0 |
| **Hindi** | All of the above | Spoken Hindi, tested with parents | Native speaker plus physician for terms | P1 |

Rules for every piece:

- Content is data in versioned tables, not code. A fix ships without an app release.
- Every clinical piece shows who reviewed it and has a review date a year out.
- The model may adapt wording to the person but may not invent a band, a dose, an interaction or a cut-off.
- Medicine content never says stop, skip or change. It gives the question to ask.
- Write for a 60 year old reading on a phone in sunlight: short lines, big numbers, one idea per screen.

## Backend and data model

**Extend what exists before adding anything.** Migrations 0001 to 0032 already hold entities, memory facts, open loops, the medication ledger, lab bookings, services, subscriptions and the consent ledger. v2 needs about fifteen new tables, three new edge functions and a set of scheduled jobs.

### Tables

| Table | New or extend | Holds | Notes |
|---|---|---|---|
| markers, marker_bands | New | Marker codes, aliases, units, Indian bands with source and reviewer | Reference data, versioned |
| measurements | New, fed from entities | One row per person, marker, date, with source and confidence | Index on (profile, marker, taken_at) |
| drugs, drug_brands | New | Salt, class, strength, form; brand to salt mapping | Loaded from the licensed provider plus public Indian lists |
| drug_rules | New | Banned FDCs, interactions, dose limits by age and eGFR, Beers and STOPP flags, monitoring needs | Versioned, each rule signed |
| prescriptions, prescription_checks | New | Parsed prescription lines; the ten check results with sources | Links to the document and to ledger entries |
| Medication ledger | Extend | Dose schedule, quantity, refill date, dose log | Builds on the existing ledger in memory |
| goals, nudges, nudge_log | New | Person's goals; the nudge library; what was sent and what they did | Mute rate comes from nudge_log |
| checkins | New | Sunday review answers | Short free text only |
| wearable_daily | New | Steps, sleep minutes, resting heart rate, weight per day | Daily summaries, never raw streams |
| lab_bookings | Extend | Partner order id, partner price, markup, final price, discount applied, status history | Price parts stored separately for the breakdown and for audits |
| markup_rules | New | Markup by category, test and tier | Config, not code |
| caregiver_links | Extend profile_relations | Role, alert preferences, parent's consent | RLS checks role on every read |
| retests, change_cards | New | Due dates linked to bookings; rendered cards | From v1, unchanged |

### Functions and jobs

- **chat pipeline** (cheeku-chat edge function): add memory tools, the next step picker and the output check. Route free tier chats to the smaller model.
- **report-reader** and **rx-reader** (edge functions): file in, structured values out with confidence. Failures go to a manual review queue.
- **prescription-check** (Postgres functions): runs the ten checks against drug_rules and the person's memory, writes prescription_checks.
- **lab-partner adapter** (edge function): catalogue sync, slots, create order, status and result webhooks. Results filed through the existing booking sync.
- **pg_cron jobs**: morning nudge pick, dose reminders, refill alerts, retest due, Sunday review, caregiver alerts. All write notifications rows that push-dispatch sends.
- **Quota**: FREE_CHAT_LIMIT and enforce_chat_quota (migration 0022) move from 5 to 20 together, in one migration and one app release.
- **Notification kinds**: daily_nudge, dose_due, refill_due, rx_checked, booking_status, result_ready, sunday_review, retest_due, parent_alert.
- **Consent purposes**: wearable_data, abdm_records added as optional purposes in the 0031 ledger.

### Decide before writing migrations

- Which drug knowledge provider to license, and its terms for showing data to consumers.
- Whether the markup is applied by Cheeku at checkout or set as a price list with the partner. Lean Cheeku side, so tiers can get different prices.
- Who is the merchant of record for lab bookings, Cheeku or the partner. This decides GST, refunds and the invoice the family gets.

## What to remove or hide

**Hide what competes with the daily loop, keep everything that earns money or trust.** Nothing here deletes user data, and the subscription tiers are untouched.

| Item | Action | Why |
|---|---|---|
| Empty chat box as the first screen | Replace with Today (nudge, due items, ask bar) | An empty box asks the person to bring a worry. Today brings them the next step |
| Hard "limit reached" wall at 5 chats | Remove, with the move to about 20 | The wall hit people mid-worry and taught them the app runs out |
| Product checker in chat | Hide | Off thesis and invites brand claims. The prescription check covers the useful part |
| Sample doctors and demo bookings | Remove from production builds | Fake supply in a health app costs trust on the first tap. Keep for the demo build |
| Services catalogue as a home section | Move under Book and into chat cards | Care should appear as a step in a conversation, not as a shop window |
| Long article library as a tab | Fold into nudges, marker cards and drug cards | Reading earns its place when it is about the person's own number or medicine |
| Pregnancy as a home entry | Keep the screens, off Today unless the person is pregnant | A real use case on a different loop |
| Passes and test bundles from the v1 list | Do not build | Replaced by booking from chat on the existing tiers |

## Build order, 13 weeks

**Three blocks of about a month. The pilot starts on 7 Dec, once reports and prescriptions can be read, chat uses memory, and a test can be booked and read back in one thread.**

_[chart: Proposed build plan · 9 workstreams, 13 weeks]_

Content and clinical sign-off run the whole length because every block depends on it. Wearables, the Sunday review and food come after the pilot starts, since they deepen a habit that must form first.

### Block 1, 12 Oct to 8 Nov: read everything, answer with memory

- [ ] Report reader (F1) live behind a flag, mock extractor kept as fallback
- [ ] Rx reader (F5) and prescription as a type in Scan
- [ ] Migrations: markers, marker_bands, measurements, drugs, drug_brands, prescriptions
- [ ] Memory tools and output check in the chat pipeline (F3)
- [ ] Free limit 5 to 20 in plans.ts and enforce_chat_quota, smaller model for free chats
- [ ] Reading v2 (F2) on record detail
- [ ] License decision for drug and interaction data
- [ ] Content: 40 marker cards, prescription check rules for checks 1, 2, 4, 5, 6, 20 red flag scripts
- [ ] Hide the product checker and sample doctors

### Block 2, 9 Nov to 6 Dec: check, book, remind

- [ ] Prescription check (F6) with scorecard and WhatsApp share
- [ ] Lab partner adapter, markup rules and booking from chat (F8)
- [ ] Doses and refills (F7) on the medication ledger
- [ ] Caregiver view and parent alerts (F9)
- [ ] Today replaces the chat-first home, with the daily nudge (F4)
- [ ] pg_cron jobs and the new notification kinds
- [ ] Content: 300 nudges, notification copy, top 50 answer templates
- [ ] Store review check on UPI for bookings and in-app purchase for subscriptions

### Block 3, 7 Dec to 9 Jan: pilot and deepen

- [ ] Pilot with 200 families, parents first
- [ ] Wearable sync (F11) and Sunday review (F10)
- [ ] Food for your body (F12) with the meal library
- [ ] Retest and change card (F13)
- [ ] Dietitian and physio bookings (F14)
- [ ] Hindi for nudges, red flags, notifications and prescription flags
- [ ] Weekly read of the pilot funnel: activation, week 4 habit, bookings, subscriptions

Later, after the pilot proves the habit: risk scores (F15) and the ABDM link (F16).
