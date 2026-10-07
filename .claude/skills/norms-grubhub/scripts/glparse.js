// GL Account Detail cells (one per line, from the report's snapshot) -> {location: {beg, D, C, end, deps}}
// usage: node glparse.js <cells.txt> <out.json>
const fs = require('fs');
const c = fs.readFileSync(process.argv[2], 'utf8').split(/\r?\n/);
const n = s => +String(s).replace(/,/g, '');
const out = {}; let cur = null;
for (let i = 0; i < c.length; i++) {
  if (c[i + 1] === '1113 - A/R Grubhub' && c[i + 2] === 'Beg Balance:') { cur = {beg: n(c[i + 3]), deps: []}; out[c[i]] = cur; i += 3; continue; }
  if (!cur) continue;
  if (c[i] === 'Bank Deposit') cur.deps.push({date: c[i - 1], sid: (c[i + 2].match(/\d{8}\S+/) || ['?'])[0], cr: n(c[i + 4])});
  if (c[i] === 'Total A/R Grubhub') { cur.D = n(c[i + 1]); cur.C = n(c[i + 2]); cur.end = n(c[i + 3]); cur = null; }
}
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
for (const k in out) { const o = out[k]; console.log(k.padEnd(17), 'beg', o.beg.toFixed(2).padStart(8), 'D', o.D.toFixed(2).padStart(8), 'C', o.C.toFixed(2).padStart(8), 'end', o.end.toFixed(2).padStart(8), o.deps.map(d => d.date + ' ' + d.sid + ' ' + d.cr).join(' ; ')); }
console.log(Object.keys(out).length + ' locations');
