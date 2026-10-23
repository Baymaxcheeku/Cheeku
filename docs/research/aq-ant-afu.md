# AQ / Ant Afu (蚂蚁阿福): what Ant Group built, and what it means for Cheeku

Research note, 23 October 2026. Sources are listed at the end. Most numbers
are Ant's own claims, repeated by the press; few are independently verified.
Where sources disagree, both figures are given.

## 1. In one paragraph

AQ is Ant Group's standalone AI health app, launched June 2025 and renamed
**Ant Afu (蚂蚁阿福)** on 15 December 2025 (Jack Ma picked the name so it
sounds like a friend). It started as "AI medical tools" (100+ AI services:
doctor recommendation, report reading, advice) and pivoted in December to
"AI health friend": health Q&A, an AI health companion with goals, check-ins
and device data, and integrated services (consults with real doctors,
hospital booking, medicine, insurance payment). It runs on Ant's own medical
model (**AntAngelMed**, a 103B mixture-of-experts model with about 6B active
parameters, open-sourced) and is wired into Alipay, Haodf (a doctor platform
Ant bought in January 2025) and thousands of hospitals. It grew on heavy
marketing and cash incentives, and more than half its users are outside big
cities. That is close to Cheeku's thesis (memory, companion, care booking,
own model), at Chinese scale.

## 2. Timeline and scale

| When | What | Users |
|---|---|---|
| Jan 2025 | Ant acquires Haodf (online doctor platform) | |
| Jun 2025 | AQ launches: "100+ AI services", 5,000+ hospitals, ~1M doctors connected | |
| Sep 2025 | 300+ "AI Doctor Agents" co-built with leading physicians | 140M users (cumulative), 60% from tier-3 and smaller cities |
| 15 Dec 2025 | Rebrand to Ant Afu; three pillars (Q&A, companion, services); device sync; family profiles | 15M MAU, 5M+ questions a day |
| Jan 2026 | Hundreds of millions of yuan in ads; #1 free iOS app in China in Feb (cash incentives) | 30M MAU, 10.25M WAU, 10M+ questions a day |
| Feb 2026 | | 100M users |
| Jun to Jul 2026 | Weight-loss drive ("lose 100M jin together"); **AI Food Scan** (photo, text or voice meal logging) | 1M+ in weight programme |
| 12 Aug 2026 | **AQ for Doctor** (Haodf rebuilt as a doctor AI workstation); opened to hospitals as internet-hospital tenants | 300,000 verified doctors |
| Sep 2026 | Five daily-health areas: weight, exercise, nutrition, sleep, mental wellbeing | **150M users, ~20M health questions a day** |

Doctor counts vary by source and date: ~1M "connected" at launch, 200,000 to
300,000 for consultations later. "Users" (150M) is cumulative; the last
published MAU is 30M (January 2026).

## 3. Product structure

Since December 2025 the app has three pillars:

1. **Health Q&A (看病症, 看报告).** Chat-first. Photo questions (skin, report,
   medicine box, PDF). Multi-report comparison. An **"AI consultation room"
   (AI诊室)** that behaves like a doctor: asks follow-up questions, shows
   diagrams to help describe symptoms, moves through clear stages (who is it
   for, describe symptoms, suggestions) and ends with nearby hospital and
   doctor recommendations. Every answer reminds the user it is not a
   diagnosis.
2. **AI health companion (健康陪伴).**
   - **Health diary (健康小日记):** daily record, auto-synced from Apple, Huawei,
     vivo, Yuwell and Omron devices (activity, heart rate, sleep), plus photos.
   - **Health small goals (健康小目标):** pick a goal card ("sleep better",
     "lose weight", "stand taller"), answer a few questions, get a tailored
     check-in plan (打卡任务) with daily reminders, "like a personal trainer".
     Partner campaigns (e.g. 14-day check-in with a scale maker, prize: a
     co-branded body-fat scale).
   - **Health reminders (健康小提醒).**
   - **AI Food Scan (AI拍饮食):** photo, text or voice; estimates calories and
     nutrients, suggests pairings and exercise to burn it off; every field is
     editable; a daily "diet card" shows intake against the target.
   - **Family profiles:** health files for family members, long-term trends,
     "like a family doctor".
   - 10+ tracked indicators (weight, sleep, steps and so on).
