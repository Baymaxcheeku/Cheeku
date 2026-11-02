// Cheeku seed spend model: 18 months from close (Jan 2027 = month 1 to Jun 2028 = month 18).
// Money in ₹ lakh. Revenue and cost of revenue per scenario come from financial model v2 (engine.js).
const SP = (function () {
  const N = 18;
  const MONTHS = ['Jan 27', 'Feb 27', 'Mar 27', 'Apr 27', 'May 27', 'Jun 27', 'Jul 27', 'Aug 27', 'Sep 27', 'Oct 27', 'Nov 27', 'Dec 27', 'Jan 28', 'Feb 28', 'Mar 28', 'Apr 28', 'May 28', 'Jun 28'];
  const TEAMS = { founders: 'Founders', eng: 'Engineering', ai: 'AI and data', product: 'Product and design', clinical: 'Clinical', care: 'Care', growth: 'Growth', corp: 'Employer sales', ga: 'Finance and people' };
  // team, role, CTC ₹ lakh a year, start month in the base plan, why
  const ROLES = [
    ['founders', 'CEO (Athar)', 24, 1, 'Product, raise, hiring'],
    ['founders', 'CTO (Suraj)', 24, 1, 'Architecture, model, safety router'],
    ['founders', 'CBO (Deepesh)', 24, 1, 'Partners, employers, insurers'],
    ['eng', 'Founding full-stack engineer', 36, 1, 'Chat, memory, booking flows'],
    ['eng', 'Mobile engineer (React Native)', 32, 1, 'iOS and Android launch'],
    ['eng', 'Backend and integrations engineer', 36, 3, 'Lab, doctor and payment partner APIs'],
    ['eng', 'QA and test engineer', 16, 5, 'Release gate, regression suite'],
    ['eng', 'Full-stack engineer', 30, 9, 'Employer portal, family sharing'],
    ['eng', 'DevOps and security engineer', 34, 9, 'India hosting, DPDP controls, uptime'],
    ['eng', 'Full-stack engineer', 30, 13, 'ABDM integration'],
    ['ai', 'ML engineer (LLM, retrieval)', 45, 1, 'Memory tools, fine-tuning, routing'],
    ['ai', 'Evals and safety engineer', 34, 3, '5,000-case India eval set, red flags'],
    ['ai', 'Data engineer', 30, 7, 'Report and prescription parsing pipeline'],
    ['ai', 'Head of ML', 75, 11, 'Own-GPU serving, adapted model'],
    ['ai', 'Indic speech engineer', 42, 13, 'Hindi voice, then 4 more languages'],
    ['product', 'Product designer', 28, 2, 'Launch UX, parent mode'],
    ['product', 'Hindi content and UX writer', 12, 5, 'Plain-language answers, Hindi'],
    ['product', 'Product manager', 32, 8, 'Bookings and care plan'],
    ['clinical', 'Clinical lead (MD)', 42, 1, 'Signs every rule set, weekly chat review'],
    ['clinical', 'Clinical pharmacist', 14, 3, 'Prescription check, drug database'],
    ['clinical', 'Clinical QA associate', 9, 8, 'Audits answers, escalations'],
    ['clinical', 'Specialist physician (part-time)', 30, 13, 'Diabetes and cardiac rule sets'],
    ['care', 'Care coordinator', 5.5, 4, 'Booking follow-through, family support'],
    ['care', 'Care coordinator', 5.5, 6, 'Booking follow-through, family support'],
    ['care', 'Care coordinator', 5.5, 8, 'Hindi support line'],
    ['care', 'Care coordinator', 5.5, 10, 'Employer member support'],
    ['care', 'Care coordinator', 5.5, 13, 'Second metro'],
    ['growth', 'Partnerships manager (labs, doctors)', 22, 2, 'Two partners per category, pricing'],
    ['growth', 'Growth lead', 36, 3, 'Launch, channels, retention'],
    ['growth', 'Content and community lead', 15, 4, 'Report-decode campaign, WhatsApp'],
    ['growth', 'Performance marketer', 18, 6, 'Meta and Google, CAC guardrails'],
    ['growth', 'Doctor and creator partnerships', 14, 10, 'Named doctor panel, creators'],
    ['corp', 'Employer sales lead', 30, 2, 'First 10 employers'],
    ['corp', 'Account executive', 16, 8, 'Mid-size employers, HR platforms'],
    ['corp', 'Customer success', 10, 8, 'Employer onboarding, wellness talks'],
    ['corp', 'Account executive', 16, 10, 'Diwali gifting, benefits platforms'],
    ['ga', 'Finance and operations manager', 18, 3, 'Payroll, compliance, investor reporting'],
    ['ga', 'People and recruiting partner', 14, 10, 'Hiring 30+ people'],
  ];
  const MKT_BASE = [8, 12, 40, 42, 38, 38, 38, 38, 38, 38, 38, 38, 45, 45, 45, 45, 45, 45];
  const MKT_SPLIT = [['Performance (Meta, Google, app stores)', 0.40], ['Creators and doctor content', 0.20], ['Hero campaign (report decode, HbA1c challenge)', 0.15], ['Employer channel (events, wellness talks, gifting kits)', 0.10], ['Brand, PR and app store optimisation', 0.10], ['Referral credits', 0.05]];
  let REV = null;
  const DEFAULTS = { scenario: 'base', mkt: 100, salary: 100, pace: 0, gpu: true, contingency: 10, raise: 2600 };

  function compute(o) {
    o = Object.assign({}, DEFAULTS, o);
    const sc = o.scenario, R = REV[sc];
    const sal = o.salary / 100, mk = o.mkt / 100;
    // scenario rules: bull pulls hires from month 4 on forward by 2 months and spends 30% more on marketing;
    // bear freezes hires due from month 7 for 4 months and cuts marketing 35% from month 7 (defend mode).
    const roles = ROLES.map(r => {
      let start = r[3];
      if (r[0] !== 'founders') {
        if (sc === 'bull' && start >= 4) start -= 2;
        if (sc === 'bear' && start >= 7) start += 4;
        if (start > 1) start = Math.max(2, start + o.pace);
      }
      return { team: r[0], role: r[1], ctc: r[2] * sal, start, why: r[4], base: r[3] };
    });
    const rows = [];
    let cash = o.raise, out = -1;
    for (let m = 1; m <= N; m++) {
      const L = { people: 0, hiring: 0, marketing: 0, model: 0, ops: 0 };
      const byTeam = {}; let hc = 0;
      const sub = {};
      roles.forEach(r => {
        if (m >= r.start && r.start <= N) {
          const raiseF = (m >= 13 && r.start < 13) ? 1.08 : 1;
          const c = r.ctc / 12 * 1.10 * raiseF;           // 10% on top of CTC: gratuity, group health cover, benefits
          L.people += c; byTeam[r.team] = (byTeam[r.team] || 0) + c; hc++;
        }
        if (m === r.start && r.team !== 'founders') L.hiring += r.ctc / 24 + 1.2;  // recruiting (half a month of CTC, mostly referrals) + laptop and setup
      });
      // marketing
      let mf = mk; if (sc === 'bull') mf *= 1.3; if (sc === 'bear' && m >= 7) mf *= 0.65;
      L.marketing = MKT_BASE[m - 1] * mf;
      // model and AI
      sub.tuning = m <= 6 ? 3 : 5;
      sub.evals = (m >= 2 && m <= 4 ? 7 : 0) + (m >= 7 ? 2 : 0);
      sub.gpu = o.gpu ? (m >= 13 ? 8 : m >= 7 ? 6 : 0) : 0;
      sub.cloud = m >= 13 ? 3 : m >= 4 ? 2 : 1.5;
      sub.voice = m >= 11 ? 3 : 0;
      sub.tooling = 1;
      L.model = sub.tuning + sub.evals + sub.gpu + sub.cloud + sub.voice + sub.tooling;
      // ops, clinical safety and admin
      sub.drugdb = 25 / 12;
      sub.panel = m >= 13 ? 8 : m >= 7 ? 5 : m >= 3 ? 3 : 0;
      sub.legal = (m <= 2 ? 7.5 : 0) + 1.5;
      sub.security = (m === 3 || m === 12) ? 6 : 0;
      sub.insurance = 1;
      sub.accounts = 1.2;
      sub.office = hc * 0.12 * 0.6;
      sub.tools = hc * 0.08;
      sub.setup = m === 1 ? 3 : 0;
      sub.partners = (m === 2 ? 5 : 0) + (m >= 3 ? 1 : 0);
      sub.travel = 1.5;
      L.ops = sub.drugdb + sub.panel + sub.legal + sub.security + sub.insurance + sub.accounts + sub.office + sub.tools + sub.setup + sub.partners + sub.travel;
      const gross = L.people + L.hiring + L.marketing + L.model + L.ops;
      const rev = R.rev[m - 1], cor = R.cor[m - 1], contrib = rev - cor;
      const net = gross - contrib;
      cash -= net;
      if (cash < 0 && out < 0) out = m;
      rows.push({ m, label: MONTHS[m - 1], ...L, gross, rev, cor, contrib, net, cash, hc, byTeam, sub: { ...sub }, mau: R.mau[m - 1], subs: R.subs[m - 1], seats: R.seats[m - 1] });
    }
    const sum = k => rows.reduce((a, r) => a + r[k], 0);
    const tot = { people: sum('people'), hiring: sum('hiring'), marketing: sum('marketing'), model: sum('model'), ops: sum('ops'), gross: sum('gross'), rev: sum('rev'), cor: sum('cor'), contrib: sum('contrib'), net: sum('net') };
    tot.contingency = tot.net * o.contingency / 100;
    tot.need = tot.net + tot.contingency;
    // runway: months the raise lasts at this plan, extending past 18 at the month-18 burn
    let runway = out > 0 ? out - 1 + (rows[out - 2] ? rows[out - 2].cash / rows[out - 1].net : 0) : 18 + rows[17].cash / Math.max(1, rows[17].net);
    return { o, roles, rows, tot, runway, endCash: rows[17].cash };
  }
  return { compute, ROLES, TEAMS, MKT_SPLIT, MONTHS, DEFAULTS, setRev: r => { REV = r; } };
})();
if (typeof module !== 'undefined') module.exports = SP;
