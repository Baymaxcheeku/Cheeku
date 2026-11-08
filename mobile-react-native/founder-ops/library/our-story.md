# Cheeku AI: our story (deep tech version)

Snapshot of the founders' summary agreed in chat, 30 Oct 2026. Numbers come from seed deck v2, DD deck v2, the longevity thesis v2 and financial model v2.

**Pitch:** Indians live 71 years and spend more than 10 of them in poor health. Cheeku is building what wins those years back: a lifelong, longitudinal health memory for every Indian family, and India's own health model that reasons over it. It turns every report, prescription and reading into one dated record per person, decides the next step on clinician-signed rules, and books the care in chat. Built for 140 crore people, starting with the family.

## What we build: three layers, one loop
1. **Longitudinal family health memory.** Every report, prescription, reading and chat becomes coded, dated values per family member, each fact tied to its source. Trends, medicines, open loops and a timeline per person; the family can correct any fact. About 4,260 tokens of family history go into every answer.
2. **Clinical reasoning, safe by design.** Clinician-signed rules decide ranges, risk, urgency and 10 prescription checks against published standards. A safety router catches red flags before any model runs. Four urgency tiers; "go now" bypasses the model. The model never states a number it did not get from memory, and never diagnoses or prescribes.
3. **CHEEKU-H, India's own health model.** Today: fine-tuned frontier models behind the router. Mid-2027: a tuned open model on our own GPUs. Jan 2028: an adapted open-weight model becomes default only if it wins 70% of a 5,000-case India eval set in 5 languages. 2029: our own 15 to 22B hybrid. Trained on consented family records, doctor-reviewed answers, Indian lab formats and brands, Indic voice and ABDM records. Cost per answer about ₹0.07 on small hosted models today, ₹0.06 on our own model.

**The loop:** daily nudges, weekly review, quarterly retest; care booked in chat across 12,000+ pincodes; every answer and booking writes back to memory.

**Stage:** V1 built with ₹0 raised, fine-tuned model and safety router; care partners live across 12,000+ pincodes and 300+ cities, 5,000+ consultants, diagnostics and medicines at home; fitness in 200+ cities. Store launch Jan to Feb 2027. Demo: youtu.be/mI4FmQt_8Qk

**Raise:** ₹26 cr seed (about $3M), 17 months, Series A around Feb 2028. Use: 35% people, 33% growth, 18% model (₹4.8 cr), 14% ops, clinical safety and drug data. By Series A: 5.9 lakh monthly users, 10,000+ paying, 25% day-30 retention target, weekly care bookings, voice in 5 languages, own GPUs live, an adapted model that beats frontier APIs on India evals, a first insurer pilot.

**Compute plan:** ₹33 cr compute and data over 5 years; 250k H100-hours, about ₹2.3 cr a run at IndiaAI subsidised rates; train from scratch only when it beats the adapted model.

**Plan (base case):** ₹862 cr revenue in 2031 from about 2 crore average users at ₹429 a year; 70% gross margin; EBITDA positive from May 2030; 74% organic by 2031.

**Why now:** the longevity gap (life expectancy 70.8, healthy 60.3; 10.1 cr diabetic, 13.6 cr prediabetic, 31.5 cr hypertensive; 60+ population to 34.7 cr by 2050); data rails (79.7 cr ABHA IDs, DPDP Rules 2025); the AI moment (23 cr people a week ask ChatGPT health questions; Ant Group's AQ at national scale in China); the cost curve (IndiaAI H100s about ₹92 an hour, chats under 20 paise); the care gap (2-minute consults, 39.4% out of pocket).

**Moat:** consented longitudinal family data; own weights gated by India evals; mapped Indian labs and brands; clinician-signed rules and safety architecture; zero supply capex; the insurer risk layer as the endgame.

**Founders:** Athar Ali, CEO (second-time founder; Meta, Instagram computer vision; Practo, launched Surgicare; built V1). Suraj Mondal, CTO (IISc aerospace engineer; deep learning blast wave precision system for DRDO; clinical-grade AI at SigTuple; GenAI at Cimpress). Deepesh Mahajan, CBO (twelve years in healthcare commercial technology; Pine Labs Healthcare and Wellness Pay Later, over ₹1,000 cr revenue across eight verticals; Practo enterprise book ₹10.8 cr to ₹24 cr, churn 13% to under 3%).

Open checks: free tier (decks 20 chats a day, app 5); decks still say ISRO for Suraj; Afu figure in older drafts unverified (AQ's own figures: 100M users Feb 2026, 150M Sep 2026).

## Dilution on the ₹26 cr seed (financial model v2)
| Case | Pre | Post | Seed gets | Founders after seed | Founders after Series B |
|---|---|---|---|---|---|
| Bear | ₹90 cr | ₹116 cr | 22.4% | 69.8% | 34.0% |
| Base | ₹104 cr | ₹130 cr | 20.0% | 72.0% | 44.5% |
| Bull | ₹127 cr | ₹153 cr | 17.0% | 74.7% | 52.6% |

Assumes a 10% option pool before seed and a 5% top-up at Series A. The DD deck's cap table slide (₹90 cr pre, founders 43.2% after B) matches no case; use base.

## Answering "why can't Practo or Apollo do this?"
Incentives, not capability. Practo earns from consults and doctor listings, so a check that questions prescriptions upsets its paying customers; Apollo routes everything to Apollo; pharmacies earn on medicines. Cheeku earns by keeping the family healthy between visits, books whichever partner fits, and holds a memory across every provider. Today's defensibility: a built V1 with ₹0, the safety architecture, mapped labs and brands, a memory that compounds from day one, and the team. Say "nobody else is paid to do this", never "nobody can".

## Voice in V2 (feasibility)
Android can wake on schedule, speak aloud and ring like a call. iOS cannot speak unprompted: use a voice-clip notification, AlarmKit alarms, or an opt-in CallKit "Cheeku calls me" (App Review risk). For elders, a WhatsApp or phone call from a telephony provider avoids OS limits (DLT registration and opt-in needed). Red-flag routing, consent, a 2 to 3 calls a day cap and quiet hours apply.
