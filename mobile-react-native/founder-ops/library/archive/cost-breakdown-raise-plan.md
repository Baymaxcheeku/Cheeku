# Cheeku Cost Breakdown and Raise Plan

2026-10-07 · Athar Ali

## At a glance

**Raise ₹22 crore (about $2.5M) now.** That covers 18 months of V1 from October 2026 to March 2028, with three months of buffer, and gets Cheeku to 1.2M monthly users and a 41-person team.

One chat costs **₹0.30** on a rented fine-tuned model at launch. It drops to **₹0.10** once we run our own GPUs, which pays off at about 9 lakh chats a month (around 66,000 monthly users). With our own 15–22B model and year-5 volume it reaches about ₹0.06. Paid plans keep 56% to 80% of their net revenue after serving costs. A free user costs ₹4–5 a month.

| Round | When | Amount | Gate it needs | Pays for |
|---|---|---|---|---|
| Seed | Oct to Dec 2026 | ₹22 cr (~$2.5M) | Working V1, fine-tuned model | V1 in stores, voice and 5 languages, a 23-person team by September 2027 |
| Series A | Jan to Mar 2028 | ₹60 cr (~$6.8M) | 1M monthly users, 25% day-30 retention, 2% paying | Own GPUs, the move to 120 people, continued pre-training, insurer pilot |
| Series B | Oct to Dec 2029 | ₹130 cr (~$15M) | 8M monthly users, 1 insurer LOI, model wins 70% of India evals | Own 15–22B model, pendant launch, B2G. Optional in the base case, needed if revenue lands 40% under plan |

In the base case, the business turns profitable at the operating level in year 4 (October 2029 to September 2030). Total losses up to that point reach about ₹50 crore by the end of year 3. The seed and Series A together (₹82 crore) cover that, and cash never drops below ₹9.5 crore. All rupee figures are planning estimates. US dollars are at ₹88; prices for outside services come from search results dated in the Sources section.

## One chat, costed

A chat is one question plus one answer, the same unit the free plan counts (5 a day). Each one sends about 4,260 tokens to the model and gets 350 back. Most of that is Cheeku's memory of the family, which is the product, so it is not where to cut.

| What the model reads per chat | Tokens |
|---|---|
| System prompt and safety rules (mostly cached) | 1,200 |
| Family memory: reports, trends, medicines | 2,000 |
| Recent thread | 1,000 |
| The question | 60 |
| **The answer it writes** | **350** |

_[chart: Cheeku cost model · cost per chat and per voice minute · GPU and speech prices from search results, Oct 2026]_

By the minute, a text conversation runs about 2 chats: ₹0.60 on the rented model, ₹0.21 on our own GPUs. Voice costs ₹1.52 a minute at launch, five times more than text, and falls to about ₹0.50 once speech runs on our own servers in year 2. That gap is why free voice minutes get a cap from day one.

## Per user, per month

Every paid plan makes money from its first month, even on the rented model. The free plan is the cost to manage: at 2% paying, 49 free users ride on every subscriber.

| Plan | Price | Chats a month | Reports uploaded | Voice minutes (from Sep 2027) |
|---|---|---|---|---|
| Free | ₹0, 5 chats a day | 12 | 1 | 2 |
| Daily Pass | ₹29 for 24 hours | 25 | 1 | 0 |
| Solo | ₹99 a month | 90 | 3 | 10 |
| Family (4 people) | ₹249 a month | 220 | 8 | 25 |

_[chart: Cheeku cost model · per account per month by plan · prices from src/lib/billing/plans.ts]_

Cost per account also includes reading reports (₹0.50 each), storage and push (about ₹1 a person). Two guardrails keep this true: a fair-use ceiling of 50 chats a day per person on paid plans, and a free voice cap of 5 minutes a day. A Family plan that chats 1,000 times a month would cost ₹300 on the rented model, more than it pays.

## Which model, when

Rent the fine-tuned model at launch, move it onto our own GPUs by mid-2027, and switch to our own 15–22B model in year 4. Two always-on H100s cost ₹2.25 lakh a month at ₹156 an hour and serve about 46 lakh chats.

_[chart: Cheeku cost model · monthly serving cost by option and volume · API and GPU prices from search results, Oct 2026]_

On price alone, a fast frontier API is a few paise cheaper than our rented fine-tune. We still launch on our own fine-tune for three reasons:

