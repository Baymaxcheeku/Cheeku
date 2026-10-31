# Cheeku longevity thesis v2: the daily health companion

2026-10-12 · Athar Ali · Internal reference. Replaces v1.

## The one line

**Cheeku helps Indian families live healthier and longer by turning every report, prescription and daily choice into the next right step, then booking it.**

v1 drew Cheeku as a 90 day loop: report, plan, retest. That loop still exists, but it is too slow to build a habit around. Nobody opens a health app four times a year and calls it a companion. v2 keeps the loop as the outer ring and puts a daily one inside it, where Cheeku helps with the small decisions that actually decide how long and how well someone lives: what to eat tonight, whether this cough needs a doctor, whether the new prescription makes sense, when Papa's sugar should be checked again.

### What changed from v1

| Topic | v1 said | v2 says |
|---|---|---|
| What the app is | A report reader with a 90 day plan | A daily health companion with a longevity layer in every chat |
| Business model | Passes sold as test bundles (₹1,999 to ₹9,999) | **Unchanged subscription tiers.** Free tier capped at about 20 chats a day. No high ticket packages. |
| Labs and tests | Bundled into passes | Booked from inside the chat through the lab partner, at partner price plus a markup, shown as one price |
| Rhythm | Every 90 days | Daily nudges, a weekly review, a quarterly retest |
| Medicines | Read and stored | **Prescription check**: composition, interactions, dose fit and evidence, scored against published guidelines |
| AI | Rules decide, the model explains | Same principle, plus a clear list of what a frontier model like Claude can and cannot do in health (section 7) |

What did not change: rules decide anything clinical, the model explains it, a doctor sees every red flag, and nothing is shared without consent.

## Why longevity, why India

**Indians are living longer but spend about ten of those years in poor health, and most of the damage is decided between doctor visits, not during them.** WHO put India's life expectancy at 70.8 years and healthy life expectancy at 60.3 (2019 estimates). The diseases that fill that gap show up early here and are visible in routine blood tests years ahead of a hospital bed.

| Measure | Figure | Source |
|---|---|---|
| People aged 60+ | 14.9 crore in 2022, about 22.7 crore by 2036, 34.7 crore by 2050 | UNFPA India Ageing Report 2023 |
| Elderly outnumber children (0 to 14) | Around 2046 | UNFPA India Ageing Report 2023 |
| Diabetes / prediabetes | 10.1 crore / 13.6 crore adults | ICMR-INDIAB, 2023 |
| High blood pressure | 31.5 crore adults | ICMR-INDIAB, 2023 |
| Health spend paid from families' own pockets | 39.4% | National Health Accounts 2021-22 |

The gap that matters for Cheeku is not in the clinic. A typical consult in India lasts a few minutes. The patient walks out with a prescription in handwriting they cannot read, a test list they do not understand and no one to ask until the next visit. Then come 90 days of daily choices about food, walking, sleep, medicines and symptoms, made alone or with Google. Those choices decide whether the next report is better or worse.

That in-between space is where a companion earns its place:

- **Before a consult**: is this worth a visit, which doctor, what to bring, what to ask.
- **After a consult**: what this prescription is, whether it fits, what to eat and avoid with it, when to test again.
- **Every other day**: the small calls that add up to healthspan.

Premium screening clinics (Cent, Nura) sell a test and a reading once a year in a few metros. Fitness and diet apps cover one slice each. Nobody owns the daily layer that ties a family's reports, medicines, food and movement together and acts on it. That is the opening.

## Positioning: more than an AI chat

**The promise: Cheeku helps you live healthier and live longer by knowing your numbers, checking your medicines, eating for your body, moving every day and booking the right care on time.** Chat is how you talk to it, not what it is.

_[chart: Cheeku positioning · 5 daily jobs on one family memory]_

Every pillar rests on the same base, which already exists in the codebase. That is why a new pillar costs weeks, not a new app.

### Before and after

|  | Cheeku as an AI chat (today) | Cheeku as a daily companion (v2) |
|---|---|---|
| Why you open it | Something worries you | Cheeku has the next step ready, every morning |
| What it knows | What you typed in this chat | Every report, prescription, meal pattern and booking, per family member |
| What it does | Answers | Answers, decides with you, books, then follows up |
| Who it serves | The person typing | The whole family, with parents first |
| When you leave | When the question is answered | Never quite: something is always due |
| What you pay for | More chats | The same subscription, plus tests and care booked at a fair price |

