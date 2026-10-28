# Cheeku longevity build list

2026-10-12 · Athar Ali

## How to use this list

This is the working backlog that comes out of the longevity thesis. The thesis argued one thing: Cheeku wins if a person brings in any lab report, gets a reading they understand, follows a 90 day plan, and comes back for a retest that shows the number moved. Every item below either feeds that loop or gets out of its way.

How it is organised:

- **Changes to current features** are edits to screens that already exist. Start here, they are cheaper and they make the loop visible fast.
- **New features** are the parts of the loop the app does not have yet. Each one has an ID (F1 to F12) so tickets can point at it.
- **New workflows** are the end to end journeys, written as steps, so design and backend agree on what happens when.
- **Content mechanics** is the writing and clinical work. It is the slowest track and it blocks launch more often than code does, so it starts in week one.
- **Backend and data model** lists the tables, functions and jobs the features need.
- **What to remove or hide** is the cut list. Shipping less is part of the plan.
- **Build order** puts it all on a 13 week calendar.

Priority tags used throughout:

| Tag | Meaning |
|---|---|
| **P0** | Needed for the pilot. Without it the loop does not close. |
| **P1** | Needed before people are asked to pay. |
| **P2** | Useful, can wait until after the first retest cohort. |

Two rules for the whole list. First, nothing here diagnoses. Readings explain, plans suggest, and anything that looks urgent goes to a doctor. Second, prices and pass names are still hypotheses from the thesis. Build them so they can change from config, not from a release.

## Changes to current features, screen by screen

The app already has most of the surfaces the loop needs. What it lacks is a reason to come back. These edits give each screen a job inside the report, plan, retest cycle.