- It follows Cheeku's urgency tiers and hard stops every time, with no prompt tricks.
- Health data stays on Indian servers we control, which keeps DPDP compliance simple.
- Every month on it builds the dataset and evals the year-4 model needs.

A premium frontier API at ₹1.64 a chat would cost more than a Solo subscriber pays. It stays out of the main loop. It is used only to grade answers in testing.

## Building the LLM

Owning a 15–22B health model costs about **₹33 crore in compute and data over five years**, plus the AI team's salaries. The bulk lands in years 3 and 4, after the Series A and after the adapted model has proven itself in the app.

| Year | Compute and data (₹ cr) | What it buys |
|---|---|---|
| 1 (Oct 2026 to Sep 2027) | 1.1 | About 10 fine-tuning runs on a ~30B open model. 50,000 doctor-checked answers at ₹150 each. A 5,000-case India health eval set in 5 languages |
| 2 | 1.5 | Continued pre-training on ~150B tokens of Indian medical text. Speech models tuned for Indian accents |
| 3 | 12 | Data for our own model: 3T tokens licensed and cleaned. First full training runs from January 2029 |
| 4 | 10 | Final runs, doctor-led alignment and safety testing, moving the app onto the new model |
| 5 | 8 | Version 2, plus variants licensed to hospitals and insurers |

The year-3 compute follows the standard estimate for training cost, 6 × parameters × tokens:

That assumes about 400 teraFLOPs of useful work per H100. One clean run costs ₹3.9 crore at ₹156 an hour, or ₹2.3 crore at the subsidised IndiaAI rate of ₹92. The budget allows for 2.5 runs, because some will fail. Apply for IndiaAI compute in year 2: it is open to Indian startups building models for Indian use, and it saves about ₹4 crore.

## Team

The first two hires take the app off your desk. You built V1 alone, and from January 2027 your job is raising, selling and hiring. Your co-founder keeps the model and builds the AI team around it.

The head office is in Gurgaon and runs hybrid: about 60% of the team at a desk on any day, at ₹12,000 a seat a month. Doctor reviewers, content writers and the care team work remotely from anywhere in India.

_[chart: Cheeku cost model · headcount by team and monthly payroll by quarter · salary bands are planning estimates]_

After year 2 the team grows to about 120 people by September 2029, 220 by September 2030 and 320 by September 2031. Most of that growth is care, clinical and sales staff, so the average cost a head stays at about ₹33–39 lakh a year.

| Role | People | Joins | CTC, ₹ lakh a year | Where |
|---|---|---|---|---|
| Founders: you and the AI co-founder | 2 | Now, paid from Jan 2027 | 24 each | Gurgaon |
| Senior backend engineer | 1 | Nov 2026 | 36 | Gurgaon |
| React Native engineer | 3 | Nov 2026, Mar 2027, Jan 2028 | 26 | Gurgaon |
| ML engineer, fine-tuning and evals | 2 | Dec 2026, Oct 2027 | 40 | Gurgaon |
| Data engineer | 2 | Dec 2026, Oct 2027 for the consent ledger | 32 | Gurgaon |
| Clinical lead (MD) | 1 | Dec 2026 half time, full time Oct 2027 | 36 | Hybrid |
| Product designer | 2 | Jan 2027, Apr 2028 | 22–24 | Gurgaon |
| QA engineer | 2 | Jan 2027, Apr 2028 | 15 | Gurgaon |
| Doctor reviewers, contract | 5 | 2 in Jan 2027, 3 in Nov 2027 | 10 | Remote |
| Care team | 8 | 2 in Feb 2027, 2 in Oct 2027, 4 in Jun 2028 | 5 | Remote |
| Speech ML engineer | 1 | Mar 2027 | 40 | Gurgaon |
| Growth lead | 1 | Apr 2027 | 36 | Gurgaon |
| Vernacular content | 4 | 2 in Apr 2027, 2 in Nov 2027 | 10 | Remote |
| Partnerships manager | 2 | Apr 2027 for labs and services, Apr 2028 for insurers | 36 | Gurgaon |
| Wearables engineer | 1 | Apr 2027 | 30 | Gurgaon |
| Product manager | 1 | Jun 2027 | 30 | Gurgaon |
| Finance and people ops | 1 | Jun 2027 | 15 | Gurgaon |
| MLOps engineer | 1 | Aug 2027 | 40 | Gurgaon |
| Senior LLM research scientist | 1 | Oct 2027 | 75 | Gurgaon or Bengaluru |
| Hardware lead, pendant | 1 | Oct 2027 | 45 | Gurgaon |
| Security and DPDP lead | 1 | Oct 2027 | 35 | Gurgaon |
| Backend engineer | 2 | Oct 2027, Jan 2028 | 32 | Gurgaon |
| Performance marketer | 1 | Nov 2027 | 24 | Gurgaon |
| Insurance data scientist | 1 | Jan 2028 | 45 | Gurgaon |
| Firmware engineer, pendant | 1 | Feb 2028 | 35 | Gurgaon |
| LLM research engineer | 1 | Apr 2028 | 50 | Remote |
| Risk data scientist | 1 | Jun 2028 | 40 | Gurgaon |
| Brand and community lead | 1 | Jun 2028 | 28 | Gurgaon |

