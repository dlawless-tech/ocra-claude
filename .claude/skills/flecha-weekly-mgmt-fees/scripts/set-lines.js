// usage: node set-lines.js fees.json > set.js
// Emits an eval script that sets the 8 MGMT Fees lines through the line grid's Kendo model.
const fs = require('fs');
const { stores } = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const fee = Object.fromEntries(stores.map(s => [s.location, s.fee]));

process.stdout.write(`() => {
  const fee = ${JSON.stringify(fee)};
  const g = jQuery('[data-role=grid]').data('kendoGrid');
  if (!g) return 'ERR no grid';
  const d = g.dataSource.data();
  if (d.length !== 8) return 'ERR lines ' + d.length;
  for (let i = 0; i < 8; i += 2) {
    const s = d[i], c = d[i + 1];
    const a = fee[s.location];
    if (a === undefined || c.location !== '100 - Corporate' || !/^7588 /.test(s.glAccount) || !/^7588 /.test(c.glAccount)) return 'ERR shape at line ' + i;
    s.set('debit', a); s.set('credit', 0);
    c.set('credit', a); c.set('debit', 0);
  }
  return JSON.stringify(g.dataSource.data().map(m => [m.location, m.debit, m.credit]));
}`);
