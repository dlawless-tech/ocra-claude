// GL Account Detail cells (one per line, from the report's snapshot) -> {location: {beg, D, C, end, jeD, jeCr, deps}}
// usage: node glparse.js <cells.txt> <out.json>
const fs = require('fs');
const c = fs.readFileSync(process.argv[2], 'utf8').split(/\r?\n/);
const n = s => +String(s).replace(/,/g, '');
const out = {}; let cur = null;
for (let i = 0; i < c.length; i++) {
  if (c[i + 1] === '1112 - A/R Uber Postmates' && c[i + 2] === 'Beg Balance:') { cur = {beg: n(c[i + 3]), jeD: 0, jeCr: 0, deps: []}; out[c[i]] = cur; i += 3; continue; }
  if (!cur) continue;
  // row: date, type, location, comment, debit, credit, balance
  if (/^\d+\/\d+\/\d{4}$/.test(c[i])) {
    const t = c[i + 1], dr = n(c[i + 4]), cr = n(c[i + 5]);
    if (t === 'Journal Entry') { cur.jeD += dr; cur.jeCr += cr; } else if (t === 'Bank Deposit') cur.deps.push({date: c[i], cr});
  }
  if (c[i] === 'Total A/R Uber Postmates') { cur.D = n(c[i + 1]); cur.C = n(c[i + 2]); cur.end = n(c[i + 3]); cur = null; }
}
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
let td = 0;
for (const k in out) { const o = out[k]; td += o.D; console.log(k.padEnd(17), 'beg', o.beg.toFixed(2).padStart(9), 'D', o.D.toFixed(2).padStart(9), 'jeCr', o.jeCr.toFixed(2).padStart(8), 'C', o.C.toFixed(2).padStart(9), o.deps.map(d => d.date + ' ' + d.cr).join('; ')); }
const g = c.indexOf('Grand Total');
console.log(Object.keys(out).length + ' locations, D ' + td.toFixed(2) + (g > 0 ? ', Grand Total D ' + c[g + 1] : ''));