Salary bands are set against Gurgaon startup pay from search results: senior ML engineers at ₹30–55 lakh, AI leads at ₹45–80 lakh, mid-career designers at ₹10–40 lakh. Senior hires also get ESOPs, which cost no cash and are not in these numbers.

## V1: the first 18 months and the seed

V1 spends ₹27.3 crore over 18 months and earns ₹10.1 crore back, so the seed has to cover ₹17.2 crore of net burn plus a buffer. People and marketing are 61% of the spend. The model itself, text and voice together, is 12%.

_[chart: Cheeku cost model · 18-month V1 plan, Oct 2026 to Mar 2028 · revenue from the base case in the revenue playbook]_

Monthly burn starts at ₹30 lakh, reaches ₹1.3 crore at the voice launch in September 2027 and ₹1.6 crore by March 2028. Without a Series A, the money runs out in June 2028, so the A has to close by March 2028. That leaves six months after the September 2027 gate to show the retention numbers.

| Month | Monthly users | People | Revenue in the month | Spend in the month |
|---|---|---|---|---|
| Jan 2027 (launch) | 0 | 11 | ₹0 | ₹57 lakh |
| Jun 2027 | 1.7 lakh | 22 | ₹27 lakh | ₹1.0 cr |
| Sep 2027 (voice, gate 1) | 6 lakh | 23 | ₹97 lakh | ₹2.3 cr |
| Mar 2028 (Series A) | 12 lakh | 41 | ₹1.6 cr | ₹3.2 cr |

## Five years: P&L, cash and the raise

Cheeku spends about ₹1,020 crore over five years and earns ₹1,400 crore. It loses money for three years and turns an operating profit in year 4. The seed and the Series A (₹82 crore together) carry it there. The Series B is the margin of safety and the money to go faster.

| ₹ crore | Year 1 | Year 2 | Year 3 | Year 4 | Year 5 |
|---|---|---|---|---|---|
| Monthly users at year end | 6 lakh | 25 lakh | 80 lakh | 1.8 cr | 3.2 cr |
| **Revenue** | **2.7** | **22.6** | **112.4** | **374.4** | **890.8** |
| Gross margin | 40% | 45% | 63% | 71% | 74% |
| Team | 4.1 | 13.1 | 28.2 | 61.2 | 105.3 |
| Marketing | 3.0 | 12.0 | 45.0 | 100.0 | 160.0 |
| Model, voice and cloud | 1.1 | 8.8 | 22.7 | 45.5 | 74.7 |
| Fees on revenue | 0.5 | 3.7 | 18.5 | 64.8 | 161.0 |
| LLM training and data | 1.1 | 1.5 | 12.0 | 10.0 | 8.0 |
| Pendant | 0 | 2.0 | 3.0 | 10.0 | 8.0 |
| Office, legal, admin | 0.7 | 1.9 | 4.8 | 9.8 | 15.1 |
| **Operating profit** | **−7.8** | **−20.4** | **−21.9** | **+73.2** | **+358.7** |
| People at year end | 23 | 51 | 120 | 220 | 320 |

_[chart: Cheeku cost model · quarterly cash balance with raises · base case, Oct 2026 to Sep 2031]_

Year 5's 40% operating margin comes from the institutional engines: insurers, governments and LLM licensing bring in ₹260 crore of revenue at high margin. If those deals arrive a year late, year-5 operating profit falls from ₹359 crore to about ₹220 crore.

