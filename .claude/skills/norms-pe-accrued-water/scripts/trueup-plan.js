// True-up lines: move each store's accrual balance at period end to its target (unbilled usage through PE).
// Usage: [UTIL=electric] node trueup-plan.js <rowsAccrual.json> <PE M/D/YYYY> <targets.json> > lines.json
//   targets.json: {"217 - Anaheim": {"tgt": 720.58, "basis": "9/23 bills 8/19-9/21 prorated"}, ...}
// Short store: Dr expense / Cr accrual. Over-accrued store: Dr accrual / Cr expense. Support Center uses the corp expense account. Table goes to stderr.
const fs = require("fs");
const P = require("./profile.js");
const [f85, pe, ft] = process.argv.slice(2);
const r2 = x => Math.round(x * 100) / 100;
const dv = s => { const [m, d, y] = s.split("/").map(Number); return y * 10000 + m * 100 + d; };
const R = JSON.parse(fs.readFileSync(f85)), T = JSON.parse(fs.readFileSync(ft));
const lines = [];
let sdr = 0, scr = 0;
for (const store of Object.keys(T)) {
  const name = store.replace(/^\d+ - /, "");
  const bal = r2(R.filter(r => r.loc === name && dv(r.dt) <= dv(pe)).reduce((s, r) => s + r.cr - r.dr, 0));
  const adj = r2(T[store].tgt - bal);
  console.error(name.padEnd(21), "bal " + bal.toFixed(2).padStart(10), "target " + T[store].tgt.toFixed(2).padStart(9), "adj " + adj.toFixed(2).padStart(9), " ", T[store].basis || "");
  if (!adj) continue;
  const a = Math.abs(adj);
  lines.push({ acct: /Support Center/.test(store) ? P.corp : P.exp, loc: store, dr: adj > 0 ? a : 0, cr: adj > 0 ? 0 : a });
  lines.push({ acct: P.acc, loc: store, dr: adj > 0 ? 0 : a, cr: adj > 0 ? a : 0 });
  sdr += a; scr += a;
}
console.error("total", r2(sdr).toFixed(2), "lines", lines.length);
process.stdout.write(JSON.stringify(lines));
