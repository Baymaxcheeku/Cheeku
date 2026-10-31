"""Seed content for the Cheeku vision board. Writes seed/<collection>/<id>.json and batches.json."""
import json, os, time
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'seed')  # scratch output; the live board and board.json are the record
NOW = int(time.time() * 1000)

TAGS = [
    ('t-moat', 'Moat', '#5B4EF0'), ('t-bet', 'Big bet', '#D3478C'), ('t-risk', 'Risk', '#C94A1C'), ('t-dependency', 'Dependency', '#9A6A2A'),
    ('t-decision', 'Needs a call', '#DB8418'), ('t-investor', 'Investor proof', '#2F6FDE'), ('t-regulatory', 'Regulatory', '#7A7D95'),
    ('t-quickwin', 'Quick win', '#3C9A4B'), ('t-experiment', 'Experiment', '#0B9C9C'), ('t-launch', 'Launch blocker', '#7C3AED'),
]
MOATS = [
    ('m-memory', 'Family health memory', 'memory', 'Years of each family\'s reports, medicines and choices in one place. Leaving means starting from zero.'),
    ('m-model', 'Our own India health model', 'model', 'Trained on consented family histories and ABDM records. Cheaper per answer and better on India evals than frontier APIs.'),
    ('m-supply', 'Care network in chat', 'supply', 'Labs, doctors, medicines and fitness in 12,000+ pincodes and 200 cities, booked from the same memory.'),
    ('m-distribution', 'Employer and insurer distribution', 'distribution', 'Companies, benefits platforms and insurers bring families in at near-zero CAC on multi-year contracts.'),
    ('m-habit', 'Daily habit', 'habit', 'One useful nudge every morning and 20 free chats a day. The reason families open Cheeku before Google.'),
    ('m-trust', 'Consent, safety and regulation', 'none', 'DPDP-grade consent ledger, clinician-signed rules, IRDAI sandbox and a CDSCO path. Slow and costly to copy.'),
]

items = []
def it(id, title, lane, owner, kind='initiative', pri='P1', status='planned', period=None, gate=None, tags=(), moat=None, why='', how='', kpi='', conf=60, deps=(), end=None, options=None):
    d = dict(title=title, lane=lane, owner=owner, kind=kind, priority=pri, status=status, tags=list(tags), moat=moat, why=why, how=how, kpi=kpi,
             confidence=conf, deps=list(deps), order=len(items), updatedAt=NOW, updatedBy=None)
    if gate: d['gate'] = gate
    else: d['period'] = period
    if end: d['endPeriod'] = end
    if options is not None: d['options'] = options; d['outcome'] = ''
    items.append((id, d))
ev = lambda e, off=0: {'type': 'event', 'event': e, 'offset': off}
reach = lambda m, v, off=0: {'type': 'reach', 'metric': m, 'value': v, 'offset': off}

# ---------------------------------------------------------------- product
it('p-device-qa', 'Device QA of V1 on iPhone and Android', 'product', 'athar', pri='P0', status='in_progress', period='2026Q4', tags=['t-launch'],
   why='Two layout bugs looked fine in the browser and broke on iOS. Device checks are part of done.', how='Run every core flow on 3 iPhones and 3 Androids from the Vercel and native builds.', kpi='Every launch flow signed off on 6 devices', conf=80)
it('p-rename', 'Rename to Cheeku AI everywhere', 'product', 'athar', pri='P1', period='2026Q4', tags=['t-launch', 't-quickwin'],
   why='Store listing, bundle id, emails and legal texts must carry one name before review.', how='Ops rename: app name, bundle id, domains, store assets, legal entity references.', kpi='No old name left in app, store or emails', conf=85)
it('p-billing', 'Real billing: store subscriptions and UPI on web', 'product', 'athar', pri='P0', period='2026Q4', tags=['t-launch', 't-dependency'],
   why='Plans run on a stand-in today. Paying share is the first number investors check.', how='Store billing for Family, Solo and Daily Pass; UPI checkout on web at 2% fees.', kpi='First paid Family plan through the store', conf=70)
it('p-store', 'Store release: review and submit', 'product', 'athar', kind='milestone', pri='P0', period='2026Q4', tags=['t-launch'], deps=['p-device-qa', 'p-rename', 'p-billing'],
   why='No launch without both stores approving a health app with consent and safety copy in order.', how='Bundle id, privacy labels, health disclaimers, review notes, staged rollout.', kpi='Approved on App Store and Play Store', conf=65)
it('p-launch', 'Public launch: the daily health companion', 'product', 'athar', kind='milestone', pri='P0', gate=ev('launch'), tags=['t-investor'], moat='m-habit', deps=['p-store', 's-lab-live', 'f-seed'],
   why='Day one of the plan: 30,000 monthly users in the launch month across five metros.', how='Launch with the daily plan, Rx check, care booked in chat and fitness in 200 cities.', kpi='30k monthly users in Jan 2027', conf=70)
