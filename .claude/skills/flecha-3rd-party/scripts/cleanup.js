#!/usr/bin/env node
// Propose the one-time cleanup: move each store's 1235/1237/1238 balance above the sales still awaiting payout, net of fee, to 1210.
// usage: cleanup.js <as-of Sunday M/D/YYYY> <entry date M/D/YYYY>
// Reads loc1235.txt loc1237.txt loc1238.txt (gl.sh with BYLOC=1, from the entry date through the as-of Sunday,
// after that Sunday's estimate is posted). Writes cleanup.json.
// Open window: Uber Eats and EZ Cater pay weekly, so 1 week of sales; Foodja pays every other week, so 2.
const fs = require('fs');
const { rows, begBalances, day } = require('./gl-rows.js');
const build = require('./build.js');
const ids = require('./ids.js');
const RATE = +(process.env.RATE || 0.30), WEEKS = { 1235: 1, 1237: 1, 1238: 2 };
const money = n => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const r2 = n => Math.round(n * 100) / 100;
const [asOf, entryDate] = process.argv.slice(2), end = day(asOf);
const fees = [];
for (const [a, acct] of Object.entries(ids.accounts)) {
  const beg = begBalances(`loc${a}.txt`), r = rows(`loc${a}.txt`).filter(x => day(x.date) <= end);
  const from = new Date(end); from.setDate(from.getDate() - 7 * WEEKS[a] + 1);
  const span = `${from.getMonth() + 1}/${from.getDate()}-${end.getMonth() + 1}/${end.getDate()}`;
  console.log(`\n${acct.gl}  (open: sales ${span} x ${((1 - RATE) * 100).toFixed(0)}%)`);
  for (const store of Object.keys(ids.stores)) {
    const mine = r.filter(x => x.loc === store);
    const bal = r2((beg[store] || 0) + mine.reduce((t, x) => t + x.dr - x.cr, 0));
    const open = r2(mine.filter(x => x.kind === 'sales' && day(x.date) >= from).reduce((t, x) => t + x.dr - x.cr, 0) * (1 - RATE));
    const fix = r2(bal - open);
    if (!bal && !open) continue;
    console.log(`  ${store.padEnd(20)} balance ${money(bal).padStart(10)}  open ${money(open).padStart(9)}  cleanup ${money(fix).padStart(10)}`);
    fees.push({ store, acct: a, fee: fix, comment: `${acct.label} cleanup: ${asOf} balance ${money(bal)} less open sales ${span} net of fee ${money(open)}` });
  }
}
const e = build(entryDate, '3rd Party Cleanup', `3rd Party cleanup: ${asOf} receivable balances to open sales net of fee`, fees, `3rd Party cleanup to ${asOf} open sales, reclass to A/R`, ids.receivable);
const net = r2(fees.reduce((t, f) => t + f.fee, 0));
console.log(`\nnet to 1210 ${money(net)}  (${e.lines.length} lines)`);
fs.writeFileSync('cleanup.json', JSON.stringify(e, null, 1));