_[chart: Cheeku cost model · five-year spend by vision goal · team cost split by each team's share of payroll]_

Each goal has its own line in the budget:

- **Replacing Google for health questions** takes 45% of five-year spend, ₹459 crore. Most of it is marketing, plus serving the chats and voice minutes it brings in.
- **The family memory layer** gets ₹123 crore: app, clinical and care teams, partnerships, storage.
- **The 15–22B model** gets ₹106 crore, AI team included. That is 21% of year 1 spend, the highest share it gets, because the model is the moat that has to start first.

## Stress tests

The plan survives revenue landing 20% under, using only the seed and the Series A. At 40% under, it needs the Series B and a cut to marketing.

| What goes wrong | What it costs | What we do |
|---|---|---|
| Revenue 20% under plan every year | Cash low point goes from ₹50 cr to ₹67 cr | Seed plus A (₹82 cr) still covers it |
| Revenue 40% under plan every year | Cash low point ₹116 cr; year 4 still loses ₹33 cr | The Series B becomes required. Marketing is the first cut |
| Free users chat three times as much | About ₹3.5 cr more in year 2 | Put free chats on a smaller model, or cut the cap to 3 a day |
| Voice use triples to 9 minutes a user a month | About ₹9 cr more in year 2 | Run speech on our own servers sooner; cap free voice |
| GPU prices rise 50% | About ₹1 cr a year in serving, ₹3 cr on the year-3 model | Use IndiaAI compute; sign a reserved contract early |
| App stores take 30%, not 15% | ₹1.3 cr in year 2, ₹28 cr by year 5 | Web and UPI checkout wherever the stores allow it |
| Series A slips by six months | Cash runs out in June 2028 | Raise a ₹10 cr bridge, or pause the pendant and paid marketing to cut burn to ₹80 lakh a month |

**Assumptions:**

- **Users:**   - Each monthly user sends 14 chats a month.
  - Voice starts in September 2027, at 3 minutes per user per month.
  - 2% of monthly users pay.
- **Revenue and fees:**   - Prices include 18% GST.
  - App stores take 15% of subscriptions.
  - Marketplace partners and payments take 20% of our marketplace take.
- **People and office:**   - Salaries carry 20% on top for benefits, laptops and hiring.
  - 60% of the team uses a desk on any day.
- **Revenue figures** are the base case from the revenue playbook.
- **Currency:** US dollars at ₹88.

## Sources

The pages below came up in web searches in October 2026, but the network here blocked opening them. Treat these prices as approximate and check them before the investor meeting.

- Subsidised H100 compute through IndiaAI, ₹67–92 an hour: [CareerIndia](https://www.careerindia.com/news/indiaai-compute-gpu-slots-2026-apply-subsidised-access-pricing-guide-011-64797.html)
- E2E Networks H100 rates, ₹362 an hour on demand and ₹155.90 on commitment: [E2E Networks](https://www.e2enetworks.com/cloud-terms/gpu/h100-pricing-india)
- Llama 3.3 70B at $0.88 per million tokens, and fine-tuning prices: [Together AI pricing](https://www.aipricing.guru/together-pricing/)
- Gemini 2.5 Flash at $0.30 in and $2.50 out per million tokens: [Morph](https://www.morphllm.com/gemini-api-pricing)
- Sarvam speech to text at ₹30 an hour, and text to speech at ₹15 per 10,000 characters: [Sarvam docs](https://docs.sarvam.ai/api/getting-started/pricing)
- Gurgaon ML engineer pay: [Jobrise](https://jobrise.io/hi/blog/ai-engineer-salary-gurgaon-2026/) and [Futurense](https://futurense.com/blog/machine-learning-engineer-salary-in-india)
- Gurgaon product designer pay: [PayScale](https://www.payscale.com/research/IN/Job=Product_Designer/Salary/eb9b0278/Mid-Career-Gurgaon)
- Gurgaon dedicated desk prices: [myHQ](https://myhq.in/gurugram/dedicated/coworking-space-in-gurugram)
- How Indian firms train LLMs, including Sarvam and BharatGen: [Vision IAS](https://visionias.in/current-affairs/upsc-daily-news-summary/article/2026-02-26/the-hindu/science-and-technology/how-are-indian-firms-training-llms-explained)

Plan prices and the free limit come from src/lib/billing/plans.ts in the app.