The tagline to test in the store listing and onboarding: **"Live healthier, live longer. Cheeku tells your family what to do next."** Two alternatives for the A/B test: "Your family's daily health companion" and "From reports to routines".

## The longevity layer in chat

**Every chat gets a longevity layer: before Cheeku answers, it checks the question against the person's numbers, medicines, active goals and what is due, and it ends every answer with one next step.** The 90 day retest from v1 is now the outer loop. The new daily loop sits inside it and is what makes Cheeku a habit.

_[chart: The longevity layer in chat · 3 loops on 1 family memory]_

The daily lane is new and carries the habit. The weekly and quarterly lanes already existed in v1. All three write into the same memory, so tomorrow's nudge knows what happened today.

### What the layer adds to a normal answer

Take a plain question: "Can I eat mango?" A general chatbot gives a general answer. With the longevity layer, Cheeku answers for this person:

1. **Context pulled**: HbA1c 6.4 three weeks ago, on metformin 500 twice a day, walking goal 6,000 steps, two days under it.
2. **Rule applied**: prediabetic range plus metformin means portion and timing matter more than a yes or no.
3. **Answer**: "Half a medium mango, after lunch, not on an empty stomach or late at night. Pair it with a 10 minute walk."
4. **Next step**: "Your retest is due in 9 weeks. Want me to remind you two weeks before?"
5. **Memory**: the question and the advice are logged, so the Sunday review can say "mango twice this week, sugar still on track".

The numbers in this example are illustrative. The pattern is the product: context, rule, answer, next step, memory.

### The five things the layer always checks

| Check | Question it asks | Where it comes from |
|---|---|---|
| Numbers | Does any recent value change this answer? | Measurements from reports and home readings |
| Medicines | Does anything they take interact with this food, drug or activity? | Medicine ledger and the prescription check |
| Goals | Which active goal does this help or hurt? | Plan and weekly review |
| Due | Is a test, refill, dose or follow-up coming up? | Open loops and the retest scheduler |
| Safety | Is this an emergency or a red flag? | Safety router, which runs before anything else |

## Decision moments: what the companion handles

**Cheeku wins the day by owning about a dozen moments that repeat in every Indian household, and each one ends in an action, often a booking.** The list below is the scope of the daily layer. Anything outside it gets a plain answer and no push.

| Area | Moment | Example question | What Cheeku does | What it can book |
|---|---|---|---|---|
| Care | Symptom triage | "Papa has had a fever for 3 days, should we go?" | Safety router first, then urgency level, then what to watch for | Doctor video consult or clinic visit, today |
| Care | Before a consult | "I'm seeing a cardiologist tomorrow" | Builds a one page brief from memory: history, latest values, medicines, three questions to ask | The consult itself, plus a pre-consult test if useful |
| Care | After a consult | "Doctor gave me this prescription" | Reads it, runs the prescription check (section 6), sets dose reminders and a follow-up date | Follow-up visit, the tests the doctor asked for |
| Medicines | Daily doses | "Did Mummy take her BP tablet?" | Dose reminders, caregiver ping on a miss, refill alert 5 days ahead | Medicine delivery (partner, later) |
| Medicines | Over the counter | "Can I take a painkiller with my BP medicine?" | Checks against the medicine ledger and kidney function | Nothing. A pharmacist or doctor if unsure |
| Nutrition | Meal choice | "What should I eat tonight?" | Suggests a meal that fits their diet type, markers and goal, in Indian portions | Dietitian consult |
| Nutrition | Plate check | Photo of a thali | Estimates carbs and protein, one swap for next time | Nothing |
| Fitness | Today's movement | "I skipped my walk, what now?" | A 10 minute fix, adjusted for age, knees and BP | Physio or trainer session |
| Fitness | Strength for 50+ | "How do I stop losing muscle?" | A home routine, progress via sit-to-stand and grip | Physio assessment |
| Sleep and stress | Bad nights | "I keep waking at 3am" | Pattern questions, sleep hygiene, flags if it hints at apnoea or thyroid | Sleep study or doctor, if flagged |
| Diagnostics | Should I test? | "Is it time for my thyroid test?" | Checks last value and date, explains why or why not | The exact panel, home collection, through the lab partner |
| Diagnostics | Any report | A PDF from any lab | Reads it, compares with past reports, says what changed | A retest or a doctor review |
| Family | Remote parent | "How is Papa doing this week?" | Summary of doses, readings and anything overdue | Home visit, test or consult for the parent |

