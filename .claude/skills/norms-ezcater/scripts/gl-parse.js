#!/usr/bin/env node
// GL Account Detail cells (one per line, from the a11y snapshot) -> per-location rows.
// Works grouped (Subtotal By Location) or ungrouped: each row's location cell decides.
// usage: gl-parse.js cells.txt > gl.json
// out: {loc: {beg, rows:[{date, type, debit, credit, memo}]}}; beg only when grouped
const fs = require('fs');
const c = fs.readFileSync(process.argv[2], 'utf8').split(/\r?\n/);
const num = s => /^-?[\d,]+\.\d\d$/.test(s) ? parseFloat(s.replace(/,/g, '')) : null;
const isDate = s => /^\d{1,2}\/\d{1,2}\/20\d\d$/.test(s);
const out = {};
const at = loc => (out[loc] = out[loc] || { beg: null, rows: [] });
for (let i = 0; i < c.length; i++) {
  if (c[i + 1] && /^\d{4} - /.test(c[i + 1]) && c[i + 2] === 'Beg Balance:' && !/^\d{4} - /.test(c[i])) {
    at(c[i]).beg = num(c[i + 3]); i += 3; continue;
  }
  if (!isDate(c[i])) continue;
  // date, type, location, memo..., debit, credit, balance
  let j = i + 2; const txt = [];
  while (j < c.length && num(c[j]) === null) txt.push(c[j++]);
  at(txt[0]).rows.push({ date: c[i], type: c[i + 1], debit: num(c[j]), credit: num(c[j + 1]), memo: txt.slice(1).join(' ') });
  i = j + 2;
}
console.log(JSON.stringify(out, null, 1));
