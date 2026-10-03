#!/usr/bin/env node
// Emit the eval that sets a duplicated VandyPay Fees entry to one month's adjustments total.
//   set-fees.js <amount> "<comment>" > set.js ; playwright-cli -s=$S eval "$(cat set.js)"
// Credit 104-07 A/R - Vandy Pay, debit 632-02 Delivery Fees with the comment. No backslashes: Windows argv.
const amt = +process.argv[2], comment = process.argv[3] || '';
if (!(amt > 0) || !comment) { console.error('usage: set-fees.js <positive amount> "<comment>"'); process.exit(1); }
process.stdout.write(`() => {
const g = jQuery('[data-role=grid]').data('kendoGrid');
const rows = Array.prototype.slice.call(g.dataSource.data());
if (rows.length !== 2) return 'STOP: ' + rows.length + ' lines, want 2';
const ar = rows.find(m => /^104-07 /.test(m.glAccount)), fee = rows.find(m => /^632-02 /.test(m.glAccount));
if (!ar || !fee) return 'STOP: lines are ' + rows.map(m => m.glAccount).join(', ');
ar.set('credit', ${amt}); ar.set('debit', 0);
fee.set('debit', ${amt}); fee.set('credit', 0); fee.set('comment', ${JSON.stringify(comment)});
return 'set 2 lines at ' + (${amt}).toFixed(2) + ' @ ' + rows.map(m => m.location).join(', ');
}`);
