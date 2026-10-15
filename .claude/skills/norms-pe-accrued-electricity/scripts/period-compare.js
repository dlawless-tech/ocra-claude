// Net expense per period by location (5630 stores, 6330 Support Center), the period closing vs the three before.
// Usage: node period-compare.js <rows5630.json> <rows6330.json> <first day of oldest period M/D/YYYY> > compare.json
// Periods run 28 days. Table to stderr: P1..P4, prior-three average, closing period less that average.
const fs = require("fs");
const [fE, fC, start] = process.argv.slice(2);
const D = s => { const [m, d, y] = s.split("/").map(Number); return Date.UTC(y, m - 1, d) / 864e5; };
const s0 = D(start), per = r => Math.floor((D(r.dt) - s0) / 28);
const rows = [...JSON.parse(fs.readFileSync(fE)), ...JSON.parse(fs.readFileSync(fC))].filter(r => r.type !== "Beg Balance");
const out = {};
for (const l of [...new Set(rows.map(r => r.loc))].sort()) {
  const v = [0, 0, 0, 0];
  for (const r of rows) if (r.loc === l) { const p = per(r); if (p >= 0 && p < 4) v[p] += r.dr - r.cr; }
  const avg = (v[0] + v[1] + v[2]) / 3;
  out[l] = { v: v.map(x => Math.round(x * 100) / 100), avg: Math.round(avg * 100) / 100, diff: Math.round((v[3] - avg) * 100) / 100 };
  console.error(l.padEnd(21), ...v.map(x => x.toFixed(0).padStart(9)), avg.toFixed(0).padStart(9), (v[3] - avg).toFixed(0).padStart(9));
}
process.stdout.write(JSON.stringify(out));
