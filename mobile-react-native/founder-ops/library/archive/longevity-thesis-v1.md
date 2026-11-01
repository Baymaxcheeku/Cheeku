# Cheeku longevity thesis: from health chat to India's healthspan engine

2026-10-12 · Athar Ali

## The answer

The longevity lens makes Cheeku better, not different, as long as we build it as a vertical program on top of the family memory layer, not as a new app. The bet in one line: **become the place every Indian family brings its lab reports, from any lab, and turn each report into a 90-day plan that ends in a retest.**

The mentor's three points line up with what is already built:

| What he said | What it means for us | What we already have |
|---|---|---|
| Consumers won't pay for a marketplace; commerce can carry it | Labs and care partners fund the transaction; families pay for an outcome, not for access | Lab booking tables, partner adapter, booking from chat |
| Chat-only platforms and records-only apps both failed | Retention comes from a connected journey with a due date, not from content | Memory layer, values over time, open loops, reminders |
| Insurers price once and never reduce risk afterwards | Consented, repeated biomarkers after a policy is sold are the missing infrastructure | Consent ledger, per-person time series, safety router |

Why longevity is the right vertical to go deep on first:

- **The spend already exists.** Families already pay out of pocket for blood tests. We sit on top of that spend instead of asking for new spend.
- **The retest is the stickiness engine.** A plan with a due date brings people back every 3 to 6 months by design, which is exactly what records apps lacked.
- **Parents decide who pays.** Adult children pay for their parents' health before their own, and Cheeku is already built around a family.
- **Every cycle compounds the data asset.** Biomarker, plan, adherence, retest result: the four-part record an insurer cannot get anywhere else today.

What changes in the product: a new front door ("bring any report"), a healthspan dashboard, programs that schedule retests, and a parents mode for remote care. What does not change: one memory per family, the safety router, the consent ledger, and the rule that Cheeku does not diagnose.

## The problem: Indians live longer, not healthier

An Indian born today can expect about ten of their years to be lived in poor health. WHO put life expectancy at 70.8 years and healthy life expectancy at 60.3 years (2019 estimates); healthy life expectancy then fell to about 58 during the pandemic and has barely moved since. The chronic diseases that fill that gap start earlier here than in Western populations, and the people living through it are about to double.

_[chart: WHO 2019 estimates for India, via PMC10792328 · the shaded band marks where routine tests can see change]_

| Measure | Figure | Source |
|---|---|---|
| People aged 60+ | 14.9 crore (10.5%) in 2022, about 22.7 crore (15%) by 2036, 34.7 crore (20.8%) by 2050 | UNFPA India Ageing Report 2023 |
| Elderly outnumber children aged 0 to 14 | Around 2046 | UNFPA India Ageing Report 2023 |
| Diabetes / prediabetes | 10.1 crore / 13.6 crore adults | ICMR-INDIAB, 2023 |
| High blood pressure | 31.5 crore adults | ICMR-INDIAB, 2023 |
| Health spend paid from families' own pockets | 39.4% | National Health Accounts 2021-22 |

The gap is preventable in large part. Blood sugar, blood pressure, lipids, kidney and liver function, anaemia and vitamin levels all show up in routine blood tests years before a hospital admission. India already runs those tests in the crores every year. What nobody does is read them over time, act on them, and check again.

## What we already have, and what is new

About two thirds of a longevity engine is already in the codebase. The memory layer stores readings as a time series per person, the clock-keyed thresholds know a value's meaning depends on age and life stage, open loops track "test overdue", and the lab tables can book a home collection and file the result back into the right person's record. What is missing is the reading of real reports, a plan that ends in a retest, and a view that makes progress visible.

_[chart: Cheeku codebase, October 2026 · built, extended and new parts of the healthspan engine]_

The one hard dependency is real report extraction. Today src/lib/ai/mock/extract.ts returns canned values; the longevity wedge does not exist until a photo of any Indian lab report becomes clean, unit-checked biomarkers. That is the first build, and it was already the biggest launch blocker in the audit.