**How a moment becomes a booking.** Cheeku never opens with a sale. It recommends a booking only when the answer genuinely needs one (a test is overdue, a symptom needs a doctor, a plan needs a dietitian) and says why in one line. The booking card shows one price, a slot and home collection where possible, and the person confirms in chat.

## Prescription check: medicines, scored against the science

**Every prescription a family adds gets read down to its salts and checked against ten published standards, and the person gets a scorecard plus the questions worth asking their doctor.** It scores how well the prescription fits the guidelines for this person. It never rates the doctor and never tells anyone to stop a medicine.

Why this matters in India: prescriptions are often handwritten, brand-named and short on explanation. Fixed-dose combinations are common, some of them on the government's banned list. Older parents collect medicines from three or four doctors who never see each other's prescriptions. Nobody checks the whole list against the patient's kidney function or age.

_[chart: Prescription check pipeline · 7 steps, 1 safety exit]_

The safety exit sits before the scorecard on purpose. A dangerous combination is not a score to read, it is a call to make today.

### The ten checks

| # | Check | What it looks at | Standard it uses | Example flag |
|---|---|---|---|---|
| 1 | Composition | Salt, strength and form behind every brand | Licensed Indian drug database, brand to salt | "Two of these brands contain paracetamol" |
| 2 | Rational combination | Whether a fixed-dose combination is approved and sensible | CDSCO list of banned FDCs | "This cough syrup combination is on the banned list" |
| 3 | Fit for the condition | Whether each drug matches the stated or likely reason | ICMR Standard Treatment Workflows, national programme guidelines | "No reason recorded for this drug, ask what it is for" |
| 4 | Interactions | Drug with drug, drug with condition, drug with food | Licensed interaction database | "This painkiller can raise BP and strain the kidneys" |
| 5 | Dose fit | Dose against age, weight, kidney and liver function | Labelled doses, renal dosing tables using eGFR from their report | "Dose may need lowering at an eGFR of 42" |
| 6 | Duplication | Same salt or same class twice | Drug class mapping | "Two acid reducers from two doctors" |
| 7 | Antibiotic use | Antibiotic for a likely viral illness, wrong length, a Watch or Reserve drug first | WHO AWaRe classification, ICMR antimicrobial guidelines | "Antibiotic for a 2 day cold, ask if it is needed" |
| 8 | Elderly safety | Drugs that carry extra risk at 65+ | AGS Beers Criteria, STOPP/START | "This sleep tablet raises fall risk in older adults" |
| 9 | Monitoring | Tests the drug needs and whether they are due | Drug monitoring guidance | "Metformin users should check B12 yearly, last checked 2023" |
| 10 | Cost | Generic equivalent, price ceiling, public pharmacy option | NPPA ceiling prices, NLEM, Jan Aushadhi list | "Same salt is available as a generic for about a third of the price" |

The flags above are illustrative wording, not clinical claims. Each check's rule, threshold and wording is signed by our clinical reviewer before it goes live, and the data behind checks 1, 4 and 5 should be licensed from an established drug knowledge provider, not built from scratch.

### What the person sees

- A **scorecard**: each check marked clear, worth asking, or urgent, with one line of why. A summary like "8 of 10 clear, 2 worth asking about".
- **Questions to take back**: phrased for the doctor, ready to share on WhatsApp. "Could the dose of X be adjusted given my kidney report?"
- **What happens next**: dose reminders, refill alerts and any monitoring tests, bookable in one tap.

### Rules the feature never breaks

1. Never says stop, skip or change a dose. It says "ask your doctor" and gives the exact question.
2. Never scores, names or ranks the doctor. The object is the prescription, for this patient, today.
3. Anything urgent (a dangerous interaction, a dose far outside range, a drug the person is allergic to) skips the scorecard and goes to the red flag flow.
4. Every flag shows its source, so the person and their doctor can check it.
5. Low confidence in reading the handwriting means the person confirms the medicine first. No check runs on a guess.

## What Claude's health layer does, and what we take from it