| Where (file) | Change | UI/UX | Backend | Pri |
|---|---|---|---|---|
| Home, app/(app)/home.tsx | Stop leading with chat. Lead with the person's health state and the next thing to do. | Top card "Bring any report" until the first upload, then swaps to "Your plan, week 3 of 12". Below it: retests due, a strip of parent cards with one status line each, then Ask. | One home summary RPC that returns plan week, due retests and family flags in a single call. | P0 |
| Scan, app/scan.tsx and first-upload.tsx | Rename to "Add a report". Accept PDFs and photos from WhatsApp, email and the files app. | Share sheet target so a PDF from a lab's WhatsApp lands straight here. After extraction, show the values with any low confidence ones highlighted and a one tap "looks right" confirm. | Replace the mock in src/lib/ai/mock/extract.ts with the real report reader (F1). Store confidence per value. | P0 |
| Record detail, app/records/[id].tsx | Reading v2: every report answers three questions. | Three blocks in this order: "Where you stand", "What changed since last time", "What to do next". Markers grouped by body system, not in lab order. A change card at the top if there is an earlier report. | Needs the marker dictionary and a compare function across reports for the same person. | P0 |
| Health file, app/health-file.tsx | Becomes the healthspan dashboard (F3). | Body system tiles (sugar, heart, liver, kidney, thyroid, blood, vitamins, bones). Each tile has a colour, a trend arrow and the date of the last value. Tap opens a marker history chart. | Reads from the new measurements table. One row per marker per date. | P0 |
| Memory, app/memory.tsx | Show what Cheeku is tracking, not just what it remembers. | New sections: "Active program", "Retests due", "Things you told us" (diet, meds, conditions). Each item editable. | Programs and retests surface here from their own tables. | P1 |
| Ask, app/(app)/ask.tsx | Ground answers in the person's own numbers and program. | Suggested chips built from the latest report ("Why is my HbA1c 6.1?"). Answers cite which report they used. Red flags break out of chat into the red flag flow. | Chat context pulls latest measurements and active program. Safety router runs before the model. | P0 |
| Labs, app/labs/* | Booking becomes the retest step of the plan, not a separate shop. | "Book your retest" button inside the plan with the exact panel prefilled. Home collection first. After the sample, the report files itself. | Link lab_bookings to a retest row. Auto file results through the existing booking sync. | P0 |
| Family, app/family/* | Parents mode (F8). | A parent profile gets a simpler view, large type, and a caregiver line: "Papa's sugar is up since March". Adding a parent asks for their last report first. | Caregiver links with roles. Alerts go to the caregiver, not the parent, by default. | P0 |
| Notifications, app/notifications.tsx and src/lib/notifications/* | New kinds that drive the loop. | Retest due, weekly check-in, change card ready, parent alert, plan week complete. Each one opens the exact screen, never Home. | Add kinds to the inbox types. Scheduled by due date jobs. | P0 |
| Plan and subscription, app/plan.tsx, app/settings/subscription.tsx | Swap the chat quota plans for passes (F11). | Show what a pass includes in tests and reviews, not in messages. Free stays genuinely useful. | src/lib/billing/plans.ts moves from ₹29, ₹99, ₹249 quotas to pass entitlements read from config. | P1 |
| Onboarding, welcome.tsx, journey.tsx, who.tsx | Ask who they care for, then ask for a report. | Three screens: who you are looking after (me, parents, partner, kids), what worries you most, upload your latest report or skip. | Save care targets and the first worry on the profile so the first program can be suggested. | P0 |
| Learn, app/learn.tsx | Turn articles into marker and program content. | Each marker card links to a 2 minute read. Program weeks unlock short reads in order. | Content tables keyed by marker code and program week. | P1 |
| Doctors, app/book/*, app/services/doctors.tsx | Narrow to one job: review a red flag or a plan. | "Get a doctor to look at this report" from the record and from the red flag flow. Drop the general directory feel. | A review request carries the report and the program so the doctor does not start cold. | P1 |

## New features to build

Twelve features, in rough dependency order. F1 and F2 unlock almost everything else, so they go first even though they are the least visible.

| ID | Feature | What the user sees | What it takes underneath | Pri |
|---|---|---|---|---|
| F1 | **Report reader** | Any lab's PDF or photo turns into clean values in under a minute, with a confirm step for anything unclear. | Marker dictionary (names, aliases, LOINC style codes, units, plausible ranges), unit conversion (mg/dL vs mmol/L), per lab layout hints, confidence score per value, a plausibility check that flags a typo like HbA1c 61. | P0 |
| F2 | **Reading v2** | Three plain answers per report: where you stand, what changed, what next. Hindi or English. | Rules engine written with a clinician decides the band per marker. The model only phrases the explanation, it never decides the band. | P0 |
| F3 | **Healthspan dashboard** | Body system tiles with trends across every report they ever added. | Measurements table, trend calc per marker, a last tested date per system. | P0 |
| F4 | **Programs engine** | Pick or get suggested one of five 90 day programs. Weekly goals, small daily actions. | Program templates (weeks, actions, target markers, retest panel), enrolment, progress tracking. | P0 |
| F5 | **Retest scheduler** | "Your retest is due on 14 Jan", with one tap to book the right panel at home. | Due dates per program and per marker, linked to lab bookings, reminders at 14, 3 and 0 days. | P0 |
| F6 | **Weekly check-in** | A 60 second card each Sunday: weight, waist, steps, meals, how you felt. | Check-ins table, streak logic, a nudge if two weeks are skipped. | P0 |
| F7 | **Change card** | After a retest, a shareable card: "HbA1c 6.4 to 5.9 in 84 days". Designed for WhatsApp. | Compare two reports, pick the best true story, render an image. Never shares anything the person did not choose. | P0 |
| F8 | **Parents mode** | A child manages a parent's health from their own phone. Alerts when a parent's number moves the wrong way. | Caregiver links, roles (view, manage), consent from the parent where they have their own login, alert rules. | P0 |
| F9 | **Doctor review** | "A doctor looked at this" stamp on a report or plan, with a short note. | Review queue, doctor notes, turnaround tracking, payout per review. | P1 |
| F10 | **Risk calculators, then blood age** | Heart risk, kidney function, liver score, diabetes risk, each with a sentence on what it means. Blood age comes later as the headline number. | eGFR (CKD-EPI 2021), FIB-4, WHO CVD risk charts for South Asia, IDRS. PhenoAge only once enough complete panels exist and it has been checked against Indian data. | P1 |
| F11 | **Passes and billing** | Free, Healthspan, Parents, Family. A pass shows tests and reviews included, not message counts. | Entitlements from config, renewals, a pass ledger. Tests bundled into a pass may allow UPI as a physical service. Confirm with Apple and Google before building on that. | P1 |
| F12 | **Employer and insurer consent** | A clear switch: share my progress with my employer wellness program or insurer. Off by default, revocable. | New optional consent purposes in the 0031 ledger, an aggregate only export, never raw reports. | P2 |

A note on F10. Each calculator needs its formula, inputs, unit checks and a short limits line ("not validated under 18") reviewed by a clinician before it ships. A wrong heart score shown with confidence does more harm than no score.

## New workflows

Seven journeys. Each one lists the trigger, the steps, and the moment it ends. If a step has no owner screen yet, it is listed in the features above.

### W1. Bring any report

Trigger: a PDF shared from WhatsApp, a photo, or the Add a report button.

1. File lands in Scan. Ask whose report it is (me, Papa, Mummy, someone new).
2. Report reader extracts values. Anything under the confidence bar is highlighted.
3. Person confirms or fixes the highlighted values. One tap if all look right.
4. Safety router checks for red flag values before anything else is shown.
5. Reading v2 opens: where you stand, what changed, what next.
6. If there is no active program, suggest one based on the worst system. Ends when they enrol or dismiss.

### W2. Program enrolment

1. Suggested program with the reason in one line ("Your fasting sugar and HbA1c are both in the watch zone").
2. Three questions: diet type (veg, egg, non veg, Jain), usual meal times, current medicines.
3. Week 1 plan appears with three daily actions, not ten.
4. Retest date is set and shown. Ends with a calendar reminder offer.

### W3. Weekly check-in

1. Sunday 9am push: "60 seconds for your week".
2. Card asks weight, waist, steps or minutes walked, meals that went off plan, energy.
3. Cheeku replies with one thing that went well and one change for next week.
4. Two missed weeks in a row trigger a softer message and an offer to make the plan easier.

### W4. Retest cycle

1. Reminder at 14 days: "Your retest is in two weeks, want us to book it?"
2. One tap books the program's panel at home through the lab partner, with the slot picker.
3. Report comes back and files itself through the booking sync, no upload needed.
4. Change card is built and shown first, then Reading v2.
5. Next 90 days are offered: continue, step up, or switch program. Ends at that choice.

### W5. Parent alert

1. A parent's new report has a marker that moved into a worse band.
2. The caregiver gets the alert, written for them ("Papa's kidney number dropped since April").
3. Options: talk to a doctor about it, book a retest, or mark as known.
4. The parent sees the same news in calmer language if they have their own login.

### W6. Red flag

Trigger: a value past the urgent line (very high potassium, very low haemoglobin, sugar above the emergency cut-off) or a chat message describing an emergency.

1. No reading, no plan, no upsell. One screen: what was found and why it matters today.
2. Buttons: call emergency services, call a doctor now, share with family.
3. Logged for the clinician to review. A follow up check the next day.

### W7. Renewal

1. Ten days before a pass ends, show what changed during it with the change card.
2. Offer renewal with next quarter's retest already included.
3. If they let it lapse, keep their data and dashboard, pause the plan, and ask once at 30 days. Never lock them out of their own reports.

## Content mechanics

Code can be written in a weekend. The content behind it cannot, because a clinician has to sign it. Treat this as its own track with its own owner.

| Content set | Size | What each piece has | Who signs | Pri |
|---|---|---|---|---|
| **Marker cards** | About 120 markers, starting with the 40 that show up in 90% of Indian panels | Plain name, what it measures, bands with Indian cut-offs where they differ (BMI, waist, HbA1c), common reasons it is off, what moves it, when to see a doctor. 80 words max. | Physician, plus a lab specialist for units and ranges | P0 |
| **Program playbooks** | 5 programs, 12 weeks each | Weekly goal, three daily actions, Indian meal swaps with real portions (katori, roti count, rice in fists), one movement goal, one short read. | Physician and a dietitian | P0 |
| **Meal library** | 150 swaps to start | Veg, egg, non veg and Jain versions. Regional variety: north thali, south meals, Gujarati, Bengali. No quinoa and kale fantasy. | Dietitian | P1 |
| **Change card templates** | 12 | One per common win (sugar, weight, waist, liver, lipids, vitamin D, B12, haemoglobin) plus "held steady" for when nothing improved but nothing got worse. | Product, physician checks claims | P0 |
| **Notification copy** | About 40 lines | Per kind, per language, per audience (self vs caregiver). Short, specific, never scary. | Product | P0 |
| **Red flag scripts** | 15 to 20 situations | What was found, why today matters, what to do now. Tested for reading level. | Physician, mandatory | P0 |
| **Hindi** | Everything above | Natural spoken Hindi, not translated textbook Hindi. Test with real parents. | Native speaker plus physician for medical terms | P1 |

Rules for every piece of content:

- Every card shows who reviewed it and when. Each has a review date a year out.
- Content is data, not code. It lives in tables with versions, so a fix ships without an app release.
- The model may rephrase content for a person's situation but may not invent a band, a dose or a cut-off. If the content table does not cover a marker, the reading says so honestly.
- Write for a 55 year old reading on a phone in bright sunlight. Short lines, big numbers, one idea per screen.

## Backend and data model

The database already has 30-odd tables from migrations 0001 to 0032. Several of them do half the job today (entities, lab_result_templates, open_loops, memory_facts, timeline_events, subscriptions). Extend those where the shape fits instead of building a parallel world.

### Tables

| Table | New or extend | Holds | Notes |
|---|---|---|---|
| markers | New | Code, names and aliases, canonical unit, conversions, plausible min and max, body system | Reference data, read only for users. Seeded from the content track. |
| marker_bands | New | Band cut-offs per marker, by sex and age where needed, with source and reviewer | Versioned. Readings store which version they used. |
| lab_formats | Extend lab_result_templates | Layout hints per lab so the reader knows where values sit | Grows as new labs show up in uploads. |
| measurements | New, fed from entities | One row per person, marker, date: value, unit, source report, confidence, confirmed flag | The dashboard and every trend reads this. Index on (profile, marker, taken_at). |
| programs and program_weeks | New | The five templates: weeks, actions, target markers, retest panel | Content, versioned. |
| program_enrollments | New | Person, program, version, start date, status, reason suggested | One active per person per program. |
| plan_actions | New | Daily and weekly actions generated for an enrolment, done or skipped | Small rows, lots of them. Partition later if needed. |
| checkins | New | Weekly answers, free text kept short | Feeds the plan generator. |
| retests | New, linked to lab_bookings | Due date, panel, status, booking id, result report id | The thing that closes the loop. |
| caregiver_links | Extend profile_relations | Who looks after whom, role, alert preferences | RLS must let a caregiver read only what the role allows. |
| risk_scores | New | Calculator, inputs used, result, formula version, computed at | Never recomputed silently. A new version writes a new row. |
| passes | Extend subscriptions | Pass type, period, entitlements used (tests, reviews) | Entitlements from a config table, not code. |
| change_cards | New | Two report ids, chosen story, rendered image path, shared flag | Private storage bucket. Sharing is the person's action. |

### Functions and jobs

- **report-reader** (edge function): file in, structured values out with confidence. Replaces the mock extractor. Retries and a manual review queue for failures.
- **reading-builder** (edge function or RPC): runs the band rules, writes the reading, then asks the model for the plain language version with the bands passed in as facts.
- **plan-generator**: builds each week's actions from the program, the check-in and the latest measurements. Deterministic first, model only for wording.
- **Due date jobs** (pg_cron, every hour): retests due, check-ins due, pass renewals, missed week nudges. They write notifications rows and let the existing push-dispatch function send them.
- **Safety router**: one shared module used by the reader, the chat (cheeku-chat) and the plan generator. Red flag rules live in a table so a clinician can tune them.
- **New notification kinds**: retest_due, checkin_due, change_card_ready, parent_alert, plan_week_done, pass_ending.
- **New consent purposes** in the 0031 ledger: employer_wellness_share, insurer_share, deidentified_research. All optional, all off by default.

### Things to decide before writing migrations

- Measurements as their own table versus a view over entities. A table is faster and easier to index. Lean table.
- Where the band rules run. Postgres functions keep them next to the data and under RLS. Lean Postgres for bands, edge function for anything that calls the model.
- How long to keep raw report files after extraction. Keep them, people want the original PDF, but move old ones to cheaper storage.

## What to remove or hide

Every surface that does not feed the loop competes with it for attention. Hide behind a flag first, delete once the pilot data agrees.

| Item | Action | Why |
|---|---|---|
| Chat as the home hero | Move below the plan and retests | Chat answers a question and ends. The plan brings people back. Ask stays one tap away. |
| Product checker in chat | Hide | Off thesis, invites claims about brands, and nobody pays for it. |
| Sample doctors and demo bookings | Remove from production builds | Fake supply in a health app costs trust the first time someone taps it. Keep for the demo build only. |
| ₹29 day pass | Remove | Trains people to pay for messages. Passes sell outcomes and tests. |
| Message count quotas as the main limit | Replace with pass entitlements | Limits should be on tests and doctor reviews, the things that cost money, not on asking. |
| General services catalog on Home | Move under Labs and Doctors | Services should show up as a step in a plan, not as a shop. |
| Long article library as a tab | Fold into marker cards and program weeks | Reading earns its place when it is attached to the person's own number. |
| Pregnancy as a headline entry | Keep the screens, take it off Home | It is a real use case but a different loop. Revisit after the five longevity programs work. |

Nothing here deletes user data. People who used a hidden feature keep everything they made with it.

## Build order, 13 weeks

Three blocks of roughly a month each. Every block ends with something a real user can do that they could not do before.

### Block 1, 12 Oct to 8 Nov: the report becomes useful

Goal at the end: upload any report, get a reading you trust, see it on a dashboard.

- [ ] Migrations for markers, marker_bands, measurements, and the lab_result_templates extension
- [ ] Report reader (F1) live behind a flag, mock extractor kept as fallback
- [ ] Share sheet import for PDFs from WhatsApp and email
- [ ] Low confidence confirm step in Scan
- [ ] Reading v2 (F2) on record detail
- [ ] Health file becomes the body system dashboard (F3)
- [ ] Safety router shared by reader and chat, plus the first 15 red flag scripts
- [ ] Content: first 40 marker cards signed
- [ ] Onboarding asks who you care for and for a report
- [ ] Hide the product checker, sample doctors and the ₹29 pass

### Block 2, 9 Nov to 6 Dec: the plan and the people

Goal at the end: enrol in a program, do the week, look after a parent.

- [ ] Migrations for programs, program_weeks, program_enrollments, plan_actions, checkins, caregiver_links
- [ ] Programs engine (F4) with the Metabolic reset and Heart age programs first
- [ ] Weekly check-in (F6) and the Sunday push
- [ ] Parents mode (F8) and parent alerts (W5)
- [ ] Home rebuilt around plan, retests and the parents strip
- [ ] pg_cron due date jobs and the new notification kinds
- [ ] Content: program playbooks for the first two programs, 80 more marker cards, notification copy
- [ ] Pilot starts with the first 100 families

### Block 3, 7 Dec to 9 Jan: close the loop and charge for it

Goal at the end: book a retest from the plan, see the change, renew a pass.

- [ ] Migrations for retests, risk_scores, passes, change_cards
- [ ] Retest scheduler (F5) wired to lab bookings, results auto filed
- [ ] Change card (F7) with WhatsApp sharing
- [ ] Risk calculators (F10): eGFR, FIB-4, WHO CVD, IDRS
- [ ] Passes and billing (F11) from config, after the store payment question is answered
- [ ] Doctor review (F9) for red flags and plans
- [ ] Remaining three programs: Healthy parents, Strength and bones, Women 35+
- [ ] Hindi for marker cards, red flags and notifications

### How to know it is working

The pilot targets from the thesis, per 1,000 installs: 600 read a report, 180 start a plan, 72 complete a retest, 18 pay. Track each step as a funnel event from week one, so by the end of Block 3 the gaps are obvious. If reads are high but plans are low, the reading is not making the case. If plans are high but retests are low, the booking step has friction. Fix the biggest drop first.

Employer and insurer sharing (F12) waits until after the first retest cohort. The thesis gates the insurance path on 10,000 members and a claims pilot, and there is no point building the consent plumbing before there is data worth sharing.