it('p-rx-ten', 'Prescription check: all 10 checks signed, licensed drug data', 'product', 'suraj', pri='P0', period='2027Q1', tags=['t-risk'], moat='m-trust', deps=['tr-clinical'],
   why='The medication ledger is built; production needs licensed drug data and clinician sign-off on all 10 checks.', how='License a drug database, map brands to salts, MD signs each rule, every flag cites a source.', kpi='10 of 10 checks signed, 0 unsafe flags in review', conf=60)
it('p-food', 'Food and fitness in the daily plan', 'product', 'athar', period='2027Q2', moat='m-habit',
   why='Daily reasons to open the app between consults.', how='Indian meals in real portions fit to the person\'s numbers; fitness classes suggested from the plan.', kpi='40% of weekly actives log a meal or class', conf=60)
it('p-whatsapp', 'WhatsApp: share answers, ask from chat', 'product', 'athar', period='2027Q2', tags=['t-experiment'],
   why='Answers and reports already travel on WhatsApp. Make that the growth loop.', how='Shareable Rx checks and report summaries; ask Cheeku from a WhatsApp thread.', kpi='15% of new users arrive from a share', conf=55)
it('p-weekly', 'Weekly review and quarterly retest loop', 'product', 'athar', period='2027Q1', moat='m-habit',
   why='The daily loop builds habit; the weekly and 90-day loops prove it works.', how='Sunday 60-second review, retest due card, change card after results.', kpi='30% of actives finish a weekly review', conf=65)
it('p-abha', 'ABHA link and ABDM record pull', 'product', 'athar', pri='P1', period='2027Q2', tags=['t-regulatory', 't-dependency'], moat='m-memory',
   why='79.7 cr ABHA ids, records stuck in silos. Consented pulls fill the family file without uploads.', how='ABDM PHR integration, consent artefacts per member, records land as typed facts.', kpi='25% of families link at least one ABHA', conf=50)
it('p-wearables', 'Wearables sync', 'product', 'athar', pri='P2', period='2027Q3', moat='m-memory',
   why='Steps, sleep and BP flow in without typing.', how='Health Connect and HealthKit; readings go to the member\'s memory.', kpi='20% of actives connect a device', conf=55)
it('p-memory-v2', 'Memory timeline v2: every event, every member, over years', 'product', 'athar', period='2027Q4', moat='m-memory',
   why='The memory is the moat. Make its depth visible so families feel what they would lose.', how='Timeline per member, trends by system, open loops, corrections.', kpi='Median family file: 25+ facts after 6 months', conf=60)
it('p-household', 'Household invites onto the Family plan', 'growth', 'athar', period='2028Q1', moat='m-habit',
   why='One member brings the household; Family plan ARPU is 2.5x Solo.', how='Invite flows for parents and spouse, caregiver alerts.', kpi='50% of paying accounts on Family', conf=60)
it('p-insurer-app', 'Insurer member experience: rewards and funded tests', 'product', 'athar', period='2028Q4', deps=['b-insurer-pilot'],
   why='The pilot needs an in-app experience the insurer can show its members.', how='Reward ledger, insurer-funded retests, consent per purpose.', kpi='Pilot members active weekly above 40%', conf=45)
it('p-pendant-partner', 'Pendant: sign a hardware partner', 'product', 'athar', kind='milestone', pri='P2', period='2028Q3', tags=['t-bet'],
   why='Elders who will never type get a voice companion that shares the family memory.', how='Partner builds the device; we own voice, memory and safety.', kpi='Partner signed with unit cost under ₹4,000', conf=40)
it('p-pendant', 'Pendant launch for elders', 'product', 'athar', kind='milestone', pri='P2', gate=ev('pendant'), tags=['t-bet'], deps=['p-pendant-partner', 'tr-cdsco'],
   why='6,000 units a month by 2031 at ₹4,999; also the strongest elder-care moat.', how='Launch in the 5 wave-one metros through the Family plan.', kpi='30% weekly voice use', conf=40)

# ----------------------------------------------------------------- AI
it('a-router', 'Frontier models behind our safety router', 'ai', 'suraj', status='done', period='2026Q4', moat='m-trust',
   why='Safe answers on day one while our own model is trained.', how='Model adapter, 4 urgency tiers, hard-stops before the model.', kpi='Built in V1', conf=95)
it('a-reports', 'Production report reading on Indian lab formats', 'ai', 'suraj', pri='P0', status='in_progress', period='2026Q4', tags=['t-launch'], moat='m-memory',
   why='Every report read into coded values is a fact in the family file.', how='Per-lab templates, unit normalisation, confidence threshold, human fallback.', kpi='95% of values extracted right on the top 20 labs', conf=70)
it('a-evals', 'India eval set: 5,000 cases in 5 languages', 'ai', 'suraj', pri='P0', period='2027Q1', moat='m-model',
   why='No model ships unless it beats frontier APIs on our own evals.', how='Doctor-written cases across labs, Rx, symptoms, pregnancy, elders; 5 languages.', kpi='5,000 cases, doctor reviewed', conf=70)