**Anthropic launched Claude for Healthcare in January 2026. The consumer side lets US Pro and Max subscribers connect records, labs and wearables and get them explained. None of that consumer side is available in India, and none of it knows Indian labs, brands or families.** That gap is Cheeku's to fill, using the same model through the API and copying what works.

### What it does today (as reported)

| Area | What Claude does | Who gets it |
|---|---|---|
| Health records | Connects to records from over 50,000 US health systems through a partner (HealthEx). Pulls only the categories a question needs: medicines, allergies, labs, notes | US Pro and Max |
| Lab results | Connector to a US lab testing company (Function Health) to read and explain results | US Pro and Max |
| Wearables | Apple Health and Android Health Connect, in beta: activity, sleep, heart rate patterns | US, mobile apps |
| Explaining | Summarises medical history, explains lab results in plain language, spots trends across metrics, prepares questions for a doctor's visit | Consumer |
| Privacy | Opt in, revocable, health data kept out of memory and not used for training | Consumer |
| Clinicians and payers | HIPAA-ready setup, connectors to PubMed, ICD-10 codes, the US coverage database and provider registry, agent skills for FHIR and prior authorisation | Enterprise |
| Life sciences | Connectors to ClinicalTrials.gov, preprint servers, drug and target databases | Enterprise |

Our reading of how it answers health questions: it leads with a direct explanation, uses the person's own data when connected, says what it is unsure of, suggests questions for a doctor, and points to professional care for decisions. That is the tone Cheeku's chat should match.

### What Cheeku can build out of it

| Claude pattern | Cheeku version for India | Effort |
|---|---|---|
| Record connectors that fetch only what a question needs | Chat calls tools on our own memory (get_latest_labs, get_medicines, get_due_items) instead of stuffing the whole history into the prompt. Cheaper, safer, easier to audit | Medium. Fits the existing chat pipeline |
| Health record network (HealthEx) | **ABDM**: link the person's ABHA and pull records from registered hospitals and labs with consent, in FHIR format. India's version of the same idea | Large. Needs ABDM PHR app certification |
| Lab connector (Function Health) | Lab partner results file straight into memory after a booking. Plus "bring any report" for every other lab | Built in part (booking sync) |
| Apple Health and Health Connect | Read steps, sleep, heart rate and weight in the app directly, feed the daily nudge and weekly review | Medium |
| Explain labs, find trends, prep for visits | Reading v2, trend by body system, the pre-consult brief. In Hindi and English, against Indian ranges | Partly built |
| PubMed connector | Evidence links on prescription check flags and longer answers, through PubMed's public search API | Small |
| ICD-10 coding | Code conditions in memory so data is clean enough for doctors and, later, insurers | Small |
| Prior authorisation skill | Later: help families with cashless pre-authorisation paperwork for Indian insurers and TPAs | Later, ties to section 12 |
| Health data kept out of training and memory | Same promise in our consent copy. Use the API under commercial terms and ask Anthropic about zero data retention for health traffic | Small, mostly legal |

### What Claude does not do, and Cheeku must

- Know Indian lab layouts, Indian brand names and their salts, banned combinations and price ceilings.
- Hold a family: one login caring for parents, with roles and alerts.
- Book anything: tests, doctors, dietitians, home visits.
- Remember across months in a structured way that drives reminders and retests.
- Work on WhatsApp, which is where Indian reports and prescriptions actually arrive.

The model is the engine. The Indian data, the family graph, the bookings and the clinician-signed rules are the product.

## Booking from chat

**Every booking starts and ends in the chat thread: Cheeku spots the need, explains it in one line, shows one price, takes payment, and reads the result back in the same place.** The lab partner handles tests and home collection. Cheeku adds a markup on the partner's price and owns the experience around it.

_[chart: Booking from chat · 8 steps in one thread]_

The booking card is the only selling surface in the app, and it appears only when the conversation earned it. The return path matters as much as the sale: a result read in the thread that asked for it is what makes the next booking feel natural.

### What can be booked

| Category | Examples | Fulfilled by | How Cheeku earns | Status |
|---|---|---|---|---|
| Diagnostics | Panels, single tests, home collection, retests | Lab partner | Markup on partner price | Partner integration next. Booking tables and result sync exist |
| Doctor consults | GP and specialist, video or clinic, follow-ups | Doctor network | Fee or commission per consult | Booking flow exists, real supply needed |
| Nutrition | Dietitian consults, meal plan reviews | Dietitian partners | Commission | New |
| Fitness and rehab | Physio assessment, trainer sessions, yoga for seniors | Physio and trainer partners | Commission | New |
| Elder care at home | Nurse visit, vitals check, sample collection for parents | Home care partners | Commission | New |
| Medicines | Refills from the medicine ledger | Pharmacy partner | Commission | Later, after licensing review |