3. **Integrated services (看医生).** Online consultations with real doctors,
   in-person appointment booking (city, hospital, department, doctor, time),
   medicine purchase, paying hospital bills with the national medical insurance
   e-certificate inside the app, reimbursement through state or commercial
   insurance, regional programmes (e.g. Chongqing health commission's digital
   human "Yu Xiaojian"; Guangzhou partnership).

**Home screen pattern** (from teardowns): chat box as the main entry, thin
navigation, a row of agents above the menu that each open a specific medical
flow, staged flows with clear status. The screenshot the owner shared shows a
3D mascot ("Hello"), swipeable goal cards with emoji, a progress bar, "My
goals" and "Check-in tasks" chips, and a composer with voice and camera.

### What "100+ AI services" means

It is marketing language from the June 2025 launch for the set of AI tools
and agents in the app: doctor recommendation, report analysis, personalised
advice, triage, medicine guidance, and later the **AI Doctor Agents**: AI
twins of named physicians (300+ by September 2025, "500+ physicians",
answering 27M+ questions), part of a "百大AI名医" (top 100 AI famous doctors)
plan that kept growing past 100. Coverage reached 16 departments (maternity,
gynaecology, ENT and others). There is no public list of exactly 100 services.

### AQ for Doctor (doctor side)

- **AI medical assistant:** text or voice search over 60M+ papers, guidelines
  and journals, 140,000+ drug labels; partnership with Wolters Kluwer;
  a PC "DeepSearch" for evidence-based clinical decision support.