it('a-gpu', 'Own GPUs serve chat: ₹0.30 → ₹0.10 an answer', 'ai', 'suraj', kind='milestone', pri='P1', gate=ev('ownGpu'), moat='m-model', deps=['f-indiaai'],
   why='Chat cost falls by two thirds overnight, which is what makes 20 free chats a day affordable.', how='Tuned open model on owned or IndiaAI-subsidised H100s.', kpi='p95 latency under 2.5 s at ₹0.10 an answer', conf=60)
it('a-voice', 'Indic speech on our own stack', 'ai', 'suraj', pri='P1', period='2027Q3', moat='m-model',
   why='Voice is the biggest serving cost line; 77% cheaper a minute on our stack.', how='Speech in and out for 5 languages, tuned on Indian accents and medical terms.', kpi='₹0.35 a voice minute by 2031', conf=55)
it('a-adapted', 'Adapted model becomes default in chat', 'ai', 'suraj', kind='gate', pri='P0', period='2028Q1', moat='m-model', deps=['a-evals', 'a-gpu'],
   why='Gate: it wins 70% of India evals or it does not ship.', how='Adapt an open-weight model on consented, doctor-reviewed data.', kpi='Wins 70% of India evals', conf=55)
it('a-data', 'Consented data platform for cohorts', 'ai', 'suraj', period='2028Q2', moat='m-memory', deps=['tr-iso'],
   why='Insurers and states buy anonymised, consented signals. Never raw chats.', how='Aggregation layer, k-anonymity, consent purpose checks, audit log.', kpi='First insurer cohort report delivered', conf=50)
it('a-risk-score', 'Risk score that updates, for insurers', 'ai', 'suraj', period='2028Q3', moat='m-distribution', deps=['a-data'],
   why='The underwriting layer insurers do not have: a score that moves as families get healthier.', how='Adherence, retests and activity into a consented score; rewards only, never a premium rise.', kpi='Score validated on one insurer\'s claims data', conf=40)
it('a-cheeku-h', 'Train CHEEKU-H, our 15–22B health model', 'ai', 'suraj', kind='bet', pri='P1', gate=ev('seriesB', 3), tags=['t-bet', 't-investor'], moat='m-model', deps=['a-adapted', 'f-series-b'], end=None,
   why='India\'s own health model: our base weights plus specialist adapters, trained on consented family histories and ABDM records.', how='250k H100-hours a run, about ₹2.3 cr at IndiaAI rates; ₹33 cr cap over 5 years.', kpi='Beats the adapted model on India evals', conf=40)
it('a-scale', 'Ready for 1 crore users', 'ai', 'suraj', pri='P1', gate=reach('mau', 5000000), tags=['t-dependency'],
   why='Start the work when we cross 50 lakh so it is done before 1 crore.', how='Read replicas, edge caching, India region, cost per user dashboards.', kpi='p95 under 300 ms at 2x peak load', conf=55)
it('a-six-paise', 'Six paise an answer on our own model', 'ai', 'suraj', kind='milestone', period='2031H1', moat='m-model',
   why='4x cheaper than frontier APIs; the margin behind 20 free chats a day.', how='CHEEKU-H in production plus distillation for simple turns.', kpi='₹0.06 an answer', conf=45)

# ------------------------------------------------------------- supply
it('s-pincodes', 'Care in 12,000+ pincodes: labs, doctors, medicines', 'supply', 'deepesh', status='done', period='2026Q4', moat='m-supply',
   why='Supply on day one through partner APIs, at zero cost to build.', how='Provider API layer; swapping a partner touches only that layer.', kpi='Live', conf=95)
it('s-fitness', 'Fitness and healthy living in 200 cities', 'supply', 'deepesh', status='done', period='2026Q4', moat='m-supply',
   why='Partnership with India\'s leading fitness platform; 15% markup per class.', how='Discover, book and track classes in the app.', kpi='Live', conf=95)
it('s-lab-live', 'Lab partner live with markup and payments', 'supply', 'deepesh', pri='P0', status='in_progress', period='2026Q4', tags=['t-launch'], moat='m-supply',
   why='Care bookings are the largest revenue engine. They must work on day one.', how='Partner pricing plus our markup, paid in chat, results filed back to the member.', kpi='First paid home collection end to end', conf=70)
it('s-doctors', 'Doctor consults through registered partners', 'supply', 'deepesh', pri='P1', period='2027Q1', tags=['t-regulatory'],
   why='Telemedicine rules 2020: consults only with registered doctors on the partner network.', how='Partner booking API, pre-consult summary from memory, Rx back into the ledger.', kpi='Consult booked to Rx filed in under 24 h', conf=65)
it('s-sla', 'Result back in the thread within 24 hours', 'supply', 'deepesh', period='2027Q2',
   why='The promise is the loop: book, test, result explained, next step.', how='Partner SLAs, webhooks, nudges when a result is late.', kpi='90% of lab results filed within 24 h', conf=60)
it('s-care-cats', 'More care: dietitians, physio, elder care at home', 'supply', 'deepesh', period='2027Q3', moat='m-supply',
   why='Roadmap gate: 6% of users book monthly.', how='Add categories through the same provider layer.', kpi='6% of users book each month', conf=55)
