/* Seed split model. Pure functions, no DOM. Money is in rupees crore.
   Angels hold an iSAFE (cap and discount) that converts inside the institutional round.
   The institutional round is described by its post-money V, the value of the company right after the whole seed,
   angels included. Everything else (pre-money in any of three conventions, price per share) is derived from V. */
(function (root) {
  var S0 = 1000000; // illustrative share count before the seed

  function defaults() {
    return {
      scen: 'base',            // 'weak' | 'bear' | 'base' | 'bull' | 'custom'
      conv: 'pre_in',          // how the institution quotes: pre_in | post | pre_out
      quote: 109,              // the institution's number, rupees crore, in the convention above
      I: 5, X: 21, lock: true, // angel cheque, institutional cheque, keep the total at 26
      cap: 85, basis: 'post',  // iSAFE valuation cap and whether it is post-money or pre-money
      disc: 10,                // discount, percent
      tiered: false, t1amt: 2, t1cap: 80,
      fPre: 90,                // founders' share before the seed, percent (rest is the option pool)
      topup: 0, countTopup: true, // pool top-up the institution asks for, points of post-money
      ceil: 23, bandLo: 18, bandHi: 20
    };
  }

  function tranches(s) {
    if (!s.tiered) return [{ amt: s.I, cap: s.cap }];
    var a1 = Math.min(Math.max(s.t1amt, 0), s.I), out = [];
    if (a1 > 1e-9) out.push({ amt: a1, cap: s.t1cap });
    if (s.I - a1 > 1e-9) out.push({ amt: s.I - a1, cap: s.cap });
    return out;
  }

  // scale multiplies every cap, used by the solver and the cap axis of the grid
  function evalV(s, V, scale) {
    scale = scale || 1;
    var X = s.X, x = X / V, T = s.topup / 100, d = s.disc / 100, tr = tranches(s);
    var room = 1 - x - T;
    if (!(V > 0) || room <= 1e-9) return { invalid: true, D: Infinity };
    var aSum = 0, parts = [];
    for (var it = 0; it < 80; it++) {
      var next = 0; parts = [];
      for (var i = 0; i < tr.length; i++) {
        var t = tr[i], c = t.cap * scale;
        var base = s.basis === 'pre' ? (room - aSum) : room;       // pre-money cap converts on the shares before the SAFEs
        var viaCap = (t.amt / c) * Math.max(base, 0);
        var viaDisc = d > 0 ? t.amt / ((1 - d) * V) : 0;
        var atPar = t.amt / V;
        var a = Math.max(viaCap, viaDisc, atPar);
        var path = a === viaCap && viaCap >= viaDisc && viaCap > atPar + 1e-12 ? 'cap' : (viaDisc > atPar + 1e-12 && a === viaDisc ? 'discount' : 'round');
        parts.push({ amt: t.amt, cap: c, a: a, path: path });
        next += a;
      }
      if (Math.abs(next - aSum) < 1e-13) { aSum = next; break; }
      aSum = next;
    }
    var existing = 1 - x - T - aSum;
    if (existing <= 1e-9) return { invalid: true, D: Infinity };
    var f = s.fPre / 100;
    var D = x + aSum + (s.countTopup ? T : 0);
    var par = (s.I + X) / V + (s.countTopup ? T : 0);
    var N = S0 / existing;               // total shares after the seed
    var pps = V * 1e7 / N;               // institutional price per share, rupees
    parts.forEach(function (p) { p.price = p.a > 0 ? p.amt * 1e7 / (p.a * N) : 0; });
    return {
      V: V, X: X, I: s.I, preIn: V - X, preOut: V * (existing + T),
      x: x, a: aSum, T: T, existing: existing,
      founders: f * existing, poolOld: (1 - f) * existing,
      D: D, Dfull: x + aSum + T, par: par, tax: D - par,
      stepup: s.I > 0 ? aSum * V / s.I : 1,
      N: N, pps: pps, parts: parts, invalid: false
    };
  }

  function solveV(s, quote, scale) {
    if (s.conv === 'post') return quote;
    if (s.conv === 'pre_in') return quote + s.X;
    // pre_out: the quote excludes the angels' converted shares, so find V where V x (1 - x - a) equals it
    var lo = quote + s.X, hi = lo + 10, g = function (V) { var r = evalV(s, V, scale); return r.invalid ? -Infinity : r.preOut; };
    var n = 0; while (g(hi) < quote && n++ < 60) hi = lo + (hi - lo) * 2;
    for (var i = 0; i < 90; i++) { var mid = (lo + hi) / 2; if (g(mid) < quote) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }

  function evalQuote(s, scale) {
    if (!(s.quote > 0)) return { invalid: true, D: Infinity };
    var V = solveV(s, s.quote, scale);
    var r = evalV(s, V, scale); r.quote = s.quote; return r;
  }

  function quoteFromV(s, V) {
    if (s.conv === 'post') return V;
    if (s.conv === 'pre_in') return V - s.X;
    var r = evalV(s, V); return r.invalid ? V - s.X : r.preOut;
  }

  // ---- solvers: every one bisects a monotone function, so each answer can be checked by plugging it back in
  function minV(s, target, scale) {
    var lo = s.X * 1.0001 + 1e-6, hi = 20000;
    var D = function (V) { return evalV(s, V, scale).D; };
    if (!(D(hi) <= target)) return null;
    for (var i = 0; i < 100; i++) { var m = (lo + hi) / 2; if (D(m) <= target) hi = m; else lo = m; }
    return hi;
  }
  function maxX(s, target) {
    var D = function (X) { var t = Object.assign({}, s, { X: X }); return evalQuote(t).D; };
    if (!(D(0) <= target)) return { none: true };
    if (D(150) <= target) return { any: true };
    var lo = 0, hi = 150;
    for (var i = 0; i < 100; i++) { var m = (lo + hi) / 2; if (D(m) <= target) lo = m; else hi = m; }
    return { x: lo };
  }
  function minCapScale(s, target) {
    var D = function (k) { return evalQuote(s, k).D; };
    if (D(0.1) <= target) return { any: true };
    if (!(D(40) <= target)) return { none: true };
    var lo = 0.1, hi = 40;
    for (var i = 0; i < 100; i++) { var m = (lo + hi) / 2; if (D(m) <= target) hi = m; else lo = m; }
    return { k: hi, cap: s.cap * hi };
  }

  function status(s, D) {
    var c = s.ceil / 100, lo = s.bandLo / 100, hi = s.bandHi / 100;
    if (D > c + 1e-9) return { key: 'over', label: 'Over the ' + s.ceil + '% ceiling' };
    if (D <= hi + 1e-9) return { key: 'good', label: D < lo - 1e-9 ? 'Better than the target band' : 'Inside the ' + s.bandLo + ' to ' + s.bandHi + '% band' };
    return { key: 'ok', label: 'Inside the ceiling, above the band' };
  }

  var api = { S0: S0, defaults: defaults, tranches: tranches, evalV: evalV, evalQuote: evalQuote, solveV: solveV,
              quoteFromV: quoteFromV, minV: minV, maxX: maxX, minCapScale: minCapScale, status: status };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SplitModel = api;
})(typeof window !== 'undefined' ? window : globalThis);
