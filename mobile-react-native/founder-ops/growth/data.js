// Pulls every number the growth plan quotes from the financial model engine (base case), so the plan cannot drift from the model.
const E = require('../vision-board/engine.js');
const s = E.scenario('base'), rows = E.run(s), A = E.annual(rows);
const pick = r => ({ mkt: r.oMkt, paid: r.newPaid, org: r.newOrganic, mau: r.mau, subs: r.subs, passes: r.passes || 0, rxDay: r.rxPerDay, rx: r.rxCases,
  corp: r.corpClients, corpNew: r.corpNewClients, seats: r.seats, mauCorp: r.mauCorp || 0, corpSales: r.oCorpSales, rCorp: r.rCorp, gift: r.giftBilled || 0, hr: r.hrPartners || 0,
  growthHc: r.hc.growth, corpHc: r.hc.corp, rev: r.rev });
const ue = A.map((a, y) => { const mm = a.mauAvg * 12, cm = a.gp / mm, ch = s.churn[y];
  return { year: a.year, revPU: a.rev / mm, cmPU: cm, ltv: cm / ch, cac: s.cac[y], blended: a.oMkt / (a.newPaid + a.newOrganic), mkt: a.oMkt, paid: a.newPaid, org: a.newOrganic,
    mauEnd: a.mauEnd, subsEnd: a.subsEnd, corpEnd: a.corpClientsEnd, seatsEnd: a.seatsEnd, rCorp: a.rCorp, corpSales: a.oCorpSales, rev: a.rev, rx: a.rxCases, rxDayEnd: a.rxPerDayEnd }; });
const out = { months: rows.slice(0, 18).map(pick), ue, s: { cac: s.cac, organic: s.organic, churn: s.churn, mktBudget: s.mktBudget, corpCac: s.corpCacClient, corpCommission: s.corpCommission,
  gift: s.giftUnits, corpClients: s.corpClients, corpEmployees: s.corpEmployees, enrol: s.corpEnrolVol, hr: s.hrPartners, corpDiscount: s.corpDiscount, rxRate: s.rxRate, rxConvLift: s.rxConvLift, insurers: s.insurers } };
const lev = (name, f) => { const x = E.scenario('base'); f(x); const r = E.run(x); return { name, mau13: r[13].mau, subs13: r[13].subs, mau11: r[11].mau, cash13: r[13].cash }; };
out.levers = [lev('base', x => {}), lev('cac', x => { x.cacMult = 102 / 120; }), lev('churn', x => { x.churnMult = 10 / 12; }), lev('organic', x => { x.organicMult = 16 / 14; }), lev('conv', x => { x.convMult = 1.2; }),
  lev('cacBad', x => { x.cacMult = 1.4; })];
process.stdout.write(JSON.stringify(out));