## The wedge: bring any report

The front door is one promise: **test anywhere, bring the report to Cheeku, and we tell you where you stand, what changed and what to do next.** Premium screening centres such as Cent and Nura sell the test and the reading together, in a few metros, at a premium. We do the opposite: we take the report from whichever lab a family already uses, at whatever price they already pay, and we keep reading it for years. The partner lab comes in at the retest, where we choose the lab.

_[chart: The wedge workflow · 8 steps, 1 check, 1 loop]_

Every report reading answers the same three questions, in this order, in plain language and in the person's own numbers:

1. **Where do I stand?** Each marker against Indian-appropriate ranges, grouped by body system, with the two or three that matter most on top.
2. **What changed?** The same markers against this person's previous reports, so a 6.1 HbA1c reads as "up from 5.7 a year ago", not just "slightly high".
3. **What next?** A 90-day plan with one to three actions, the retest date, and a doctor review when a value crosses a red flag.

The reading is free, always. It is the habit we want every family to form, and the moment that earns the right to the plan, the retest and the subscription.

## Vertical journeys: five programs, one memory

Longevity is too broad to sell. Five programs are narrow enough to deliver and measure, and every one of them runs on markers that routine Indian lab panels already report. Retest intervals below are proposals for our clinical reviewer to confirm, not settled guidance.

| Program | Who it is for | Markers it tracks | Retest | What Cheeku does between tests |
|---|---|---|---|---|
| Metabolic reset | Prediabetes, early diabetes, fatty liver, big waist at normal weight | HbA1c, fasting glucose, fasting insulin, triglycerides, HDL, ALT, GGT, waist | Every 3 months | Food swaps from Indian meals, walking after meals, weekly weight and waist check |
| Heart age | 35+ with high BP, high lipids or a family history | Home BP, LDL, non-HDL, triglycerides, ApoB, Lp(a) once, hs-CRP | Every 6 months | BP log reading, medicine adherence, salt and activity nudges |
| Healthy parents | 60+, cared for remotely by adult children | BP, sugar, eGFR and urine ACR, haemoglobin, B12, vitamin D, TSH, medicine list | Vitals monthly, panel every 6 months | Medicine reminders, overdue test alerts to the child, fall and dizziness check-ins |
| Strength and bones | 50+, post-menopause, low activity | Vitamin D, calcium, albumin, haemoglobin, home sit-to-stand test, steps | Every 6 months | Protein targets in Indian portions, strength routine, sunlight and supplement tracking |
| Women 35+ | Fatigue, thyroid, anaemia, perimenopause | Haemoglobin, ferritin, TSH, vitamin D, B12, HbA1c, lipids | Every 6 months | Symptom diary, iron and thyroid follow-up, cycle and bone health |

The programs share one memory, so a family is never in only one. Rajesh, 63, can be in Healthy parents and Heart age at once, while his son Aarav, 29, starts Metabolic reset off the same family plan. The journey below is drawn for Rajesh, the demo persona already in the app.

_[chart: One connected journey · 4 lanes, 90 days, demo persona Rajesh Sharma]_

The paying moment is on the far right: the son sees his father's numbers improve and renews. Everything before it exists to make that change card arrive on time.

## Stickiness: two loops and a due date

Records apps fail because nothing brings you back until the next illness. Chat apps fail because every chat starts from zero. Cheeku runs two loops instead: a small weekly loop that keeps the plan alive, and a 90-day loop that ends in a retest where progress becomes visible.

_[chart: Two retention loops · weekly check-in and 90-day retest]_

What makes each loop hold:

- **A due date, not a feed.** Every plan ends in a dated retest, already priced and bookable in one tap with home collection.
- **Progress you can see.** The retest result arrives as a change card: "HbA1c 6.4 to 5.9 in 90 days". That moment is the reward, and the reason to renew.
- **Someone else is watching.** Adult children see their parents' check-ins and overdue tests. Care for a parent is the strongest repeat behaviour in Indian families.
- **The memory makes leaving costly.** After two retests the family's history, trends and plans live in Cheeku. Starting again elsewhere means starting from zero.
- **Small asks only.** The weekly loop asks for under a minute: one reading, one yes or no on the plan. Anything heavier gets skipped.

