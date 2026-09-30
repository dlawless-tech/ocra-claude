#!/usr/bin/env node
// Turn audits.json into each store's eight entry lines: the week's change in each GL's count.
//
//   build-lines.js audits.json [start.json] > lines.json
//
// start.json ({store: {Liquor, Wine, Beer, "N/A"}}) replaces the prior week's count, for a
// week that starts from balance sheet balances. Values round to the cent before subtracting.
const fs = require('fs');
const a = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const start = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3], 'utf8')) : null;
const MAP = {
  '510-01 - Purchases-Beverage Liquor': ['Liquor', '190-02 - Inventory-Liquor'],
  '510-02 - Purchases-Beverage Wine': ['Wine', '190-03 - Inventory-Wine'],
  '510-03 - Purchases-Beverage Beer': ['Beer', '190-04 - Inventory-Beer'],
  '510-04 - Purchases-Beverage N/A': ['N/A', '190-05 - Inventory-N/A Beverage'],
};
const stop = m => { console.error('STOP: ' + m); process.exit(1); };
const cents = x => Math.round(x * 100);

function counts(store, week, lines, date) {
  const dates = [...new Set(lines.map(l => l.auditDate))];
  if (dates.length !== 1 || dates[0] !== date) stop(`${store} ${week} audit dates ${dates.join(',') || 'none'}, want ${date}`);
  const o = {};
  for (const l of lines) {
    if (!MAP[l.glAccount]) stop(`${store} ${week} carries GL "${l.glAccount}" at ${l.amount.toFixed(2)}`);
    o[MAP[l.glAccount][0]] = (o[MAP[l.glAccount][0]] || 0) + l.amount;
  }
  for (const [c] of Object.values(MAP)) if (o[c] === undefined) stop(`${store} ${week} has no ${c} line`);
  return o;
}

const out = { weekEnd: a.weekEnd, stores: {} };
for (const [n, s] of Object.entries(a.stores)) {
  const cur = counts(n, 'week', s.cur, a.weekEnd);
  const prev = start ? start[n] : counts(n, 'prior week', s.prev, a.prevEnd);
  if (!prev) stop(`${n} missing from start.json`);
  const lines = {}; let total = 0;
  for (const [c, inv] of Object.values(MAP)) {
    const d = (cents(cur[c]) - cents(prev[c] || 0)) / 100;
    const purch = Object.keys(MAP).find(g => MAP[g][0] === c);
    lines[inv] = d; lines[purch] = -d; total += Math.abs(d);
  }
  out.stores[n] = { lines, total: Math.round(total * 100) / 100, prev, cur };
  const f = x => (x >= 0 ? 'Dr ' : 'Cr ') + Math.abs(x).toFixed(2);
  console.error(n.padEnd(9), Object.values(MAP).map(([c, inv]) => c + ' ' + f(lines[inv])).join(' | '), ' total ' + out.stores[n].total.toFixed(2));
}
process.stdout.write(JSON.stringify(out, null, 1));
