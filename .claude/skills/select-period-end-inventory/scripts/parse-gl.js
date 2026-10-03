#!/usr/bin/env node
// Turn the GL Account Detail cells into BEG / entry lines / END.
const fs = require('fs');
const n = s => Number(String(s).replace(/,/g, '').replace(/^\((.*)\)$/, '-$1'));
const c = fs.readFileSync(process.argv[2], 'utf8').split(/\r?\n/).filter(Boolean);
const b = c.indexOf('Beg Balance:'), t = c.findIndex(x => /^Total Inventory-Food$/.test(x));
if (b < 0 || t < 0) { console.log('STOP: no Beg Balance or Total row'); process.exit(1); }
console.log('BEG ' + c[b + 1]);
// detail rows: date, type, ref, location, debit, credit, balance (comment cell may be absent)
const mid = c.slice(b + 2, t);
for (let i = 0; i < mid.length; i++) if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(mid[i])) {
  const j = mid.slice(i + 1).findIndex(x => /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(x));
  const row = j < 0 ? mid.slice(i) : mid.slice(i, i + 1 + j);
  const [dr, cr, bal] = row.slice(-3);
  console.log(row.slice(0, -3).join(' | ') + ' | dr ' + dr + ' | cr ' + cr + ' | bal ' + bal);
}
console.log('END ' + c[t + 3] + '  (activity dr ' + c[t + 1] + ' cr ' + c[t + 2] + ')');
console.log(JSON.stringify({ beg: n(c[b + 1]), end: n(c[t + 3]) }));