### How the price works

- **One price on the card.** Partner price plus Cheeku's markup, shown as a single number with a breakdown one tap away. India's e-commerce rules expect the total and its parts to be clear, and hiding the markup costs trust the first time someone compares.
- **Markup band to test**: 10% to 20% on diagnostics, kept below the price of the same test booked directly with a walk-in lab where possible. The partner's negotiated rate makes that possible.
- **Paid users get something real**: Solo and Family subscribers see a lower markup or free home collection. That gives the subscription a value that is felt in rupees.
- **Payment rails**: tests, visits and consults are physical or person-to-person services, which app store rules let us charge through UPI and cards rather than in-app purchase. The subscription itself stays on in-app purchase on iOS. Confirm both with the store review teams before launch.

## Business model: same subscription, bookings on top

**The subscription tiers stay exactly as they are. The only change is a more generous free tier, about 20 chats a day, so the daily habit can form before anyone is asked to pay.** Money comes from two places: subscriptions for unlimited companionship, and a markup or commission on care booked through chat.

### Tiers (unchanged except the free cap)

| Tier | Price | What it gives | Change from today |
|---|---|---|---|
| Free | ₹0 | About 20 chats a day, any report read, prescription check, family memory, booking at standard price | Up from 5 chats a day |
| Daily Pass | ₹29 for 24 hours | Unlimited chats for one worry, no renewal | None |
| Solo | ₹99 a month | Unlimited chats, full longevity layer, lower booking markup or free home collection | Adds the booking benefit |
| Family | ₹249 a month | Everything in Solo for the family, parent alerts, caregiver view | Adds the booking benefit |

Why 20 and not unlimited: 20 covers a real day of questions for one family, so the free tier proves the companion. The paywall then lands on heavy use and on caring for more than one person, which is where the value is. The cap needs a cost check first: free chats should run on a smaller, cheaper model with tool calls into memory, and the bigger model is kept for paid users and hard questions.

### Where the money would come from

_[chart: Illustrative assumptions, typed in this doc · 1 month, 1,000 monthly users]_

Under these assumptions lab markup alone is close to half of revenue, and subscriptions are about a third. That is the mentor's point in numbers: consumers pay a little for the app, and commerce carries the rest.

| Stream | People in a month (of 1,000) | Rupees each | Basis of the assumption |
|---|---|---|---|
| Lab test markup | 80 | 180 | 8% book a test, average order ₹1,200, 15% markup |
| Solo subscriptions | 50 | 99 | 5% on Solo |
| Family subscriptions | 20 | 249 | 2% on Family |
| Doctor consult fees | 30 | 100 | 3% book a consult, ₹100 earned per consult |
| Nutrition and fitness | 10 | 150 | 1% book a dietitian or physio |
| Daily Pass | 30 | 29 | 30 passes bought |

Every number above is a placeholder to replace with pilot data in the first 90 days. The one to watch is the share of monthly users who book anything, because it drives more revenue than any price change.

## AI and data architecture

**The principle from v1 holds: code computes, clinicians set the rules, the model only explains.** v2 adds two inputs (prescriptions and wearables), a medicine dictionary next to the marker dictionary, and a model that reaches into memory through tools instead of reading everything at once.

_[chart: Proposed AI and data architecture · 6 layers, 1 feedback loop]_

The memory band is the moat. Everything above it fills it, and everything below it reads from it. Booking results and chat logs flow back in, so each loop makes the next answer better.

### The pieces that matter most