it('s-medicines', 'Medicines delivered from chat', 'supply', 'deepesh', pri='P2', period='2027Q4', tags=['t-regulatory'],
   why='Refills are the most frequent need for families caring for parents.', how='Pharmacy partner, Rx from the ledger, generics suggested.', kpi='20% of chronic patients refill through Cheeku', conf=45)
it('s-second', 'A second partner in every care category', 'supply', 'deepesh', pri='P1', period='2028Q2', tags=['t-risk'],
   why='Reliance on one partner is a medium risk on the register.', how='Same provider API, routing by price, slot and SLA.', kpi='Two live partners in labs, doctors, medicines', conf=55)
it('s-hospitals', 'Hospital partners for procedures and second opinions', 'supply', 'deepesh', kind='bet', pri='P2', status='idea', period='2029Q1', tags=['t-bet'],
   why='High-value bookings once families trust Cheeku with big decisions.', how='Packages with hospital chains, surgery counselling from memory.', kpi='₹20 cr GMV in the first year', conf=30)

# ------------------------------------------------------------- growth
it('g-cities', 'Launch in Delhi NCR, Bengaluru, Mumbai, Pune, Hyderabad', 'growth', 'athar', pri='P0', period='2027Q1',
   why='Wave one: adults caring for parents, and new parents.', how='₹40 lakh a month, ₹120 paid CAC, creators and parent groups.', kpi='4.9 lakh monthly users by Dec 2027', conf=65)
it('g-pages', 'Health answer pages that rank', 'growth', 'athar', period='2027Q1', tags=['t-quickwin'], moat='m-habit',
   why='Organic does the heavy lifting: 49% of new users in 2027, 74% by 2031.', how='Answer pages from real questions, reviewed by doctors, in 5 languages later.', kpi='1 lakh monthly organic visits by Q3', conf=60)
it('g-referral', 'Invite your parents loop', 'growth', 'athar', period='2027Q2', tags=['t-experiment'],
   why='The launch ICP cares for parents; the parents are the next users.', how='Invite from a report or Rx check, caregiver view.', kpi='0.3 invites accepted per active a month', conf=50)
it('g-retention', '25% day-30 retention before we scale spend', 'growth', 'athar', kind='gate', pri='P0', period='2027Q2', tags=['t-investor', 't-risk'],
   why='Gate on the roadmap: no spend scale-up before the habit holds.', how='Cohort dashboard, weekly retention review, cut paid if it slips.', kpi='Day-30 retention 25%+', conf=55)
it('g-lakh', '1 lakh consumer users', 'growth', 'athar', kind='milestone', pri='P1', gate=ev('lakh'), tags=['t-investor'], moat='m-habit',
   why='Also the trigger for the employer vertical.', how='', kpi='1 lakh monthly users', conf=70)
it('g-tier2', 'Tier 2 cities with voice', 'growth', 'athar', period='2028Q2', deps=['a-voice'],
   why='Wave two: every member, every language.', how='Voice in 5 languages, regional creators, WhatsApp-first.', kpi='30% of new users from tier 2', conf=50)
it('g-tenlakh', '10 lakh monthly users', 'growth', 'athar', kind='milestone', gate=ev('tenLakh'), tags=['t-investor'],
   why='', how='', kpi='', conf=65)
it('g-crore', '1 crore monthly users: replace Google for health at home', 'growth', 'athar', kind='milestone', gate=ev('crore'), tags=['t-bet'], moat='m-habit',
   why='The point where Cheeku is the default first stop for a health question in Indian homes.', how='', kpi='1 crore monthly users', conf=50)
it('g-cac', 'Keep blended cost per new user under ₹60', 'growth', 'athar', period='2027Q3', end='2031H2',
   why='Paid LTV/CAC is only 1.8x by 2031; organic carries the model.', how='Monthly CAC review; the runway rule cuts paid spend first.', kpi='Blended CAC ≤ ₹60', conf=60)

# ------------------------------------------------------------ revenue
it('r-subs', 'Subscriptions live: Family ₹249, Solo ₹99, Daily Pass ₹29', 'revenue', 'athar', kind='milestone', pri='P0', period='2027Q1', deps=['p-billing'],
   why='Paying share grows from 1.1% to 3.0%; many upgrade after hitting 20 chats a day.', how='Plans, upgrades and Daily Pass at the free limit.', kpi='1% of users paying by Dec 2027', conf=65)
it('r-bookings', 'Care bookings earn our markup in chat', 'revenue', 'deepesh', pri='P0', period='2027Q1', moat='m-supply', deps=['s-lab-live'],
   why='Largest engine: ₹247 cr in 2031.', how='Partner price plus 10–13% take, one price, one slot.', kpi='3% of users book each month in 2027', conf=60)
it('r-fitness', 'Fitness classes at 15% markup', 'revenue', 'deepesh', period='2027Q1', moat='m-supply',
   why='₹41 cr by 2031 from classes in 200 cities.', how='Markup of 15%, at least ₹25 a class.', kpi='0.5% of users book a class each month', conf=60)
it('r-web-upi', 'Move plans to UPI on web: fees 15% → 2%', 'revenue', 'athar', period='2028Q1', tags=['t-quickwin'],
   why='Half of plans on web by 2031 saves about 6 points of margin on subscriptions.', how='Web checkout, renewal reminders, family billing.', kpi='20% of plans paid on web by Dec 2028', conf=55)
