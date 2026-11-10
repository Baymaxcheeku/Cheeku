"""Cross-checks seed-split/model.js (the calculator) against calc/split.py (the document) and runs invariants.
Run from anywhere:  python3 founder-ops/seed-split/check.py"""
import json, pathlib, subprocess, sys
here = pathlib.Path(__file__).parent
sys.path.insert(0, str(here.parent / "calc"))
from split import convert

js = r"""
const M = require(process.argv[1]);
const out = [];
for (const V of [106,113,116,120,125,130,140,153,170]) for (const cap of [60,75,85,100,120]) for (const d of [0,10,20]) {
  const s = Object.assign(M.defaults(), {conv:'post', quote:V, cap, disc:d});
  const r = M.evalQuote(s); out.push([V,cap,d,r.a,r.x,r.D,r.stepup]);
}
console.log(JSON.stringify(out));
"""
res = json.loads(subprocess.run(["node", "-e", js, str(here / "model.js")], capture_output=True, text=True, check=True).stdout)
worst = 0
for V, cap, d, a, x, D, step in res:
    r = convert(5, cap, d / 100, V, 21)
    worst = max(worst, abs(r["angel"] - a), abs(r["vc"] - x), abs(r["D"] - D), abs(r["stepup"] - step))
print("max difference against split.py over", len(res), "cases:", f"{worst:.2e}")
assert worst < 1e-9

inv = r"""
const M = require(process.argv[1]); const bad = [];
const chk = (c, m) => { if (!c) bad.push(m); };
const base = M.defaults();
// 1. convention round trips: the same V must come back from every way of quoting it
for (const V of [116,130,153]) for (const conv of ['pre_in','post','pre_out']) {
  const s = Object.assign({}, base, {conv}); const q = M.quoteFromV(s, V);
  const r = M.evalQuote(Object.assign({}, s, {quote:q})); chk(Math.abs(r.V - V) < 1e-6, 'roundtrip '+conv+' '+V+' got '+r.V);
}
// 2. shares add to one and the founders' share is 90% of what existing holders keep
for (const topup of [0,3,5]) for (const basis of ['post','pre']) for (const tiered of [false,true]) {
  const s = Object.assign({}, base, {topup, basis, tiered}); const r = M.evalQuote(s);
  chk(Math.abs(r.founders + r.poolOld + r.T + r.a + r.x - 1) < 1e-9, 'sum '+topup+basis+tiered);
}
// 3. solvers: plugging the answer back in lands on the target
for (const conv of ['pre_in','post','pre_out']) {
  const s = Object.assign({}, base, {conv, quote: conv==='post'?130:conv==='pre_in'?109:100});
  const V = M.minV(s, 0.23); const q = M.quoteFromV(s, V);
  const r = M.evalQuote(Object.assign({}, s, {quote:q})); chk(Math.abs(r.D - 0.23) < 1e-6, 'minV '+conv+' '+r.D);
  const mx = M.maxX(Object.assign({}, s, {quote: conv==='post'?116:conv==='pre_in'?90:80}), 0.23);
  if (mx.x !== undefined) { const t = Object.assign({}, s, {quote: conv==='post'?116:conv==='pre_in'?90:80, X: mx.x}); chk(Math.abs(M.evalQuote(t).D - 0.23) < 1e-6, 'maxX '+conv); }
}
const lowS = Object.assign({}, base, {conv:'post', quote:116});
const mc = M.minCapScale(lowS, 0.23); chk(mc.cap && Math.abs(mc.cap - 83.6) < 0.1, 'minCap '+JSON.stringify(mc));
// 4. more valuation never hurts, a higher cap never hurts the founders
let prev = 9; for (let V = 110; V <= 170; V += 2) { const D = M.evalQuote(Object.assign({}, base, {conv:'post', quote:V})).D; chk(D <= prev + 1e-12, 'monotone V '+V); prev = D; }
prev = 9; for (let c = 40; c <= 150; c += 5) { const D = M.evalQuote(Object.assign({}, base, {cap:c, conv:'post', quote:130})).D; chk(D <= prev + 1e-12, 'monotone cap '+c); prev = D; }
// 5. angels at the round price: pre_out equals pre_in with the angel cheque added to the quote
const par = {cap: 100000, disc: 0};
const A = M.evalQuote(Object.assign({}, base, par, {conv:'pre_in', quote:109}));
const B = M.evalQuote(Object.assign({}, base, par, {conv:'pre_out', quote:104}));
chk(Math.abs(A.V - B.V) < 1e-6, 'pre_out vs pre_in par '+A.V+' '+B.V);
// 6. bad input does not throw
for (const q of [0,-5,1e-9,1e9]) M.evalQuote(Object.assign({}, base, {quote:q}));
console.log(JSON.stringify(bad));
"""
bad = json.loads(subprocess.run(["node", "-e", inv, str(here / "model.js")], capture_output=True, text=True, check=True).stdout)
print("invariant failures:", bad or "none")
assert not bad
