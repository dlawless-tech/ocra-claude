// One-time reclass: move a lump parked on one location (Support Center) out to the stores, so each
// location's accrual balance at <date> equals its target (unbilled usage through the prior PE).
// Usage: [UTIL=electric] node reclass-plan.js <rowsAccrual.json> <date M/D/YYYY> <targets.json> [from location] [spread] > lines.json
//   balances include every row dated on or before <date>; targets.json as for trueup-plan.js, every location listed.
// Accrual lines alone rarely balance: the gap goes to store expense pro rata to each store's move.
// spread: no expense lines; the release from <from> is shared out pro rata to each store's move instead.
const fs = require("fs");
const P = require("./profile.js");
const [fA, dt, ft, from = "299 - Norms Support Center", mode = ""] = process.argv.slice(2);
const r2 = x => Math.round(x * 100) / 100;
const dv = s => { const [m, d, y] = s.split("/").map(Number); return y * 10000 + m * 100 + d; };
const R = JSON.parse(fs.readFileSync(fA)), T = JSON.parse(fs.readFileSync(ft));
const bal = s => r2(R.filter(r => r.loc === s.replace(/^\d+ - /, "") && dv(r.dt) <= dv(dt)).reduce((t, r) => t + r.cr - r.dr, 0));
const missing = [...new Set(R.map(r => r.loc))].filter(l => !Object.keys(T).some(k => k.endsWith(" - " + l)));
if (missing.length) { console.error("no target for", missing.join(", ")); process.exit(1); }
const mv = {};
for (const s of Object.keys(T)) mv[s] = r2(T[s].tgt - bal(s));
let gap = r2(Object.values(mv).reduce((t, x) => t + x, 0));
if (mode === "spread") {
  const ss = Object.keys(T).filter(s => s !== from && mv[s] > 0), need = ss.reduce((t, s) => t + mv[s], 0), rel = -mv[from];
  let left = rel;
  for (const s of Object.keys(T)) if (s !== from && !ss.includes(s)) mv[s] = 0;
  ss.forEach((s, i) => { mv[s] = i === ss.length - 1 ? r2(left) : r2(rel * mv[s] / need); left = r2(left - mv[s]); });
  gap = 0;
}
const stores = Object.keys(T).filter(s => s !== from && mv[s] > 0), base = stores.reduce((t, s) => t + mv[s], 0);
const exp = {}; let left = gap;
stores.forEach((s, i) => { exp[s] = i === stores.length - 1 ? r2(left) : r2(gap * mv[s] / base); left = r2(left - exp[s]); });
const lines = [];
const push = (acct, loc, amt) => { if (r2(amt)) lines.push({ acct, loc, dr: amt < 0 ? r2(-amt) : 0, cr: amt > 0 ? r2(amt) : 0 }); };
for (const s of Object.keys(T)) {
  push(P.acc, s, mv[s]);
  if (exp[s]) push(P.exp, s, -exp[s]);
  console.error(s.padEnd(28), "bal " + bal(s).toFixed(2).padStart(11), "target " + T[s].tgt.toFixed(2).padStart(10), "move " + mv[s].toFixed(2).padStart(11), exp[s] ? "expense " + exp[s].toFixed(2) : "", " ", T[s].basis || "");
}
const dr = r2(lines.reduce((t, l) => t + l.dr, 0)), cr = r2(lines.reduce((t, l) => t + l.cr, 0));
console.error("gap to expense", gap.toFixed(2), "dr", dr.toFixed(2), "cr", cr.toFixed(2), "lines", lines.length);
process.stdout.write(JSON.stringify(lines));
