#!/usr/bin/env node
// Emit the eval function that sets one store's open Inventory entry to its lines.json amounts.
//
//   set-lines.js lines.json <store> > set.js
//   playwright-cli -s=$S eval "$(cat set.js)"
//
// Lines key by GL; a gain debits 190 and credits 510. Clears comments. Changes nothing unless
// the entry holds exactly one line per GL. No backslashes: Windows argv rewrites them.
const fs = require('fs');
const x = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).stores[process.argv[3]];
if (!x) { console.error('STOP: no store ' + process.argv[3]); process.exit(1); }
process.stdout.write(`() => {
const want = ${JSON.stringify(x.lines)};
const g = jQuery('[data-role=grid]').data('kendoGrid');
const rows = Array.prototype.slice.call(g.dataSource.data());
const gl = m => String(m.glAccount || '').trim();
const miss = Object.keys(want).filter(k => rows.filter(m => gl(m) === k).length !== 1);
if (rows.length !== 8 || miss.length) return 'STOP: ' + rows.length + ' lines, unmatched ' + miss.join(', ');
for (const m of rows) { const d = want[gl(m)]; m.set('debit', d > 0 ? d : 0); m.set('credit', d < 0 ? -d : 0); m.set('comment', ''); }
const dr = rows.reduce((s, m) => s + (+m.debit || 0), 0), cr = rows.reduce((s, m) => s + (+m.credit || 0), 0);
return 'set ' + rows.length + ' lines, debits ' + dr.toFixed(2) + ' credits ' + cr.toFixed(2);
}`);