The calendar below is what a year looks like for one person in the Metabolic reset program, the program with the tightest loop.

_[chart: Proposed program calendar, to confirm with the clinical reviewer · 12 months]_

## Getting Indians to pay

Indian families do not pay for health apps; they pay for tests, for doctors, and for their parents. So the subscription is sold as a better way to buy what they already buy: a year of tests, read and acted on, for the people they care about most. The mentor is right that the marketplace itself will not be paid for by consumers. It does not have to be: the lab margin on each retest carries the transaction.

What Indians pay for, and how each shapes the offer:

- **Tests, not apps.** Every paid tier includes real panels with home collection, so the price is compared with a lab's health package, not with a free app.
- **Parents first.** The Parents Pass is the lead product. It is bought by the child and used by the parent.
- **A human in the loop.** A doctor review on every red flag is what makes the price feel safe.
- **Visible saving, paid once a year.** The pass costs less than buying the same panels separately, shown at checkout.

Price points below are hypotheses to test in the 90-day pilot, not decisions.

| Tier | Price to test | What it includes |
|---|---|---|
| Free | ₹0 | Reading of any report, family memory, one active plan, booking at partner prices |
| Healthspan Pass | ₹1,999 to ₹2,999 a year per person | Two full panels with home collection, every reading, all programs, retest scheduling, one doctor review |
| Parents Pass | ₹4,999 to ₹6,999 a year for two parents | Two full panels each, monthly vitals check-in, alerts to the child, doctor review on every red flag |
| Family Pass | ₹6,999 to ₹9,999 a year for up to four | Everything above for the whole family on one memory |

Because each pass bundles physical tests and home visits, it is likely a real-world service for App Store purposes, which may allow UPI instead of in-app purchase. That needs confirming with Apple and Google before we price around it.

_[chart: Money and service flows · 5 parties, proposed model]_

Three other payers sit behind the family. Labs pay for demand that arrives with a reason to test. Employers already buy annual checkups and increasingly cover parents. Insurers can fund retests and rewards through wellness benefits (IRDAI allows renewal discounts and wellness vouchers for health checkups), and later pay for risk insight, which is section 9.

## The science and the AI system

The principle that keeps this safe and defensible: **code computes, clinicians set the rules, the language model only explains.** Every number a person sees is calculated by a deterministic, tested function from their own values. The model turns those results into plain Hindi or English, grounded in the person's memory, and never invents a number or a diagnosis. That is how the existing safety router already works; longevity adds more computed layers underneath it.

_[chart: Proposed system architecture · 5 layers, 1 learning loop]_

| Layer | What it computes | Inputs | Status and caveat |
|---|---|---|---|
| Report reader | Clean, unit-checked markers from a photo or PDF of any Indian lab report | Image or PDF | To build. Start with the 30 most common lab formats, partner lab first |
| Marker dictionary | One canonical id per marker across lab spellings, with unit conversion | Lab names, units | To build. The moat starts here: every new lab format makes the next one cheaper |
| Indian ranges | Thresholds tuned for South Asian bodies: overweight at BMI 23, waist risk at 90 cm (men) and 80 cm (women) | Age, sex, life stage | Extends the existing clock-keyed thresholds |
| Kidney | eGFR (CKD-EPI 2021) and urine ACR staging | Creatinine, age, sex | Standard formula |
| Liver | FIB-4 fibrosis risk | Age, AST, ALT, platelets | Standard score |
| Heart | 10-year cardiovascular risk from WHO risk charts for South Asia | Age, sex, BP, smoking, cholesterol or BMI | Standard; known to understate risk in some South Asians, so shown with family history |
| Diabetes risk without a blood test | Indian Diabetes Risk Score (MDRF) | Age, waist, activity, family history | Lets people with no report start a program |
| Blood age | Phenotypic age (Levine, 2018) | Nine routine markers: albumin, creatinine, glucose, CRP, lymphocyte %, MCV, RDW, ALP, white cell count | Developed on US data. Shown only as a trend for the same person, and validated on our own cohort before any headline claim |
| Trajectory model | The likely next value of each marker given the plan and adherence | Our longitudinal data | Research track. This is the asset insurers will pay for |

