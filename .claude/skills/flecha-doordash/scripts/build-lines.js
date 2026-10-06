#!/usr/bin/env node
// Turn a GL Account Detail CSV of 1239 - AR - DoorDash into one fee entry per store per week.
//
//   build-lines.js <gl.csv> <Sunday M/D/YYYY>... > lines.json
//
// Sales: Daily Sales Summary JEs (numbered JE000xxxxx) dated Mon-Sun. Deposit: the store's
// DoorDash bank deposit(s) dated the following Mon-Sun. Fee = sales - deposit (basis "actual").
// A week whose deposit week runs past the report end is an estimate: sales x the store's rate
// over its last 4 actual weeks, total fees / total sales. A deposit missing from a deposit week
// the report fully covers stops the run.
const fs = require('fs');
const [file, ...weeks] = process.argv.slice(2);
const stop = m => { console.error('STOP: ' + m); process.exit(1); };
const c = v => Math.round(v * 100) / 100;
const RATE_WEEKS = 4;
const LOC = {
  'Flecha 4S Ranch': '103 - Flecha 4S Ranch', 'Flecha HB': '101 - Flecha HB',
  'Flecha NB': '104 - Flecha NB', 'Flecha Town Square': '102 - Flecha Town Square',
};

const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const parse = l => { const o = []; let s = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { o.push(s); s = ''; } else s += ch; } o.push(s); return o; };
const hi = lines.findIndex(l => l.startsWith('LocationName1,'));
if (hi < 0) stop('no LocationName1 header; is this a GL Account Detail CSV export?');
if (!/1239 - AR - DoorDash/.test(lines[1] || '')) stop('report is not account 1239 - AR - DoorDash');
const h = parse(lines[hi]); const ix = k => { const i = h.indexOf(k); if (i < 0) stop('no column ' + k); return i; };
const n = v => +String(v).replace(/,/g, '') || 0;
const rows = lines.slice(hi + 1).filter(Boolean).map(parse).filter(r => r[ix('TrxDate')]).map(r => ({
  loc: r[ix('LocationName1')], date: r[ix('TrxDate')], type: r[ix('TrxType')], num: r[ix('TrxNumber')],
  dr: n(r[ix('Debit')]), cr: n(r[ix('Credit')]),
}));
const D = s => { const [m, d, y] = s.split('/').map(Number); return Date.UTC(y, m - 1, d); };
const md = t => { const x = new Date(t); return (x.getUTCMonth() + 1) + '/' + x.getUTCDate(); };
const DAY = 864e5;
const isDss = r => r.type === 'Journal Entry' && /^JE\d+$/.test(r.num);
const range = (lines[1] || '').match(/(\d+\/\d+\/\d{4}) - (\d+\/\d+\/\d{4})/) || stop('no report date range');
const reportEnd = D(range[2]);

// deps is null while the deposit week runs past the report, [] when it is covered and empty
const week = (R, e) => {
  const s = e - 6 * DAY;
  const dss = R.filter(r => isDss(r) && D(r.date) >= s && D(r.date) <= e);
  const sales = c(dss.reduce((a, r) => a + r.dr - r.cr, 0));
  const deps = R.filter(r => r.type === 'Bank Deposit' && D(r.date) > e && D(r.date) <= e + 7 * DAY);
  const deposit = c(deps.reduce((a, r) => a + r.cr - r.dr, 0));
  return { s, sales, days: new Set(dss.map(r => r.date)).size, deposit, deps: deps.length ? deps : (e + 7 * DAY > reportEnd ? null : []) };
};

const out = [];
for (const we of weeks) {
  const e = D(we); if (new Date(e).getUTCDay() !== 0) stop(we + ' is not a Sunday');
  for (const [store, loc] of Object.entries(LOC)) {
    const R = rows.filter(r => r.loc === store);
    const { s, sales, days, deposit, deps } = week(R, e);
    if (deps && !deps.length) stop(`${store} ${we}: no DoorDash deposit ${md(e + DAY)} to ${md(e + 7 * DAY)}`);
    if (deps) {
      const comment = `DoorDash fees: sales ${md(s)}-${md(e)} ${sales.toFixed(2)} less ${deps.map(r => md(D(r.date))).join(', ')} deposit ${deposit.toFixed(2)}`;
      out.push({ weekEnding: we, store, loc, basis: 'actual', sales, days, deposit, deposits: deps.map(r => r.num), fee: c(sales - deposit), comment });
      continue;
    }
    const hist = [];
    for (let k = 1; hist.length < RATE_WEEKS && k <= 12; k++) {
      const w = week(R, e - 7 * k * DAY);
      if (w.deps && w.deps.length && w.sales) hist.push(w);
    }
    if (hist.length < RATE_WEEKS) stop(`${store} ${we}: only ${hist.length} actual weeks for a rate; start the report earlier`);
    const tot = k => hist.reduce((a, w) => a + w[k], 0);
    const rate = Math.round((tot('sales') - tot('deposit')) / tot('sales') * 10000) / 10000;
    const comment = `DoorDash fees estimate: sales ${md(s)}-${md(e)} ${sales.toFixed(2)} x ${(rate * 100).toFixed(2)}% (${RATE_WEEKS} wk avg)`;
    out.push({ weekEnding: we, store, loc, basis: 'estimate', sales, days, rate, fee: c(sales * rate), comment });
  }
}
process.stdout.write(JSON.stringify(out, null, 1));
