# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: the family health manager.** The son or daughter, roughly 28 to 45, in an Indian household, who keeps everyone's reports and prescriptions (mostly in WhatsApp and a drawer), and manages the health of parents, a partner and children on top of their own. Often lives in a different city from their parents. Confirmed by the founder on 10 Nov 2026 as the one person the landing page must win first.

**The five other situations the product is built for** stay on the page but do not lead it. They are the same six the app asks about at onboarding (`mobile-react-native/src/lib/onboarding/journeys.ts`):

- Trying to conceive
- Expecting a baby
- New parent
- Caring for parents (this is the primary user's own situation)
- Getting healthier ("Levelling up my health" in the app)
- Just keeping track

Their job, in every case: understand what a report or prescription means for one particular person at home, know what to do next, and get it done, without waiting for the next appointment.

Not an audience for this page: investors, employers, insurers. The founder removed those sections on purpose.

## Product Purpose

Cheeku is a health companion for the whole family. It keeps each person's reports, prescriptions, medicines and doctor visits in one file per person, explains them in everyday language, tells the family what to do next, and books the test or doctor.

It exists because of what happens between doctor visits. A consult lasts minutes. The weeks after it, when a report arrives that nobody explains, a follow-up test is forgotten, or medicines from three doctors are never looked at together, are left to the family and to Google.

Success for the landing page while the product is in stealth: a family joins the waitlist.

## Positioning

**Between doctor visits.** Confirmed by the founder on 10 Nov 2026. Cheeku is the companion for everything that happens between appointments: the follow-through nobody else does.

Why a neighbour cannot truthfully copy it: clinics earn on visits, pharmacies on medicines, labs on tests. None of them is paid to keep a family well in between, and none holds the family's records from every doctor and every lab in one place. Cheeku answers from that record, per person, so the answer is about your father and not an average patient.

The founder's "health home" document (10 Nov 2026) words the same idea as "your family's health home" and names the central gap as follow-through. Use "between doctor visits" as the position and "follow-through" as the gap it closes.

## Operating Context

- Reports arrive as PDFs and photos on WhatsApp. Prescriptions are handwritten, brand-named and from several doctors who do not see each other's lists.
- The person managing the family's health is usually not the patient, and often not in the same city.
- Questions come at bad hours: a baby's fever at 2 am, a parent's dizzy spell on a Sunday.
- Most care is paid for out of pocket, so cost matters: home sample collection, and a cheaper medicine with the same salt, are real reasons to use it.
- The product is a mobile app (iOS and Android, React Native). This folder is only its public website.
- Languages: the app is in English today. Hindi and other languages are planned, not built.

## Capabilities and Constraints

Checked against the app's code on 10 Nov 2026. The website may promise the first list. The second list must be worded as coming, or left off.

**Built in the app today**

- One health file per family member, with a family switcher. Up to four people on the family plan.
- Send a report or prescription as a photo or PDF, or share it in from another app. It is read and filed under the right person.
- Reports explained in plain words, with what changed since last time and which values need a doctor.
- A memory per person: medicines, open follow-ups, overdue tests, pregnancy dating, a baby's vaccines.
- Medicine check: a prescription read down to its salts and checked on ten published standards for that person, with questions for the doctor and cheaper options with the same salt.
- Chat that answers from the person's own records, with four levels of urgency. "Go now" skips the chat.
- Booking inside the app: lab tests with home collection, doctors (video or clinic), medicines, fitness and other services, through partners. Some booking flows are still marked "preview" in the app.
- Family care view: each person's doses today and anything that needs a call.
- A daily plan: one small step for food, sleep, movement and medicines. A meal photo can be logged against it, and a step count with a screenshot as proof.
- Insurance: the family's policies saved in one place, and the cover explained in plain words from the policy the person entered.

**Wanted on the page by the founder, but not built yet**

- Wearables and Strava: no connection exists in the code. Steps are typed in with a screenshot "until wearables connect". Apple Health and Health Connect sync is on the build list (F11). Strava is not on it.
- Meal scan that explains the food for that person: a photo can be logged; reading what is on the plate is on the build list (F12).
- Scanning a food or cosmetic ingredient label: not in the code and not on the build list.
- Comparing insurance plans: shown in the app as "soon".
- Talking by voice: not in the code. Planned for a later version.

**Open decision.** The founder ticked all four of these and also asked for a check of what the app can do. Until they say otherwise, the page presents them as coming soon, not as available. This needs their yes or no.

**Hard limits**

- Cheeku does not diagnose, prescribe, or tell anyone to stop or change a medicine. It never rates a doctor.
- Every number it states comes from the person's own records.
- Stealth: no pricing, no partner names, no investor or employer content, no founder names on this site.
- Care coverage figures that may be stated: 12,000+ pincodes, 300+ cities, 5,000+ doctors and specialists.
- Launch: store release planned for January to February 2027, in small batches from the waitlist. The exact public wording is not confirmed.
- Signups are not connected yet (see `README.md`).

## Brand Commitments

- Name: Cheeku (company: Cheeku AI). A round purple mascot exists; the founder does not want it in the hero.
- Colour, set by the founder: a light theme throughout, preferably white. No deep or dark sections (10 Nov 2026). Brand purple for accents, a loud colour for calls to action. The purple is the app's own (`#4a2ade`).
- Feel the founder asked for: Apple-style glass, in the direction of August, Heidi Health and Confido Health.
- Voice: short, plain, hard-hitting, written for Indian patients. No medical or lab terms in the copy. Everyday words: sugar, BP, tablets, tests. A little Hinglish where it is how people talk.
- Never: em dashes; the words AI-powered, platform, ecosystem, disrupting, revolutionise.
- Use real app screens, in a frame with true iPhone proportions. No stretched or invented phone mock-ups.

## Evidence on Hand

- Product film: YouTube `mI4FmQt_8Qk` (about two minutes). Belongs in the hero.
- Fertility film: YouTube `YHAdRiJ32Fo`. Belongs with "trying to conceive".
- Real app screens with sample data: `landing/public/screens/*.webp`, taken from the demo recordings. More can be cut from `mobile-react-native/marketing/product-demo/`.
- The founder's "health home" page (uploaded 10 Nov 2026): a full alternative wording, a family story told in chapters (planning for a baby, pregnancy, newborn days, growing family), and a six-step loop: connect, remember, understand, plan, act, check back.
- Elevator pitches and the seed deck: `mobile-react-native/founder-ops/library/`.

None of these exist, and must not be invented: testimonials, user counts, ratings, press, doctor endorsements, pricing.

## Product Principles

1. **Always about a person.** Every answer, file and reminder belongs to someone by name. Never the average patient.
2. **Follow through.** An answer is not the end. The test gets booked, the reminder fires, the result is filed.
3. **Plain words.** If a family member would not say it at home, it is not in the copy.
4. **Know the limit.** Cheeku explains and arranges. Doctors decide. Danger goes straight to a human.
5. **Only what is true today.** Built features are stated plainly. Planned ones are labelled as coming.

## Accessibility & Inclusion

No formal standard has been set. Known needs: readable on a low-cost Android phone on a slow connection; large, high-contrast text for older family members; works with Reduce Motion. Hindi and other Indian languages are planned.