| Piece | What it is | Build or buy | Status |
|---|---|---|---|
| Report reader | Photo or PDF of any Indian lab report to clean, unit-checked markers | Build on the model's vision, plus layout hints per lab | Mock today. The first build |
| Rx reader | Handwritten or printed prescription to drug, dose, timing, days | Build, with person confirms on low confidence | New |
| Marker dictionary | One code per marker across lab spellings, units and conversions | Build. Grows with every new lab format | New |
| Medicine dictionary | Brand to salt, strength, class, banned FDCs, ceiling prices | **Buy or license** the core, add Indian public lists | New |
| Interaction and dose data | Drug pairs, drug with condition, renal and age dosing | **License** from an established provider | New |
| Rules engine | Bands, risk scores, the 10 checks, red flags. Versioned and signed | Build. Postgres functions, tested | Partly built (safety router, thresholds) |
| Memory tools | get_latest_labs, get_medicines, get_goals, get_due_items, book_test | Build on the existing chat pipeline | New, small |
| Model | Claude through the API, a smaller model for free chats and routing, a larger one for hard questions | Buy | Adapter exists |
| Wearable sync | Apple Health and Health Connect: steps, sleep, heart rate, weight | Build | New |
| ABDM link | ABHA linking and consented record pulls in FHIR | Build, needs certification | Later |

One rule ties it together. The model never sees a number it did not get from a tool call, and it never states a band, dose or score the rules did not return. Answers that break this are caught by an output check and rewritten before the person sees them.

## Stickiness and the numbers to watch

**Something is always due.** That is the whole stickiness design. Every cadence below gives the person a reason to open Cheeku that did not come from a worry.

| Cadence | What pulls them back | What it feeds |
|---|---|---|
| Daily | One morning nudge picked from memory: a dose, a walk, a meal swap, a reading | The habit, and the free to paid upgrade |
| Weekly | Sunday review in 60 seconds: what moved, one change | Plan adjustments, caregiver summary |
| Monthly | Refill alerts, a parent's vitals check, the family health summary | Medicine bookings later, Family plan value |
| Quarterly | Retest due, booked in chat, change card on the result | Lab markup, the proof that Cheeku works |
| Yearly | Full health review for each family member, the year's change cards | Renewal, referral, a full panel booking |

What makes leaving costly is the memory. After a few months, a family's reports, prescriptions, trends and plans live in Cheeku, and starting again elsewhere means starting from zero.

_[chart: Proposed pilot targets, typed in this doc · 5 stages per 1,000 installs]_

The week 4 habit is highlighted because it decides everything after it. If people come back three days a week without a worry, bookings and subscriptions follow. If they do not, no price change will save the model.

Metrics to track from week one: daily and weekly active users, nudges acted on, prescriptions checked, bookings per 100 monthly users, booking repeat rate, free to paid conversion, and the share of retests with at least one marker improved.

## The insurance path, kept short

**The daily layer makes the insurance story stronger than v1, because an insurer gets behaviour between tests, not just tests.** Medicine adherence, activity, check-ins and booked follow-ups are exactly the risk-reducing actions nobody records today. The mentor's estimate of the prize stays: about ₹1,000 crore a year at 1% of the health insurance market.

| Step | What the insurer buys | What it gets | What the family gets | Gate to the next step |
|---|---|---|---|---|
| 1. Wellness partner | A companion for its policyholders | Engagement, adherence and retest data, aggregated and consented | Funded tests and renewal rewards under IRDAI wellness rules | 10,000 active members |
| 2. Risk signal | Cohort analytics linked to its own claims | Proof that engaged members claim less | Bigger rewards for improving numbers | A claims pilot with one insurer |
| 3. Underwriting layer | A consented health passport at proposal and renewal | Faster underwriting, pricing that updates | Cover that gets cheaper as they get healthier | IRDAI sandbox approval |

A side door opens early: helping families with cashless pre-authorisation and claim paperwork, using the medical history Cheeku already holds. It earns trust with insurers before any data deal.

The two rules from v1 stand. Nothing identifiable reaches an insurer without explicit, purpose-specific consent from the consent ledger. And Cheeku only ever unlocks rewards: a worse result never raises a premium through us.

## Risks and guardrails

**The two new risks in v2 are the prescription check and the booking markup. One can hurt someone if it is wrong, the other can break trust if it feels hidden.** Both have hard rules below.

