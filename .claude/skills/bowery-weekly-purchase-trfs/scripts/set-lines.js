#!/usr/bin/env node
// Emit the eval function that loads lines.json into a duplicated Purchase Transfers entry.
//
//   set-lines.js lines.json > set.js
//   playwright-cli -s=$S eval "$(cat set.js)"
//
// A line already on the entry (same side, GL, location) takes the week's amount. A line the
// entry lacks, or one the week lacks, returns ADD / REMOVE and changes nothing. No backslashes: Windows argv rewrites them.
const x = require(require('path').resolve(process.argv[2]));
process.stdout.write(`() => {
const want = ${JSON.stringify(x.lines)};
const apo = s => String(s || '').split(String.fromCharCode(8217)).join("'");
const key = (side, gl, loc) => [side, apo(gl), apo(loc)].join(' | ');
const g = jQuery('[data-role=grid]').data('kendoGrid');
const rows = Array.prototype.slice.call(g.dataSource.data());
const have = {};
for (const m of rows) {
  const side = +m.credit ? 'credit' : +m.debit ? 'debit' : null;
  if (!side) return 'STOP: zero line ' + m.glAccount + ' | ' + m.location;
  const k = key(side, m.glAccount, m.location);
  if (have[k]) return 'STOP: two lines on ' + k;
  have[k] = m;
}
const msg = [];
for (const w of want) if (!have[key(w.side, w.gl, w.loc)]) msg.push('ADD ' + w.side + ' ' + w.amount.toFixed(2) + ' ' + w.gl + ' @ ' + w.loc);
for (const k of Object.keys(have)) if (!want.some(w => key(w.side, w.gl, w.loc) === k)) msg.push('REMOVE ' + k);
if (msg.length) return msg.join(' ; ');
for (const w of want) {
  const m = have[key(w.side, w.gl, w.loc)];
  m.set(w.side, w.amount); m.set(w.side === 'credit' ? 'debit' : 'credit', 0); m.set('comment', '');
}
const dr = rows.reduce((s, m) => s + (+m.debit || 0), 0), cr = rows.reduce((s, m) => s + (+m.credit || 0), 0);
return 'set ' + rows.length + ' lines, debits ' + dr.toFixed(2) + ' credits ' + cr.toFixed(2);
}`);
