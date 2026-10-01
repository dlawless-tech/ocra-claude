#!/usr/bin/env node
// Turn the week's Uber pay breakdowns into one set of entry lines per store.
//
//   build-lines.js week.txt <weekEnding M/D/YYYY> > lines.json
//
// week.txt holds one block per store: "== <uber store> | ..." then the expanded Pay breakdown rows.
// Stops on an unknown store or a row the entry does not model. Backup withholding books to 2270 on its own line.
const fs = require('fs');
const [file, weekEnding] = process.argv.slice(2);
const LOC = require(require("path").join(__dirname, "stores.json"));
const GL = {
  fees: '7380 - Uber Eats Third Party Fees', ads: '7630 - Uber Eats Marketing', offers: '4905 - Third Party App Marketing Comps',
  cb: '7535 - Third Party Refunds', tax: '2270 - Sales Tax Payable', clear: '1111 - Uber Eats Deposit Clearing',
};
const stop = m => { console.error('STOP: ' + m); process.exit(1); };
const c = v => Math.round(v * 100) / 100;
const num = s => +s.replace(/[$,]/g, '');

// top-level rows and the sub rows each one is allowed to carry
const TOP = ['Earnings', 'Uber Fees', 'Marketing', 'Net Chargeback Amount', 'Net Taxes', 'Total payout'];
const stores = [];
for (const blk of fs.readFileSync(file, 'utf8').split(/^== /m).slice(1)) {
  const [head, ...rows] = blk.trim().split('\n');
  const name = head.split(' | "')[0].trim();
  const loc = LOC[name];
  if (!loc) stop(`unknown store "${name}"`);
  if (!head.includes(' | ' + name + ' | Selected date range')) stop(`${name}: header does not confirm the store and range: ${head}`);
  // first occurrence wins; Net Taxes nests its own "Net Chargeback Amount" under MF tax
  const r = {};
  for (const row of rows) {
    const m = /^(.*?) (-?\$[\d,]+\.\d\d)$/.exec(row.trim());
    if (!m) continue;
    if (m[1] === 'Net Taxes') r['Net Chargeback Amount'] = r['Net Chargeback Amount'] || 0;
    if (!(m[1] in r)) r[m[1]] = num(m[2]);
  }
  const get = k => r[k] || 0;
  const top = Object.keys(r).filter(k => /^(Earnings|Uber Fees|Marketing|Net Chargeback Amount|Net Taxes|Total payout|Other.*)$/.test(k));
  for (const k of top) if (!TOP.includes(k)) stop(`${name}: unmodeled row "${k}" ${r[k]}`);
  const earn = get('Earnings'), payout = get('Total payout');
  const bw = get('Backup Withholding Tax');
  const taxOnEarn = get('Tax on Earnings');
  const lines = [];
  const add = (gl, amt, comment) => { amt = c(amt); if (amt > 0) lines.push({ side: 'debit', gl, amount: amt, comment }); else if (amt < 0) lines.push({ side: 'credit', gl, amount: -amt, comment }); };
  add(GL.fees, -get('Uber Fees'), 'marketplace fees');
  const mk = get('Marketing');
  const offers = get('Offers on items') || get('Offers On Items');
  add(GL.offers, -offers, 'offers on items');
  add(GL.ads, -(mk - offers), 'ad spends');
  add(GL.cb, -get('Net Chargeback Amount'), 'net chargeback');
  add(GL.tax, -(get('Net Taxes') - taxOnEarn - bw), '');
  add(GL.tax, -bw, "backup withholding");
  const dr = lines.reduce((t, l) => t + (l.side === 'debit' ? l.amount : -l.amount), 0);
  // earnings + tax on earnings - payout = everything Uber kept
  const kept = c(earn + taxOnEarn - payout);
  if (Math.abs(c(dr) - kept) > 0.005) stop(`${name}: lines ${c(dr)} != kept ${kept}`);
  if (c(dr) !== 0) add(GL.clear, -dr, '');
  const amount = c(lines.filter(l => l.side === 'debit').reduce((t, l) => t + l.amount, 0));
  stores.push({ store: name, loc, amount, earnings: earn, payout, withholding: -bw, zero: earn === 0 && lines.length === 0, lines });
}
process.stdout.write(JSON.stringify({ weekEnding, stores }, null, 1));
