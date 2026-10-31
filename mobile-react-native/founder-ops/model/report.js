// Prints the financial model's bear, base and bull cases from the same engine
// the vision board and the live model page use. Run: node founder-ops/model/report.js
const { scenario, run, metrics, capTable, CR } = require('../vision-board/engine.js');

const cr = v => (v / CR).toFixed(1);
const month = t => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][t % 12] + ' ' + (2027 + Math.floor(t / 12));

for (const sc of ['bear', 'base', 'bull']) {
  const s = scenario(sc), rows = run(s), m = metrics(s, rows);
  console.log(`\n${sc.toUpperCase()}: raised ₹${m.raised} cr, lowest cash ₹${cr(m.minCash)} cr in ${month(m.minAt)}, EBITDA positive from ${m.breakeven < 0 ? 'never' : month(m.breakeven)}`);
  console.log('Year | MAU Dec (lakh) | Paying | Revenue | Gross margin | EBITDA | Cash Dec | Team');
  for (const a of m.A) {
    console.log([a.year, (a.mauEnd / 1e5).toFixed(1), Math.round(a.subsEnd), cr(a.rev), Math.round(a.gp / a.rev * 100) + '%', cr(a.ebitda), cr(a.cashEnd), Math.round(a.hcEnd)].join(' | '));
  }
  if (sc === 'base') {
    for (const step of capTable(s)) {
      const own = Object.entries(step.own).map(([k, v]) => `${k} ${(v * 100).toFixed(1)}%`).join(', ');
      console.log(`Cap table, ${step.stage}${step.post ? ` (₹${step.post} cr post)` : ''}: ${own}`);
    }
  }
}