it('r-ads', 'Labelled ads in non-urgent chats', 'revenue', 'deepesh', period='2028Q1',
   why='₹87 cr by 2031; never in red-flag chats.', how='Sponsored products and services, labelled, relevance-checked.', kpi='₹0.6 a user a month in 2028', conf=50)
it('r-listings', 'Insurance listings in the app', 'revenue', 'deepesh', period='2028Q1',
   why='₹61 cr by 2031 from 0.3 → 0.7 policies per 1,000 users a month.', how='Licensed partner, comparison from the family\'s own needs.', kpi='0.3 policies per 1,000 users a month', conf=50)
it('r-100', '₹100 cr revenue run rate', 'revenue', 'athar', kind='milestone', gate=reach('revRunRate', 100), tags=['t-investor'],
   why='', how='', kpi='₹100 cr a year run rate', conf=60)
it('r-profit', 'EBITDA positive for good', 'revenue', 'athar', kind='milestone', pri='P0', gate=ev('breakeven'), tags=['t-investor'],
   why='Self-funding from here; no round needed after Series B.', how='', kpi='Every month EBITDA positive after this', conf=55)
it('r-1000', '₹1,000 cr revenue run rate', 'revenue', 'athar', kind='milestone', gate=reach('revRunRate', 1000), tags=['t-bet'],
   why='', how='', kpi='₹1,000 cr a year run rate', conf=40)
it('r-price', 'Raise prices 10% as memory deepens?', 'revenue', 'athar', kind='decision', pri='P2', period='2028Q4', tags=['t-decision'],
   why='The plan assumes +10% in 2029, +20% in 2030, +30% in 2031 over launch.', how='', kpi='', conf=50, options='Raise for new users only · raise for all with 3 months notice · hold and add a premium tier')

# --------------------------------------------------------------- b2b
it('b-corp-team', 'Corporate sales: first 3 hires', 'team', 'deepesh', pri='P1', gate=ev('corpLive', -1), moat='m-distribution', deps=['g-lakh'],
   why='The team has to be in seat when the vertical opens.', how='Two account executives and one benefits-platform partnerships lead.', kpi='3 hired a month before go-live', conf=60)
it('b-corp-live', 'Employers go live: Family plan at 30% off for staff', 'b2b', 'deepesh', kind='milestone', pri='P0', gate=ev('corpLive'), tags=['t-investor'], moat='m-distribution', deps=['g-lakh', 'b-corp-team'],
   why='Starts two months after the app passes 1 lakh users. ₹75 cr by 2031, 9% of revenue.', how='Direct sales to HR: ₹174 a month per employee, or the employer pays for everyone.', kpi='First company signed', conf=55)
it('b-hr', 'First HR benefits platform listing', 'b2b', 'deepesh', pri='P1', gate=ev('corpLive', 3), moat='m-distribution',
   why='Benefits platforms put Cheeku in front of lakhs of covered lives; they keep 25%.', how='List in flexi-benefits and group insurance catalogues.', kpi='1 platform live, 2% attach', conf=50)
it('b-ten', 'First 10 companies', 'b2b', 'deepesh', kind='milestone', gate=reach('corpClients', 10), tags=['t-investor'],
   why='', how='', kpi='10 companies', conf=55)
it('b-diwali', 'First Diwali gifting season', 'b2b', 'deepesh', pri='P1', period='2027Q4', tags=['t-experiment'],
   why='Year-long Family plans bought in bulk, paid up front: cash arrives before revenue.', how='Gift codes, HR dashboard for activations, Oct–Nov campaign.', kpi='3,000 plans gifted, 70% activated', conf=50)
it('b-hundred', '100 companies', 'b2b', 'deepesh', kind='milestone', gate=reach('corpClients', 100), moat='m-distribution',
   why='', how='', kpi='100 companies', conf=50)
it('b-loi', '1 insurer letter of intent', 'b2b', 'deepesh', kind='gate', pri='P0', period='2028Q3', tags=['t-risk', 't-investor'], moat='m-distribution',
   why='Roadmap gate for the insurer track. Miss it and the track slows.', how='Wellness-partner pitch with retention and adherence data.', kpi='Signed LOI by Sep 2028', conf=45)
it('b-insurer-pilot', 'Insurer wellness pilot', 'b2b', 'deepesh', pri='P1', period='2028Q4', moat='m-distribution', deps=['b-loi', 'tr-iso'],
   why='Year one of the risk layer: a companion for the insurer\'s members.', how='10,000 members, funded tests, renewal rewards.', kpi='10,000 members enrolled', conf=45)
it('b-insurer-rev', 'Insurer risk-layer revenue starts', 'b2b', 'deepesh', kind='milestone', gate=ev('insurerFirst'), tags=['t-investor'], moat='m-distribution', deps=['b-insurer-pilot', 'a-risk-score'],
   why='₹84 cr by 2031 from 7 insurers.', how='Cohort analytics linked to premiums and claims.', kpi='First paid insurer contract', conf=45)
