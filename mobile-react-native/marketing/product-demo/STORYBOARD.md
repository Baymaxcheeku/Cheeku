# Cheeku AI product demo v3: storyboard and script

One family, one app, one memory. Arjun and Priya plan a baby, go through the pregnancy, and welcome Tara, and every kind of care they book feeds the longevity engine. 1920x1080, 30 fps, 1:54.

**What changed from v2.** Every screen in the phone is the real app, recorded running, not a rebuild:

- the chat answers;
- bookings;
- the marketplace;
- records;
- memory;
- the daily plan.

The phone is an iPhone 15 Pro at its true proportions (393 x 852 pt). The app sits under a real status bar and above the home indicator, so nothing is stretched. Taps in the recordings show as touch ripples, and each one has a soft tap sound in the mix.

The format still follows v1 (`product-demo-v1.mp4`):

- a lilac canvas;
- a headline on the left in Inter, with an italic Instrument Serif accent;
- the phone in the middle;
- facts floating on the right;
- the mascot;
- a chapter rail (Planning, Pregnancy, Baby, Every care, Longer lives).

| # | Scene | Starts | In the phone (real app) | Voice-over |
|---|---|---|---|---|
| 1 | Hook | 0:00 | (motion graphics) Family group chat, paper reports, a 2 am search with three answers that disagree. | In India, a family's health lives in WhatsApp chats, paper files, and late-night searches. |
| 2 | Meet | 0:08 | Logo and mascot, then the phone rises on Arjun's real Home: "Hi Arjun, here's today", with the action plan. | Meet Cheeku AI. One app, and one memory, for your whole family's health. |
| 3 | Planning | 0:15 | Ask Cheeku, in Priya's memory. Arjun types "We're trying for a baby. What should Priya and I do first?" Cheeku shows "Reading Priya's history". The answer quotes her TSH (5.8, up from 4.9), folic acid, and Arjun's vitamin D and HbA1c, with citations to both reports. | Arjun and Priya are ready for a baby. He asks Cheeku for her, and the answer comes from her own reports. |
| 4 | Lab test | 0:25 | Lab tests: search "thyroid", add to cart, "5 labs do all of it", Thyrocare, "Collection booked!" with the tracker. Then her thyroid lab report with the gauge and each value's trend. | Her thyroid test is booked for home collection, and the report files itself, every value tracked over time. |
| 5 | Pregnancy | 0:33 | Memory: "Week 12 + 2 of pregnancy", due 13 May 2027, medicines and what is still open. | Then, it's positive. Now everything is read against week twelve. |
| 6 | Gynaecologist for her | 0:39 | Book a doctor with Cheeku: who it's for, "Periods, pregnancy or women's health", her own words, the pre-consultation note, two gynaecologists online, a 10:30 am video slot, "You're booked for Priya!" | Booking her gynaecologist takes a minute. The doctor gets her story before the call. |
| 7 | Medicine check | 0:47 | Orofer XT checked at salt level on 10 standards against her history: "Fits Priya", keep it 4 hours from Thyronorm, she is already on the same salt, and same-salt options for less. | Every prescription is checked at salt level, on ten standards, against years of her history. Same salt, for less. |
| 8 | Baby | 0:55 | "The baby has arrived": Tara, girl, normal delivery, 3.1 kg. "Welcome, Tara." | Then Tara arrives. One tap, and she has her own health file. |
| 9 | Paediatrician for Tara | 1:02 | Night. Tara's memory says "7 weeks old". "Tara feels hot. The thermometer says 100.6°F." The answer: under 3 months, a doctor tonight, no medicine first, plus a note written for the doctor. Then "Online consultation" opens the booking with Tara's history. | At midnight, she runs a fever. Cheeku knows she's seven weeks old, and gets a paediatrician on video, tonight. |
| 10 | After the consultation | 1:11 | Dr. Sameer Joshi's prescription, read and filed. Tara's memory then shows the medicine on schedule and the follow-up still open. | After the call, the prescription is filed, doses are set, and the follow-up waits in her memory. |
| 11 | Every kind of care | 1:18 | Book services: doctors, labs, medicines, fitness, mental health, dental, eye care, physio, home care, ambulance, and health insurance under Coming soon. Then a GP for Arjun booked for 11:00 am, and a medicine refill booked for home delivery. | A GP for Arjun. Therapy, physio, nurses at home, medicines delivered. Insurance, coming soon. |
| 12 | Fitness | 1:27 | Classes picked for Arjun, "Steady movement for sugar", "Book for me", "You're booked!" with the desk code. | Even a gym class, picked for his blood sugar. |
| 13 | Longevity engine | 1:32 | Today's plan built around his numbers, Family care ("How everyone's doing"), and the health file with flagged values and trends. | Every report, booking and dose feeds Cheeku's longevity engine. Each morning, everyone gets small steps, made for their own numbers. |
| 14 | Close | 1:42 | The family row, then a crowd and "Built for 100 crore Indians". End card: mascot, "Cheeku AI. Your family's health, remembered.", Free to start, Family plan ₹249 a month, and the phone on the family's real Home. | Built for a hundred crore Indians. Cheeku AI. Your family's health, remembered. |

## The one designed screen

The **medicine check** (scene 7) is a design mock, because the app has no salt-level check yet.

- **How it was built:** as a real React Native screen from the app's own parts:
  - `ScreenHeader`, `Backdrop`, `Gradient` and `Reveal`;
  - the semantic and hue tokens;
  - Inter.
- **How it was captured:** it ran in the app and was recorded the same way as the rest.
- **Where it lives:** the source is in `v3/design/medicine-check.tsx`. It was taken back out of the app, so nothing about it ships.
- **To make it real:** it needs:
  - a salt and brand database;
  - the interaction rules;
  - a link to the medicines Cheeku already knows.

Everything else in the phone is the app as it is on this branch.

## What the claims rest on

- **The family's records are invented.** They come from the app's own sample-records script (`mobile-react-native/scripts/demo-family-sql.ts`, renamed to this family), plus Tara's newborn records in `capture/stack/seed-tara.sql`.
- **The chat answers are scripted.** The local stand-in for the `cheeku-chat` function returns them (`capture/stack/functions.js`). They are shaped like the real reply, and every number in them comes from the family's records.
- **Medical lines follow standard guidance:**
  - TSH under 2.5 before conception;
  - folic acid 400 mcg;
  - for any fever of 100.4°F or more under 3 months, a doctor sees the baby the same night, with no medicine before that.
- **Doctors, labs and prices are the app's preview data.** Small print in the app says so ("Preview · sample doctors"), and it is visible in the recordings.
- **Medicine-check prices are illustrative.**
- **Health insurance is "Coming soon"**, as it is in the app.
- **The Family plan at ₹249 a month is the real price.**

## How it was made

- **Recording the app:**
  - A Supabase stand-in in `capture/stack`: Postgres with all 41 migrations, and a small PostgREST, auth and functions server in Node. It lets the signed-in app run in Expo web with this family's data.
  - Each flow is a script in `capture/cap/fin`, driven by Playwright at 393 x 778 and 2x density.
  - `state.sh` moves the database between story phases: planning, pregnancy, baby.
- **Voice:**
  - Kokoro-82M (Apache 2.0), voice `af_heart` at 0.96 speed, generated offline.
  - "Priya" and "Tara" are fixed at the phoneme level.
- **Music and sound effects:**
  - An original score (`music.py`), re-timed to these scenes.
  - The tap sounds are placed from the recordings' own tap logs.
- **Mix:**
  - The music ducks about 10 dB under the voice.
  - The master is about -14.5 LUFS.
