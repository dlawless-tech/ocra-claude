#!/usr/bin/env node
// Emit the eval function that loads one store's lines into its duplicated Weekly Log entry.
//
//   set-lines.js lines.json "<store>" > set.js
//   playwright-cli -s=$S eval "$(cat set.js)"
//
// A line already on the entry (same side and GL) takes the week's amount and comment. A line the
// entry lacks, or one the week lacks, returns ADD / REMOVE and changes nothing. No backslashes: Windows argv rewrites them.
const x = require(require('path').resolve(process.argv[2]));
const s = x.stores.find(v => v.store === process.argv[3]);
if (!s) { console.error(`no store "${process.argv[3]}" in ${process.argv[2]}`); process.exit(1); }
process.stdout.write(`() => {
const want = ${JSON.stringify(s.lines)};
const loc = ${JSON.stringify(s.loc)};
const apo = v => String(v || '').split(String.fromCharCode(8217)).join("'");
const key = (side, gl, c) => side + ' | ' + apo(gl) + ' | ' + (c || '');
const g = jQuery('[data-role=grid]').data('kendoGrid');
const rows = Array.prototype.slice.call(g.dataSource.data());
const have = {};
for (const m of rows) {
  if (apo(m.location) !== loc) return 'STOP: line ' + m.glAccount + ' at ' + m.location + ', expected ' + loc;
  const side = +m.credit ? 'credit' : +m.debit ? 'debit' : null;
  if (!side) return 'STOP: zero line ' + m.glAccount;
  const k = key(side, m.glAccount, m.comment);
  if (have[k]) return 'STOP: two lines on ' + k;
  have[k] = m;
}
const msg = [];
for (const w of want) if (!have[key(w.side, w.gl, w.comment)]) msg.push('ADD ' + w.side + ' ' + w.amount.toFixed(2) + ' ' + w.gl + ' comment "' + w.comment + '"');
for (const k of Object.keys(have)) if (!want.some(w => key(w.side, w.gl, w.comment) === k)) msg.push('REMOVE ' + k);
if (msg.length) return msg.join(' ; ');
for (const w of want) {
  const m = have[key(w.side, w.gl, w.comment)];
  m.set(w.side, w.amount); m.set(w.side === 'credit' ? 'debit' : 'credit', 0); m.set('comment', w.comment);
}
const dr = rows.reduce((t, m) => t + (+m.debit || 0), 0), cr = rows.reduce((t, m) => t + (+m.credit || 0), 0);
return 'set ' + rows.length + ' lines, debits ' + dr.toFixed(2) + ' credits ' + cr.toFixed(2);
}`);