Blood age is the most powerful hook and the most dangerous claim, so it ships last, after the clinical reviewer signs off on the wording. A person should see "your blood markers look about three years older than last year", never "you will live to 74".

## Insurance underwriting infrastructure: the 3-year path

Today an Indian health insurer prices a policy from a proposal form, and above a certain age or cover a one-time medical. After that it learns nothing until a claim arrives. The mentor's point is that nobody owns the layer in between, where risk could actually be reduced, and that 1% of the health insurance market through that layer is worth about ₹1,000 crore a year (his estimate). Cheeku earns the right to that layer in three steps, each unlocked by evidence from the step before.

_[chart: Insurance roadmap · 3 phases, 2 gates, proposed]_

| Year | What the insurer buys | What it gets | What the family gets |
|---|---|---|---|
| 1. Wellness partner | A wellness program for its policyholders | Engagement and retest data, aggregated and consented | Funded retests and renewal rewards under IRDAI wellness rules |
| 2. Risk signal | Cohort analytics linked to its own claims | Proof that engaged members claim less, and early flags it can act on | Bigger renewal discounts for improving markers |
| 3. Underwriting layer | A consented health passport at proposal time and a risk score that updates | Faster, cheaper underwriting and dynamic pricing | Cover that gets cheaper as they get healthier |

Two rules make this possible without breaking trust. Nothing identifiable reaches an insurer without the person's explicit, purpose-specific consent, recorded in the consent ledger that already exists. And a worse result never raises anyone's premium through Cheeku: we only ever unlock rewards. Year 3 needs IRDAI's approval, likely through its regulatory sandbox, so that conversation starts in year 1.

## The next 90 days

This rides on the launch plan rather than competing with it: real report extraction is week 3 of the launch checklist either way, so the longevity wedge costs about four extra weeks of product work, not a new roadmap.

### Weeks 1 to 4 · 12 Oct to 8 Nov · Read any report

- [ ] Report reader for the 30 most common Indian lab formats, partner lab first
- [ ] Marker dictionary: canonical ids, synonyms and unit conversion for about 120 markers
- [ ] "Bring any report" entry: share sheet, WhatsApp forward, photo, PDF
- [ ] Reading v2: where you stand, what changed, what next

### Weeks 5 to 8 · 9 Nov to 6 Dec · Make progress visible

- [ ] Healthspan dashboard by body system, with the change card on every retest
- [ ] Retest scheduler with one-tap partner booking and home collection
- [ ] Parents mode: overdue tests and missed check-ins alert the child
- [ ] Doctor review on every red flag

### Weeks 9 to 13 · 7 Dec to 9 Jan · Prove it

- [ ] Pilot Metabolic reset and Healthy parents with 200 families
- [ ] Test three price points for each pass
- [ ] Take the pilot data to one insurer and one employer

The funnel below is the pilot's target, per 1,000 installs. Each stage is a hypothesis we expect to move; the one that decides the thesis is the share of plans that end in a booked retest.

_[chart: Pilot targets per 1,000 installs · computed from the target rates below]_

| Metric | Definition |
|---|---|
| Activation | Installs that get a report read within 24 hours |
| Plan uptake | Readings that start a 90-day plan |
| Retest rate | Plans with a retest booked by the due date |
| Paid conversion | Families on a paid pass after their first retest |
| Improvement | Retests with at least one marker improved; target 50%, the number that makes the change card worth paying for |

## Risks and what we will not do

