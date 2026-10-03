#!/usr/bin/env node
// Book the change from the 1210 balance to the period-end count.
//   build-lines.js count.json <1210 balance before the entry> <M/D/YYYY period end> > lines.json
const fs = require('fs');
const stop = m => { console.error('STOP: ' + m); process.exit(1); };
const r2 = x => Math.round(x * 100) / 100;
const [cf, balArg, date] = process.argv.slice(2);
if (!cf || !balArg || !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(date || '')) stop('usage: build-lines.js count.json <balance> <M/D/YYYY>');
const count = JSON.parse(fs.readFileSync(cf, 'utf8'));
const bal = Number(String(balArg).replace(/,/g, ''));
if (!isFinite(bal)) stop('balance is not a number: ' + balArg);
const chg = r2(count.total - bal);
if (chg === 0) stop('count equals the book balance; nothing to post');
const yy = date.slice(-2);
const INV = '1210 - Inventory-Food', COST = '5180 - Select Inventory - Food Non Taxable Cost', LOC = '370 - Select Industries';
const amt = Math.abs(chg);
const lines = chg > 0
  ? [{ a: INV, dr: amt, cr: 0, loc: LOC }, { a: COST, dr: 0, cr: amt, loc: LOC }]
  : [{ a: COST, dr: amt, cr: 0, loc: LOC }, { a: INV, dr: 0, cr: amt, loc: LOC }];
console.log(JSON.stringify({
  date, number: `Select Inventory P${count.period}'${yy}`, location: LOC,
  count: count.total, balance: bal, change: chg, total: amt, lines,
}, null, 1));