it('b-state', 'First state licenses the memory layer on ABHA', 'b2b', 'athar', kind='milestone', gate=ev('stateFirst'), tags=['t-bet'], moat='m-memory', deps=['p-abha'],
   why='Continuity of care for public programmes. ₹46 cr by 2031 from 4 states.', how='Pilot with one state health mission, consented ABHA-linked memory.', kpi='First state contract', conf=35)
it('b-llm', 'Model licensing to hospitals and healthtechs', 'b2b', 'athar', kind='milestone', gate=ev('llmFirst'), tags=['t-bet'], moat='m-model', deps=['a-cheeku-h'],
   why='₹51 cr by 2031 from 40 API clients.', how='API access to CHEEKU-H with India evals as the sales proof.', kpi='First paid API client', conf=35)
it('b-sandbox', 'IRDAI sandbox: the underwriting layer', 'b2b', 'deepesh', kind='bet', pri='P2', period='2030H1', tags=['t-regulatory', 't-bet'], moat='m-trust', deps=['b-insurer-rev'],
   why='Year three of the insurer track: cover that gets cheaper as families get healthier.', how='Consented health passport and an updating risk score, inside the sandbox.', kpi='Sandbox approval', conf=30)
it('b-seven', '7 insurers on the risk layer', 'b2b', 'deepesh', kind='milestone', period='2031H2', moat='m-distribution',
   why='', how='', kpi='7 insurers', conf=35)
it('b-pricing', 'Employer pricing: 30% off for staff, or a flat fee per seat?', 'b2b', 'deepesh', kind='decision', pri='P1', period='2027Q1', tags=['t-decision'],
   why='The model assumes 30% off the Family plan, employees paying unless the employer covers everyone.', how='', kpi='', conf=50, options='30% off, employee pays · employer pays ₹174 a seat · flat ₹99 per employee a month, no family')
it('b-first-insurer', 'Which insurer do we pilot with first?', 'b2b', 'deepesh', kind='decision', pri='P1', period='2028Q2', tags=['t-decision'],
   why='The pilot decides the risk layer\'s first two years.', how='', kpi='', conf=50, options='Large private general insurer · standalone health insurer · group cover through an employer client')

# ------------------------------------------------------------ funding
it('f-incorporate', 'Incorporate the company', 'funding', 'athar', pri='P0', period='2026Q4', tags=['t-launch', 't-dependency'],
   why='Not yet incorporated. The seed, legal texts and partner contracts need the entity.', how='Private limited, founder agreements, ESOP pool, DPIIT recognition.', kpi='Certificate of incorporation', conf=80)
it('f-seed-terms', 'Seed terms: aim for 20%, walk away above 22.4%', 'funding', 'athar', kind='decision', pri='P0', period='2026Q4', tags=['t-decision', 't-investor'],
   why='Same ₹26 cr in every case; only the price moves. 22.4% is the ceiling we show investors.', how='', kpi='', conf=60, options='17% at ₹127 cr pre · 20% at ₹104 cr pre · 22.4% at ₹90 cr pre')
it('f-seed', 'Close the seed: ₹26 cr', 'funding', 'athar', kind='milestone', pri='P0', period='2027Q1', tags=['t-investor'], deps=['f-incorporate', 'f-seed-terms'],
   why='17 months of runway to the Series A.', how='35% people, 33% growth, 18% model, 14% ops.', kpi='₹26 cr in the bank', conf=60)
it('f-update', 'Monthly investor update on 8 numbers', 'funding', 'athar', period='2027Q1', end='2031H2', tags=['t-quickwin'],
   why='MAU, D30 retention, paying share, bookings per user, CAC, cost per answer, eval win rate, safety incidents.', how='Auto-filled from the analytics stack on the 5th of each month.', kpi='Sent every month', conf=80)
it('f-indiaai', 'Apply for IndiaAI compute', 'funding', 'suraj', pri='P1', period='2027Q1', moat='m-model',
   why='H100s at about ₹92 an hour make our own model affordable.', how='IndiaAI Mission compute application with the eval plan.', kpi='Allocation approved', conf=50)
it('f-a-proof', 'Series A proof points in hand', 'funding', 'athar', kind='gate', pri='P0', gate=ev('seriesA', -3), tags=['t-investor'], deps=['g-retention', 'r-subs'],
   why='What the seed must buy: 5.9 lakh monthly users, 10,000+ payers, 25% D30, care booked weekly.', how='Data room, cohort charts, eval results.', kpi='All four proof points met', conf=50)
it('f-low', 'Lowest cash month: hold the 6-month runway rule', 'funding', 'athar', kind='gate', pri='P0', gate=ev('minCash'), tags=['t-risk'],
   why='Cash dips to about ₹11 cr just before the Series A. Under 6 months of cash, cuts start.', how='Marketing to 35%, model spend halved, hiring frozen until the round lands.', kpi='Never under 6 months of cash', conf=55)
it('f-series-a', 'Series A: ₹70 cr', 'funding', 'athar', kind='milestone', pri='P0', gate=ev('seriesA'), tags=['t-investor'], deps=['f-a-proof'],
   why='Funds the adapted model, voice, tier 2 and the insurer track.', how='', kpi='₹70 cr at ₹250 cr pre', conf=50)