| Risk | Why it matters | How we handle it |
|---|---|---|
| Report reading is wrong | One misread value destroys trust and can cause harm | Unit and plausibility checks, low-confidence values go to the person to confirm, original image always one tap away |
| Longevity becomes a rich-metro niche | Premium screening already serves that buyer | Lead with parents and metabolic health in tier 1 and 2 cities, priced against a lab package |
| Medical claims cross into diagnosis or a regulated device | App Store review and Indian regulation | Rules signed by our clinician, the model only explains, a regulatory opinion before blood age ships |
| People start plans and stop | Retention is the whole thesis | Retest booked at the time the plan starts, the child as accountability partner, under one minute a week |
| Insurer data use breaks trust | A family that feels watched leaves | Explicit purpose-level consent, rewards only, never a premium increase through us |

What we will not do:

- Sell supplements or take margin on anything we recommend.
- Build our own screening centres or buy equipment. The partner network is the physical layer.
- Promise a lifespan, a biological age at a single point, or that Cheeku replaces a doctor.
- Share anything identifiable with an insurer or employer without the person's explicit consent.
- Chase every longevity trend. Five programs, measured, before a sixth.

## Sources

This environment blocks direct page fetches, so the figures below were confirmed through web search results rather than read on the source page. Verify the starred items on the primary source before external use.

Checked through search:

- [Healthy life expectancy in India, 2000 to 2019 (PMC10792328)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10792328/): WHO 2019 estimates, life expectancy 70.8, HALE 60.3 *
- [WHO HALE for India by year](https://statisticsoftheworld.com/country/india/WHO.HALE): HALE about 58 in 2021 *
- [UNFPA India Ageing Report 2023, coverage](https://vajiramandravi.com/current-affairs/india-ageing-report-2023/) and [Outlook](https://www.outlookindia.com/national/elderly-population-in-india-growing-rapidly-could-exceed-children-by-2050-says-unfpa-news-320985): 60+ population 2022, 2036, 2050, and the 2046 crossover *
- [IRDAI wellness benefits, explained by an insurer](https://reliancegeneral.co.in/Insurance/Knowledge-Center/Insurance-Reads/Wellness-benefit-Rules-Defined-By-IRDAI.aspx) and [IRDAI master circular on health insurance, 2024](https://arthgyaan.com/blog/understanding-latest-irda-master-circular-on-health-insurance-2024.html): renewal discounts and wellness vouchers *

Shared by you (not opened from here): [The Telegraph editorial on life expectancy](https://www.telegraphindia.com/opinion/slight-rise-editorial-on-indias-life-expectancy-and-the-challenge-of-healthier-living-prnt/cid/2184257) · [PMC6659526](https://pmc.ncbi.nlm.nih.gov/articles/PMC6659526/) · [WHO India data](https://data.who.int/countries/356) · [Kauvery Hospital, The age of longevity](https://www.kauveryhospital.com/news-events/the-age-of-longevity/) · [The Hindu on healthy life expectancy](https://www.thehindu.com/news/cities/Hyderabad/indias-healthy-life-expectancy-lags-a-decade-behind-total-lifespan/article69557576.ece) · [GOQii on the urban longevity divide](https://goqii.com/blog/urban-longevity-divide-india-healthspan/) · [Cent](https://www.cent.health/) · [Nura](https://nura.in/health-screening-packages/gurugram/)

Established clinical literature, cited from memory: Levine et al., phenotypic age, Aging 2018 · Inker et al., CKD-EPI 2021 equation, NEJM 2021 · Sterling et al., FIB-4, Hepatology 2006 · WHO CVD Risk Chart Working Group, Lancet Global Health 2019 · Mohan et al., Indian Diabetes Risk Score, JAPI 2005 · Anjana et al., ICMR-INDIAB, Lancet Diabetes & Endocrinology 2023 · Misra et al., Indian consensus on obesity cut-offs, JAPI 2009 · National Health Accounts 2021-22 (also used in the seed deck).

The mentor's estimates (1% of the market, about ₹1,000 crore) are from your call notes, not an external source.
