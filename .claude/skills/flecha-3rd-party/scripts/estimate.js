#!/usr/bin/env node
// Weekly 3rd Party fee estimate: each store's Monday-Sunday sales on 1235, 1237, 1238 x RATE (default 30%).
// usage: estimate.js <Sunday M/D/YYYY>...   reads gl1235.txt gl1237.txt gl1238.txt, writes week-<Sunday>.json each
const fs = require('fs');
const { rows, sunday } = require('./gl-rows.js');
const build = require('./build.js');
const ids = require('./ids.js');
const RATE = +(process.env.RATE || 0.30), pct = (RATE * 100).toFixed(0) + '%';
const md = D => `${D.getMonth() + 1}/${D.getDate()}`;
const money = n => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// Uber Eats (1235) belongs to flecha-ubereats from 10/11/2026
const UBER_OUT = new Date(2026, 9, 11);
const accts = mon => Object.keys(ids.accounts).filter(a => a !== '1235' || mon < UBER_OUT - 6 * 864e5);
const data = Object.fromEntries(Object.keys(ids.accounts).filter(a => fs.existsSync(`gl${a}.txt`)).map(a => [a, rows(`gl${a}.txt`)]));
for (const S of process.argv.slice(2)) {
  const [m, d, y] = S.split('/').map(Number), mon = new Date(y, m - 1, d - 6), span = `${md(mon)}-${m}/${d}`;
  const fees = [];
  console.log(`\nweek ending ${S}  (sales ${span} x ${pct})`);
  for (const a of accts(mon)) for (const store of Object.keys(ids.stores)) {
    const acct = ids.accounts[a];
    if (!data[a]) { console.error(`STOP: no gl${a}.txt`); process.exit(1); }
    const r = data[a].filter(x => x.kind === 'sales' && x.loc === store && sunday(x.date) === S);
    if (!r.length) continue;
    const sales = r.reduce((t, x) => t + x.dr - x.cr, 0), days = new Set(r.map(x => x.date)).size;
    const fee = Math.round(sales * RATE * 100) / 100;
    fees.push({ store, acct: a, fee, comment: `${acct.label} fees estimate: sales ${span} ${money(sales)} x ${pct}` });
    console.log(`  ${a} ${acct.label.padEnd(10)} ${store.padEnd(20)} ${days} days  sales ${money(sales).padStart(10)}  fee ${money(fee).padStart(9)}`);
  }
  const e = build(S, '3rd Party', `3rd Party fees estimate: ${pct} of sales ${span}`, fees, `3rd Party fees estimate: ${pct} of sales ${span}`);
  console.log(`  total ${money(e.total)}  ${e.lines.length} lines`);
  fs.writeFileSync(`week-${S.replace(/\//g, '-')}.json`, JSON.stringify(e, null, 1));
}
