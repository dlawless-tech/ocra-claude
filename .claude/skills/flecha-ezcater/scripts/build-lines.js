#!/usr/bin/env node
// One EZ Cater Fees entry per store per week from gl1237.txt (gl.sh, BYLOC=1).
//
//   build-lines.js <gl1237.txt> <Sunday M/D/YYYY>... > lines.json
//
// Sales: Daily Sales Summary JEs (JE000xxxxx) dated Mon-Sun. Deposit: the store's bank deposits on 1237
// dated the following Mon-Sun (Payoneer pays the Tuesday). Fee = sales - deposit (basis "actual").
// No deposit yet: sales x the store's rate over its last 4 weeks with a deposit, or DEFAULT_RATE with
// fewer. A deposit week fully past with no deposit keeps the estimate (basis "no deposit").
// carry: what 1237 held at the Monday beyond the prior week's sales awaiting deposit; 0.00 when earlier weeks tie.
const fs = require('fs');
const { rows, begBalances, day } = require('./gl-rows.js');
const ids = require('./ids.js');
const [file, ...weeks] = process.argv.slice(2);
const stop = m => { console.error('STOP: ' + m); process.exit(1); };
const c = v => Math.round(v * 100) / 100;
const RATE_WEEKS = 4, DEFAULT_RATE = +(process.env.DEFAULT_RATE || 0.30), DAY = 864e5;
const today = process.env.TODAY ? day(process.env.TODAY) : new Date(new Date().setHours(0, 0, 0, 0));
if (!fs.existsSync(file)) stop('no ' + file);
const all = rows(file), beg = begBalances(file);
if (!Object.keys(beg).length) stop(file + ' has no store sections; pull it with BYLOC=1');
const md = t => { const x = new Date(t); return (x.getMonth() + 1) + '/' + x.getDate(); };
const isFee = r => r.type === 'Journal Entry' && !/^JE\d+$/.test(r.number);

const week = (R, e) => {
  const s = e - 6 * DAY, at = r => +day(r.date);
  const dss = R.filter(r => r.kind === 'sales' && at(r) >= s && at(r) <= e);
  const sales = c(dss.reduce((a, r) => a + r.dr - r.cr, 0));
  const deps = R.filter(r => r.kind === 'deposit' && at(r) > e && at(r) <= e + 7 * DAY);
  const deposit = c(deps.reduce((a, r) => a + r.cr - r.dr, 0));
  const booked = c(R.filter(r => isFee(r) && at(r) === e).reduce((a, r) => a + r.cr - r.dr, 0));
  return { s, sales, days: new Set(dss.map(r => r.date)).size, deposit, booked, deps: deps.length ? deps : (e + 7 * DAY >= +today ? null : []) };
};

const out = [];
for (const we of weeks) {
  const e = +day(we); if (new Date(e).getDay() !== 0) stop(we + ' is not a Sunday');
  for (const [store, { loc }] of Object.entries(ids.stores)) {
    const R = all.filter(r => r.loc === store);
    const { s, sales, days, deposit, booked, deps } = week(R, e);
    if (!sales && !(deps && deps.length)) continue;
    // balance through the Sunday, less this week's sales and fee entries
    const carry = c((beg[store] || 0) + R.filter(r => +day(r.date) <= e && !(isFee(r) && +day(r.date) === e)).reduce((a, r) => a + r.dr - r.cr, 0) - sales);
    const base = { weekEnding: we, store, loc, sales, days, carry, booked };
    if (deps && deps.length) {
      const comment = `EZ Cater fees: sales ${md(s)}-${md(e)} ${sales.toFixed(2)} less ${deps.map(r => md(day(r.date))).join(', ')} deposit ${deposit.toFixed(2)}`;
      out.push({ ...base, basis: 'actual', deposit, deposits: deps.map(r => r.number), fee: c(sales - deposit), comment });
      continue;
    }
    const hist = [];
    for (let k = 1; hist.length < RATE_WEEKS && k <= 12; k++) {
      const w = week(R, e - 7 * k * DAY);
      if (w.deps && w.deps.length && w.sales) hist.push(w);
    }
    const tot = k => hist.reduce((a, w) => a + w[k], 0);
    const full = hist.length === RATE_WEEKS;
    const rate = full ? Math.round((tot('sales') - tot('deposit')) / tot('sales') * 10000) / 10000 : DEFAULT_RATE;
    const comment = `EZ Cater fees estimate: sales ${md(s)}-${md(e)} ${sales.toFixed(2)} x ${(rate * 100).toFixed(2)}% (${full ? RATE_WEEKS + ' wk avg' : 'default'})`;
    out.push({ ...base, basis: deps ? 'no deposit' : 'estimate', rate, fee: c(sales * rate), comment });
  }
}
process.stdout.write(JSON.stringify(out, null, 1));