it('f-series-b', 'Series B: ₹150 cr', 'funding', 'athar', kind='milestone', pri='P1', gate=ev('seriesB'), tags=['t-investor'], deps=['f-series-a'],
   why='Funds CHEEKU-H, the pendant and the institution sales team. Last round in the plan.', how='', kpi='₹150 cr at ₹750 cr pre', conf=45)
it('f-bridge', 'Line up a ₹10–15 cr bridge option for the bear case', 'funding', 'athar', kind='decision', pri='P2', period='2029Q4', tags=['t-decision', 't-risk'],
   why='In the bear case cash dips to about −₹7 cr in Sep 2031.', how='', kpi='', conf=50, options='Venture debt · insider bridge · deeper cuts in 2031')

# --------------------------------------------------------------- team
it('t-deepesh', 'Deepesh joins as co-founder and CBO', 'team', 'deepesh', kind='milestone', status='done', period='2026Q4', moat='m-distribution',
   why='GTM, enterprise sales and distribution: Pine Labs and Practo.', how='', kpi='Done', conf=95)
it('t-esop', 'ESOP pool: 10% before seed, 5% top-up before A', 'team', 'athar', kind='decision', pri='P1', period='2026Q4', tags=['t-decision'],
   why='Founding hires in 2027 need meaningful equity.', how='', kpi='', conf=60, options='10% + 5% as modelled · 12% up front, no top-up')
it('t-engs', 'Four founding engineers', 'team', 'suraj', pri='P0', period='2027Q1',
   why='Mobile, backend, infra: the team that takes V1 to 5 lakh users.', how='CTC about ₹30 lakh plus ESOP.', kpi='4 in seat by Mar 2027', conf=60)
it('t-ml', 'Head of ML and the eval team', 'team', 'suraj', pri='P0', period='2027Q1', moat='m-model',
   why='5 people in AI and data by Dec 2027.', how='Head of ML, eval lead, Indic voice engineer.', kpi='Head of ML signed', conf=55)
it('t-md', 'MD clinical lead and two reviewers', 'team', 'athar', pri='P0', period='2027Q1', tags=['t-launch'], moat='m-trust',
   why='Every rule and every Rx check needs a clinical sign-off owner.', how='Part-time MD lead first, full-time by Q3.', kpi='MD lead signed before launch', conf=65)
it('t-b2b', 'Institution sales team for insurers and states', 'team', 'deepesh', period='2028Q2', moat='m-distribution',
   why='B2B team grows from 1 to 22 by 2031.', how='', kpi='4 people by Dec 2028', conf=50)
it('t-hundred', '100 people', 'team', 'athar', kind='milestone', gate=reach('headcount', 100),
   why='', how='Second layer of leaders in every function.', kpi='100 on payroll', conf=60)

# -------------------------------------------------------------- trust
it('tr-dpdp', 'DPDP readiness: consent ledger, privacy requests, breach plan', 'trust', 'athar', status='done', period='2026Q4', moat='m-trust',
   why='Consent per purpose, a named Grievance Officer and a 90-day request clock.', how='Done in V1: migration 0041, privacy alerts, breach runbook.', kpi='Done', conf=90)
it('tr-hosting', 'India-region hosting', 'trust', 'suraj', pri='P0', period='2026Q4', tags=['t-launch', 't-regulatory'],
   why='Health data stays in India for DPDP, insurers and states.', how='Move database, storage and functions to an India region.', kpi='All personal data in India', conf=70)
it('tr-clinical', 'Clinician-signed rules and weekly doctor review', 'trust', 'suraj', pri='P0', period='2027Q1', moat='m-trust', deps=['t-md'],
   why='Rules decide, the model explains. Rules need a doctor\'s signature.', how='Rule registry with signer and date, weekly review of flagged answers.', kpi='100% of rules signed; review every week', conf=65)
it('tr-audit', 'External security audit and pen test', 'trust', 'suraj', period='2027Q2', tags=['t-risk'],
   why='Breach risk is high impact. Employers and insurers will ask.', how='Third-party pen test, fixes, retest.', kpi='No high findings open', conf=60)
it('tr-iso', 'ISO 27001 for employer and insurer contracts', 'trust', 'suraj', pri='P1', period='2028Q1', tags=['t-dependency'], moat='m-trust',
   why='Procurement gate for insurers, large employers and states.', how='Policies, controls, audit.', kpi='Certified', conf=50)
it('tr-cdsco', 'CDSCO path for the pendant and any diagnostic claim', 'trust', 'athar', pri='P2', period='2029Q1', tags=['t-regulatory'], moat='m-trust',
   why='App and pendant stay a wellness companion until certified.', how='Regulatory counsel, classification, clinical evidence plan.', kpi='Classification confirmed', conf=40)