- **AI twin assistant (AI分身):** a doctor uploads their information and gets a
  24/7 twin that does pre-visit interviews (collects history, organises the
  record, highlights findings), health questions and post-visit follow-up
  (auto-written follow-up summaries filed into the patient's record).
- **Internet hospital tenancy:** hospitals join as institutions, one account
  for online consults, follow-up and records. Guangzhou Women and Children's
  Medical Center signed first.
- Patient side and doctor side are connected: the doctor's twin lives inside
  Afu, and follow-ups land in the patient's file.

## 4. The AI stack

- **AntAngelMed** (Ant Healthcare with Zhejiang Health Information Center and
  Zhejiang Anzhen'er Medical AI):
  - 103B parameters total, about **6.1B active per token**: mixture of
    experts at a 1/32 activation ratio, inherited from Ant's **Ling-flash-2.0**.
  - **128K context** (YaRN). Over 200 tokens a second on an H20 GPU. Official
    FP8 build; community GGUF builds.
  - Training: (1) continual pre-training on large medical corpora from the
    Ling-flash-2.0 checkpoint, (2) SFT on mixed general reasoning and medical
    cases, (3) RL with GRPO and dedicated reward models.
  - Claims: #1 among open-source models on OpenAI's **HealthBench** (one
    report: 62.5) and ahead of several closed models; #1 on Chinese
    **MedAIBench** / MedBench. Self-reported.
  - Open: code under MIT; weights reported as Apache 2.0 (check the model
    card before using).
- **Ling / Bailing**: Ant's general LLM family (Ling, Ring), the base.
- Ant says it does **not train base models on hospital data** (in contracts).
- **Trace-free photo mode (无痕拍):** photos are blurred throughout processing.

## 5. Growth, money and trust

- **Distribution:** Alipay's reach, hospital and insurance links, and very
  heavy spend (hundreds of millions of yuan of ads in about a month; cash
  incentives that put it at #1 on iOS). Over half the users are in smaller
  cities, where seeing a specialist can take a day of travel.
- **Revenue:** not public. Services are mostly free. Analysts call
  monetisation the open question; likely levers are consultations, medicine,
  insurance and hospital SaaS (the doctor workstation).
- **Trust:** "not a diagnosis, not a replacement for doctors" on every answer;
  real doctors one tap away; no hospital data in training; blurred photos.
  Critics point at concentration (one company owning the channel, the
  doctors, payments and insurance) and state access to data.
- **Regulation (China):** the 2022 Internet Diagnosis and Treatment Rules
  forbid AI from generating prescriptions (art. 21) and from replacing the
  doctor in a consultation (art. 13). Afu's design (AI informs and routes;
  licensed doctors consult and prescribe) follows that line. India's
  Telemedicine Practice Guidelines draw a similar line.
- **Competitors in China:** JD Health (Jingyi agents: AI doctor, nutritionist,
  pharmacist, counsellor), ByteDance Xiaohe AI Doctor, Baidu Ernie Health
  Manager, Alibaba Quark, iFlytek iFlyHealth, Medlinker Future Doctor, Tencent
  (hospital solutions), DeepSeek inside hospitals. OpenAI launched ChatGPT
  Health in January 2026; press called it "America's Afu".

## 6. What this means for Cheeku

### Where we already match the shape

| Afu | Cheeku today |
|---|---|
| Health Q&A with report photos | Ask Cheeku, report reader (stand-in until Suraj's OCR) |
| AI consultation room with follow-up questions | Urgency tiers, hard stops, doctor script (stand-in model) |
| Health goals + check-ins + reminders | Today's action plan, five pillars, streaks |
| Health diary with photos | Daily logs: step screenshots, meal photos, readings |
| Family profiles | Family plan, member switching, caregiver alerts (planned) |
| Doctor consults, booking, medicine | Services, labs, doctors (LabStack partnership in progress) |
| Not-a-diagnosis line, real doctors one tap away | Same principle, safety floor |
| Own medical model | Suraj's 15 to 22B India health model (planned) |

### Where we can be better

1. **Longitudinal memory is our edge.** Afu's memory is described only as
   "remembers your health updates". Cheeku already has a structured memory
   layer (series, medicine ledger, open loops, clock). Lead with it.
2. **Family-first and caregiver-first.** Afu added family profiles; Cheeku is
   built around the family file and alerts for parents.
3. **India specifics.** Food, labs, brands, languages, ABHA, Telemedicine
   Practice Guidelines. Afu's model is trained for China.

### Ideas worth taking (ranked)

1. **Goal cards as the companion entry.** Swipeable goal cards ("Sleep
   better", "Lose 5 kg", "Fix my sugar"), a few questions, then a tailored
   check-in plan. Our action plan engine already does the plan; add the
   goal-picking ritual and the cards. *Small, high engagement.*
2. **AI Food Scan with editable fields.** We log meal photos and taps today.
   Add photo-to-dish recognition with calories and protein, every field
   editable, and a daily diet card. Needs Suraj's vision model (task
   `ai-meal-vision`). *Medium.*
3. **Device sync.** Apple Health and Health Connect first (task
   `int-wearables`), then Indian brands. Afu treats it as table stakes.
   *Medium, native build.*
4. **A staged "AI consultation room".** Turn symptom chats into a visible
   flow: who is it for, describe, follow-up questions with simple diagrams,
   then next step (lab, doctor, wait). We have the tiers; add the staged UI.
   *Medium.*
5. **Doctor twins and the doctor-side app.** Afu's AI Doctor Agents and the
   doctor workstation (pre-visit interview, follow-up summaries filed into
   the patient record) are the flywheel: doctors bring patients, patients
   bring doctors. For us: pre-consult summary already exists; next is a
   doctor view that receives it and writes back follow-ups. *Large, later.*
6. **Medicine box photo.** Snap the strip, get dose and usage, add to the
   ledger. Fits our prescription reader. *Small once OCR lands.*
7. **Trace-free photo mode.** Blur faces and names in photos sent to the
   model. Cheap trust win. *Small.*
8. **Elder mode.** Bigger text, voice-first, regional languages (Afu reportedly
   added dialect recognition; unconfirmed). *Medium.*
9. **Partner check-in campaigns.** 14-day challenges with a device or brand
   partner and a prize. Growth lever with no model cost. *Small.*
10. **Monthly "health questions answered" and "families covered" counters** as
    public proof points, the way Afu publishes daily question counts.

### For the AI plan (Suraj)

- AntAngelMed shows a viable recipe: **MoE with a small active parameter
  count** (6B active out of 103B) gives big-model quality at small-model
  serving cost. Our "15 to 22B" plan could be a dense model, or an MoE with a
  similar active budget; worth benchmarking both.
- **Open weights exist.** Evaluate AntAngelMed (license permitting) as a
  starting point or teacher model, on Indian data: Indian lab report formats,
  brand-to-salt, Hinglish questions, Indian guidelines. Check language
  coverage and the licence before any use.
- **Use HealthBench** (and a Cheeku India eval set) as the release gate,
  as Ant does publicly.
- **Training recipe to mirror:** continual pre-training on medical text,
  SFT mixing general reasoning with cases, RL (GRPO) with reward models for
  safety and helpfulness.

### Cautions

- Afu's growth was bought with very large marketing spend and Alipay's
  distribution. Cheeku's path is retention through memory and family, not
  paid installs.
- Most figures are company claims. Treat them as direction, not benchmarks.

## Sources

- Ant Group press release, Dec 2025 upgrade: https://www.antgroup.com/en/news-media/press-releases/1765779300000
- Ant Group (Chinese) release, 30M MAU: https://www.antgroup.com/news-media/press-releases/1765785600000
- Business Wire, AQ launch, Jun 2025: https://www.businesswire.com/news/home/20250626728870/en
- Business Wire, 140M users, Sep 2025: https://www.businesswire.com/news/home/20250912715926/en/Ant-Groups-AI-Healthcare-App-AQ-Users-Reach-140-Million-60-from-Tier-three-and-Lower-Tier-Cities
- Business Wire, 150M users, Sep 2026: https://www.businesswire.com/news/home/20260910921103/en/Ant-Groups-AI-Health-App-AQ-Reaches-150-Million-Users-as-It-Expands-AI-powered-Day-to-day-Health-Use-Cases
- Rest of World: https://restofworld.org/2026/ai-health-care-is-taking-off-in-china-led-by-jack-mas-ant-group/
- Baidu Baike, Ant Afu: https://baike.baidu.com/en/item/Ant%20Afu/1448973
- Xinhua on the rebrand: https://www.news.cn/tech/20251215/14b427d3eca34bbe9f10709f4da3542c/c.html
- People's Daily: http://paper.people.com.cn/rmrb/pc/content/202512/16/content_30124850.html
- Woshipm teardown: https://www.woshipm.com/evaluating/6317477.html
- UISDC teardown: https://www.uisdc.com/ai-health-reimagined
- Sohu review: https://www.sohu.com/a/965752380_110683
- AI Food Scan, Xinhua: http://www.news.cn/tech/20260729/baa394c2b7e547baa2babe8e0433e3dd/c.html
- AQ for Doctor, TNGlobal: https://technode.global/2026/08/12/chinas-ant-group-upgrades-physician-platform-into-ai-workstation-aq-for-doctor-with-300000-verified-doctors/
- AQ for Doctor, Science and Technology Daily: https://www.stdaily.com/web/gdxw/2026-08/12/content_562867.html
- AI doctor twins, Yicai: https://www.yicai.com/news/102960165.html
- AntAngelMed on GitHub: https://github.com/MedAIBase/AntAngelMed
- AntAngelMed on Hugging Face: https://huggingface.co/MedAIBase/AntAngelMed
- MarkTechPost on AntAngelMed: https://www.marktechpost.com/2026/05/12/meet-antangelmed-a-103b-parameter-open-source-medical-language-model-built-on-a-1-32-activation-ratio-moe-architecture/
- Caixin on the spend: https://www.caixinglobal.com/2026-02-05/in-depth-chinas-tech-giants-burn-cash-to-try-to-dominate-ai-health-care-102411854.html
- Pandaily on competitors: https://pandaily.com/ai-healthcare-internet-giants-20260622
- Hello China Tech, ChatGPT Health vs Afu: https://hellochinatech.com/p/when-chatgpt-health-became-americas-afu
- China internet diagnosis rules (NHC, 2022): https://www.nhc.gov.cn/yzygj/c100068/202203/2072f0e8988249e59d942e1b2a933916.shtml
