# Cheeku AI product demo v2: storyboard and script

One family, one app, one memory. Arjun and Meera go from trying to conceive, through pregnancy, to a newborn (Tara), and every kind of care feeds the longevity engine. 1920x1080, 30 fps, 1:59.

The format follows v1 (`product-demo-v1.mp4`): lilac canvas, a headline on the left in Inter with an italic Instrument Serif accent, the app on a phone in the middle, small cards floating on the right, and the mascot. v2 adds a chapter rail (Planning, Pregnancy, Baby, Every care, Longer lives) and motion inside every screen. Taps, typing, streamed answers, iOS pushes, a night scene, the longevity engine visual and a 100 crore close are all new.

Timings are generated: `timeline.py` lays scenes out around the measured voice-over lines, so a script change re-times the film.

| # | Scene | Starts | On screen | Voice-over |
|---|---|---|---|---|
| 1 | Hook | 0:00 | Family group chat asking for Papa's report, paper reports and an illegible prescription, a 2 am search for "is papaya safe in pregnancy" with three answers that disagree. All of it collapses into a bloom. | In India, a family's health lives in WhatsApp chats, paper files, and late-night searches. |
| 2 | Meet | 0:08 | "Cheeku AI" logo and the cheering mascot. The logo moves left, the phone rises on Arjun's home screen, and four promises float in. | Meet Cheeku AI. One app, and one memory, for your whole family's health. |
| 3 | Planning | 0:15 | Onboarding: "Trying to conceive" tapped, Meera added to the family. | This is Arjun and Meera. They're ready to start a family. |
| 4 | Ask for her | 0:21 | Arjun switches the chat to Meera and types his question. Cheeku answers from her reports: recheck thyroid (TSH 3.8), folic acid 400 mcg from today, Arjun's low vitamin D. "Preconception tests for two" is booked in the chat, with home collection. Cards: Now in Meera's memory, TSH trend, folic acid added to Today, booked for two. | Arjun asks for Meera. Cheeku answers from her own reports. Recheck her thyroid, start folic acid today, and fix Arjun's low vitamin D. Tests for both of them, booked right from the chat. |
| 5 | Positive | 0:37 | "It's positive." with confetti and the mascot. The phone shows week 6 and the due date. | Six weeks later, it's positive. |
| 6 | Pregnancy | 0:41 | Week 12 tracker, then a food answer (eat more, go easy, skip for now), then a product check on an energy drink: avoid for Meera. | Now Cheeku walks with Meera, week by week. What to eat, what to skip, and a quick check on anything she picks up. |
| 7 | Doctor | 0:51 | NT scan read and filed, in the usual range. Obstetrician booked with a pre-consultation note. | Every scan is read and filed, and her doctor sees the notes before the call. |
| 8 | Baby | 0:57 | "The baby has arrived" form (Tara, 3.1 kg, 39 weeks). The family is now three, with a vaccine card, growth chart and reminders set up for Tara. | Then Tara arrives. One tap adds her to the family, with her own vaccine card and growth charts. |
| 9 | Home care | 1:06 | New mother and baby care at home, with a nurse on the way. Postnatal physio for the core and pelvic floor, at home. | A nurse comes home for Meera and the baby, and a physio helps her recover. |
| 10 | Midnight fever | 1:13 | Night falls. "Tara feels hot, 100.6°F." Cheeku replies: Tara is 7 weeks old, so under 3 months any fever of 100.4°F or more needs a doctor tonight; no medicine without a doctor. A paediatrician video call is booked, and the advice is saved to her file. | At midnight, Tara runs a fever. Cheeku knows she's just seven weeks old, and says: see a doctor tonight. |
| 11 | Every care | 1:22 | Service tiles fly out as they are named: doctors, labs, medicines, mental health, dental, eye care, physio, home care, ambulance, fitness, specialists, and health insurance marked coming soon. Then the family's bookings, and one booking travelling from booked to back in the memory. | Doctors, labs, medicines, therapy, dental, eyes, physio, home care, and ambulance. Every kind of care, booked in one place, and every result comes home to the family's memory. |
| 12 | Longevity engine | 1:37 | Reports, bookings, medicines, vaccines, meals, steps, sleep and check-ins flow into the engine. Each person's today comes out: Arjun walks after dinner, Meera does pelvic floor work, Tara gets tummy time. The next check-ups are booked, and the loop closes back into bookings. | All of it feeds Cheeku's longevity engine. Each morning, everyone gets a few small steps, and the next check-up is booked before it's due. |
| 13 | Close | 1:48 | Grandparents join the family row, then a crowd of faces and "Built for 100 crore Indians". End card: mascot, "Cheeku AI. Your family's health, remembered.", Free to start, Family plan ₹249 a month, and the phone with the family's home screen. | Small steps, for longer, healthier lives. Built for a hundred crore Indians. Cheeku AI. Your family's health, remembered. |

## What the claims rest on

- **Features shown are in the app.** They come from `mobile-react-native`:
  - pregnancy dates and "The baby has arrived" (`app/pregnancy.tsx`);
  - "Trying to conceive" and "Expecting a baby" in onboarding;
  - the service catalogue, including mental health, physio "After a baby", home care "New mother and baby care", ambulance and insurance (`src/lib/services/catalog.ts`);
  - vaccine reminders and the age rules for babies (`src/lib/profiles/health-rules.ts`);
  - the product check, pre-consultation notes, and the daily plan.
- **Health insurance is marked "coming soon"**, because it is coming soon in the app.
- **Medical lines follow standard guidance:**
  - folic acid 400 mcg before conception;
  - caffeine under 200 mg a day in pregnancy;
  - skip raw papaya and unpasteurised milk;
  - BCG, OPV and Hep B at birth, then the 6-week vaccines;
  - any fever of 100.4°F or more under 3 months is seen by a doctor the same night, with no medicine before that.
- **Names, values, prices and doctors are illustrative.** Prices follow the app's own patterns; the Family plan at ₹249 a month is the real price.

## How it was made

- **Screens:** rebuilt in Remotion from the app's tokens (`tailwind.config.js`), fonts (Inter, Instrument Serif), mascot Lottie files, avatars and care art, using v1's real screens as the reference. A signed-in app with this family's data couldn't run in the build sandbox, and rebuilding lets every screen animate.
- **Voice:** Kokoro-82M (open model, Apache 2.0), voice `af_heart` at 0.94 speed, generated offline. "Meera" is fixed at the phoneme level to "Mee-raa".
- **Music:** an original score composed and synthesised for this cut (`music.py`). It sits in D major, lifts to E when Tara arrives, drops to a heartbeat for the fever, builds into the engine, and resolves on the logo.
- **Sound effects:** synthesised in the same key.
- **Mix:** the music ducks about 10 dB under the voice. The master is -14.5 LUFS with peaks at -0.8 dBFS.