| Risk | Why it matters | How we handle it |
|---|---|---|
| Prescription check is wrong or read as "your doctor is wrong" | Harm to a patient, anger from doctors, legal exposure | Never says stop or change. Scores the prescription, not the doctor. Every flag cites its source. Licensed drug data. Clinician signs every rule. Doctors invited to see the same scorecard |
| Crossing into a regulated medical device | Software that guides treatment can fall under device rules | Regulatory opinion before launch of the prescription check and risk scores. Keep it as information plus questions for the doctor |
| Markup feels hidden | One price comparison on WhatsApp undoes months of trust | Single price with a breakdown on tap. Kept below a walk-in price where possible. Paid users get a lower markup |
| The companion nags | Daily nudges turn into noise and get muted | One nudge a day at most, picked from memory, easy to snooze. Track mute rate as a core metric |
| 20 free chats a day cost too much | Model costs grow faster than revenue | Smaller model and memory tools for free chats, bigger model for paid and hard questions. Measure cost per active user weekly |
| Wrong report or prescription reading | One misread value or dose destroys trust | Unit and plausibility checks, low confidence goes to the person to confirm, the original image always one tap away |
| Data shared beyond consent | Health data in India is covered by the DPDP Act, and families must feel safe | Purpose-level consent from the existing ledger, health data never used to train models, nothing to employers or insurers without explicit opt in |
| App store payment rules | Rejected builds delay launch | In-app purchase for subscriptions on iOS, UPI and cards for physical and person-to-person services. Confirm with store review |

### What we will not do

- Tell anyone to stop, skip or change a medicine.
- Rate, rank or name doctors based on their prescriptions.
- Sell supplements or take margin on anything we recommend other than the booked service itself.
- Promise a lifespan or a single-point biological age.
- Push a booking the conversation did not earn.

## Sources

This environment blocks direct page fetches, so the items below were confirmed through web search results, not read on the page. Check them on the primary source before any external use.

**Claude's health layer** (section 7):

- [Anthropic: Claude for healthcare and life sciences](https://anthropic.com/news/healthcare-life-sciences): connectors (PubMed, ICD-10, CMS, provider registry), FHIR and prior authorisation agent skills, life sciences connectors
- [MobiHealthNews: Anthropic launches Claude for Healthcare](https://www.mobihealthnews.com/news/jpm-anthropic-launches-claude-healthcare): consumer capabilities, US Pro and Max
- [Fortune: Anthropic unveils Claude for Healthcare](https://fortune.com/2026/01/11/anthropic-unveils-claude-for-healthcare-and-expands-life-science-features-partners-with-healthex-to-let-users-connect-medical-records): HealthEx and Function Health connectors
- [Clinical Trials Arena: JPM26 coverage](https://www.clinicaltrialsarena.com/news/jpm26-anthropic-advances-healthcare-presence-with-new-ai-toolkit-2/): HealthEx as the first consumer record integration
- [MacRumors: Claude connects to Apple Health](https://forums.macrumors.com/threads/claude-ai-iphone-app-can-now-connect-to-apple-health-in-the-us.2476425/): Apple Health and Health Connect beta
- [Forbes, 3 Oct 2026: how Anthropic is aiming to transform healthcare](https://www.forbes.com/sites/jessepines/2026/10/03/heres-how-anthropic-is-aiming-to-transform-healthcare/): consumer features still US paid only, privacy terms

**India figures** (section 2), carried from v1: [Healthy life expectancy in India (PMC10792328)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10792328/) · [UNFPA India Ageing Report 2023 coverage](https://www.outlookindia.com/national/elderly-population-in-india-growing-rapidly-could-exceed-children-by-2050-says-unfpa-news-320985) · ICMR-INDIAB (Anjana et al., Lancet Diabetes & Endocrinology, 2023) · National Health Accounts 2021-22.

**Standards named in the prescription check** (section 6), cited from memory, each to be pulled from the publisher before the rule is written: CDSCO notifications on banned fixed-dose combinations · NPPA ceiling prices and the National List of Essential Medicines · Jan Aushadhi product list · ICMR Standard Treatment Workflows and antimicrobial treatment guidelines · WHO AWaRe antibiotic classification · American Geriatrics Society Beers Criteria · STOPP/START criteria · CKD-EPI 2021 for eGFR.

**Regulation named in sections 8 and 13**, from memory: Digital Personal Data Protection Act 2023 · Consumer Protection (E-Commerce) Rules 2020 · Telemedicine Practice Guidelines 2020 · Medical Devices Rules 2017 · IRDAI wellness and sandbox provisions · Apple App Store Review Guidelines on goods and services used outside the app.

The mentor's estimates (1% of the market, about ₹1,000 crore) are from your call notes. All revenue and funnel numbers in sections 9 and 11 are assumptions written for this doc.
