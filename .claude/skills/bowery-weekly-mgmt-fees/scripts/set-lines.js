#!/usr/bin/env node
// Emit the eval function that sets all 20 lines of a Management Fees entry from fees.json.
//
//   set-lines.js fees.json > set.js
//   playwright-cli -s=$S eval "$(cat set.js)"
//
// The emitted code holds no backslashes, which Windows argv rewrites.
const fees = require(require('path').resolve(process.argv[2]));
const map = Object.fromEntries(fees.stores.map(s => [s.store, s.fee]));
process.stdout.write(`() => {
const fee = ${JSON.stringify(map)};
const apo = s => String(s || '').split(String.fromCharCode(8217)).join("'");
const locName = s => apo(s).split(' - ').slice(1).join(' - ');
const byComment = c => Object.keys(fee).find(k => apo(c) === k || apo(c).startsWith(k + ' '));
const g = jQuery('[data-role=grid]').data('kendoGrid');
const rows = Array.prototype.slice.call(g.dataSource.data());
const plan = [], seen = {};
for (const m of rows) {
  const a = String(m.glAccount || ''), loc = locName(m.location), bowery = /^800 /.test(String(m.location));
  let store, side, comment;
  if (/^660-00 /.test(a)) { store = loc; side = 'debit'; comment = store; }
  else if (/^402-00 /.test(a) && bowery) { store = byComment(m.comment); side = 'credit'; comment = store; }
  else if (/^100-20 /.test(a) && bowery) { store = byComment(m.comment); side = 'debit'; comment = store + ' -> Bowery Transfer'; }
  else if (/^100-/.test(a) && !bowery) { store = loc; side = 'credit'; comment = store + ' -> Bowery Transfer'; }
  if (!store || !(store in fee)) return 'STOP: unmatched line ' + a + ' | ' + m.location + ' | ' + m.comment;
  seen[store] = (seen[store] || 0) + 1;
  plan.push([m, side, fee[store], comment]);
}
const bad = Object.keys(fee).filter(k => seen[k] !== 4);
if (rows.length !== 20 || bad.length) return 'STOP: ' + rows.length + ' lines; stores without 4 lines: ' + bad.join(', ');
for (const [m, side, amt, comment] of plan) {
  m.set(side, amt); m.set(side === 'debit' ? 'credit' : 'debit', 0); m.set('comment', comment);
}
const dr = rows.reduce((t, m) => t + (+m.debit || 0), 0), cr = rows.reduce((t, m) => t + (+m.credit || 0), 0);
return 'set 20 lines, debits ' + dr.toFixed(2) + ' credits ' + cr.toFixed(2);
}`);