# ---------------------------------------------------------------- risks
RISKS = [
    ('r-advice', 'Wrong or unsafe advice', 'Unsafe advice', 2, 5, 'suraj', 'mitigating', 'Flagged answers in weekly review rise', 'Hard-stops before the model, clinician-signed rules, India evals, weekly doctor review.', ['a-router', 'tr-clinical', 'a-evals', 't-md']),
    ('r-retention', 'Families do not stay', 'Retention', 3, 5, 'athar', 'open', 'Day-30 retention under 20% for two cohorts', 'Memory gets more useful every month; no spend scale-up before 25% day-30.', ['g-retention', 'p-weekly', 'p-memory-v2', 'p-food']),
    ('r-cac', 'Paid growth gets costly', 'CAC', 3, 4, 'athar', 'open', 'Paid CAC above ₹160 in 2027', 'Organic-first channels; the runway rule cuts paid spend first.', ['g-pages', 'g-referral', 'p-whatsapp', 'g-cac']),
    ('r-partner', 'Reliance on one care partner', 'One partner', 3, 3, 'deepesh', 'open', 'Partner SLA misses two months running', 'Provider API layer is built; a second partner per category by 2028.', ['s-second', 's-sla']),
    ('r-model', 'Own model costs more or slips', 'Model slips', 3, 3, 'suraj', 'open', 'Adapted model under 60% eval wins in Q4 2027', 'Adapted model first; train from scratch only if it wins; ₹33 cr cap.', ['a-evals', 'a-adapted', 'f-indiaai']),
    ('r-reg', 'Regulation tightens', 'Regulation', 2, 4, 'athar', 'mitigating', 'New DPDP rules or telemedicine guidance', 'Consent ledger, no diagnosis claims, companion positioning, counsel from seed.', ['tr-dpdp', 'tr-hosting', 'tr-cdsco']),
    ('r-institutions', 'Institutions buy slowly', 'Slow B2B', 4, 3, 'deepesh', 'open', 'No insurer LOI by Sep 2028', 'Bear case delays deals 6 months; families and employers are 79% of 2031 revenue.', ['b-loi', 'b-insurer-pilot', 'tr-iso']),
    ('r-rx', 'Prescription check is wrong', 'Rx check', 2, 5, 'suraj', 'open', 'Any unsafe flag reaching a family', 'Never says stop or rates the doctor; licensed drug data, signed rules, a source on every flag.', ['p-rx-ten', 'tr-clinical']),
    ('r-runway', 'Series A slips past the lowest cash month', 'Runway', 3, 5, 'athar', 'open', 'Proof points behind plan by Q3 2027', 'Six-month runway rule, proof points tracked monthly, bridge options ready.', ['f-a-proof', 'f-low', 'f-update']),
    ('r-breach', 'Health data breach', 'Breach', 2, 5, 'suraj', 'mitigating', 'Pen test high findings, unusual access', 'Row-level security per member, India hosting, audits, breach runbook.', ['tr-audit', 'tr-iso', 'tr-dpdp', 'tr-hosting']),
    ('r-corp', 'Employer sales take longer than planned', 'Employer cycle', 3, 2, 'deepesh', 'open', 'Under 10 companies 6 months after go-live', 'Benefits platforms and gifting run alongside direct sales.', ['b-hr', 'b-diwali', 'b-corp-team']),
    ('r-focus', 'Founder bandwidth across too many tracks', 'Focus', 3, 3, 'athar', 'open', 'More than 3 open P0s per founder in a quarter', 'Owners per lane, gates that stop tracks, weekly sync on this board.', ['t-engs', 't-ml', 't-b2b']),
]

def dump():
    import shutil
    shutil.rmtree(OUT, ignore_errors=True)
    writes = []
    def add(coll, id, data):
        p = os.path.join(OUT, coll); os.makedirs(p, exist_ok=True)
        f = os.path.join(p, id + '.json'); json.dump(data, open(f, 'w'), ensure_ascii=False, indent=1)
        writes.append({'op': 'set', 'collection': coll, 'doc_id': id, 'file_path': f})
    for i, (id, label, color) in enumerate(TAGS): add('tags', id, {'label': label, 'color': color, 'order': i})
    for i, (id, name, metric, thesis) in enumerate(MOATS): add('moats', id, {'name': name, 'metric': metric, 'thesis': thesis, 'order': i})
    for id, title, short, l, im, owner, status, signal, mit, its in RISKS: add('risks', id, {'title': title, 'short': short, 'likelihood': l, 'impact': im, 'owner': owner, 'status': status, 'signal': signal, 'mitigation': mit, 'items': its, 'updatedAt': NOW})
    ids = {i for i, _ in items}
    for id, d in items:
        for dep in d['deps']: assert dep in ids, (id, dep)
        add('items', id, d)
    for r in RISKS:
        for x in r[-1]: assert x in ids, (r[0], x)
    add('board', 'plan', {'scenario': 'base', 'drv': {}, 'updatedAt': NOW})
    batches = [writes[i:i + 50] for i in range(0, len(writes), 50)]
    json.dump(batches, open(os.path.join(HERE, 'batches.json'), 'w'), indent=1)
    print(len(items), 'items', len(RISKS), 'risks', len(writes), 'writes in', len(batches), 'batches')
if __name__ == '__main__': dump()
