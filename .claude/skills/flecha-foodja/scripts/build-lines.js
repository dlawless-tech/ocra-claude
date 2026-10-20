#!/usr/bin/env node
// One Foodja fee entry per store per week from gl1238.txt (flecha-3rd-party gl.sh) and statements.json (parse-statements.js).
//
//   build-lines.js <gl1238.txt> <statements.json> <Sunday M/D/YYYY>... > lines.json
//
// Sales: Daily Sales Summary JEs (JE000xxxxx) on 1238, Mon-Sun, tax included. Fee: sales x the chain's rate over every
// store-week with a posted statement in the 12 weeks before, (sales - Amount Due) / sales,
// or DEFAULT_RATE (45.15%, 40.90% Foodja fee on sales grossed up for 7.75% tax) with fewer than 4.
const fs = require('fs'), path = require('path');
const { rows, day } = require('../../flecha-3rd-party/scripts/gl-rows.js');
const [glFile, stFile, ...weeks] = process.argv.slice(2);
const stop = m => { console.error('STOP: ' + m); process.exit(1); };
const c = v => Math.round(v * 100) / 100;
const DEFAULT_RATE = +(process.env.DEFAULT_RATE || 0.4515), MIN_WEEKS = 4;
const LOC = { 'Flecha HB': '101 - Flecha HB', 'Flecha Town Square': '102 - Flecha Town Square', 'Flecha 4S Ranch': '103 - Flecha 4S Ranch', 'Flecha NB': '104 - Flecha NB' };
const STMT = { 'Flecha Cantina - HB': 'Flecha HB', 'Flecha Cantina - Town Square': 'Flecha Town Square', 'Flecha Cantina - 4s Ranch': 'Flecha 4S Ranch', 'Flecha Cantina - Newport Beach': 'Flecha NB' };
const DAY = 864e5, T = s => day(s).getTime();
const md = t => { const x = new Date(t); return (x.getMonth() + 1) + '/' + x.getDate(); };

const gl = rows(glFile).filter(r => r.kind === 'sales');
const stmts = JSON.parse(fs.readFileSync(stFile, 'utf8'));
for (const s of stmts) for (const st of s.stores) if (!STMT[st.store]) stop(`unknown statement store ${st.store} in ${s.file}`);
// the statement covering a week; Foodja periods run Mon-Sun two weeks, so a week sits wholly in one
const stmtFor = e => stmts.find(s => T(s.start) <= e - 6 * DAY && e <= T(s.end));

const week = (store, e) => {
  const s = e - 6 * DAY, inWk = d => T(d) >= s && T(d) <= e;
  const dss = gl.filter(r => r.loc === store && inWk(r.date));
  const out = { s, sales: c(dss.reduce((a, r) => a + r.dr - r.cr, 0)), days: new Set(dss.map(r => r.date)).size };
  const st = stmtFor(e);
  if (st) {
    const orders = st.stores.filter(x => STMT[x.store] === store).flatMap(x => x.orders).filter(o => inWk(o.date));
    Object.assign(out, { stmt: st, orders: orders.length, rt: c(orders.reduce((a, o) => a + o.total, 0)), due: c(orders.reduce((a, o) => a + o.due, 0)) });
  }
  return out;
};

const out = [];
for (const we of weeks) {
  const e = T(we); if (new Date(e).getDay() !== 0) stop(we + ' is not a Sunday');
  for (const [store, loc] of Object.entries(LOC)) {
    const w = week(store, e), span = `${md(w.s)}-${md(e)}`;
    if (!w.sales) continue;
    let ts = 0, td = 0, n = 0;
    for (let k = 1; k <= 12; k++) for (const st of Object.keys(LOC)) {
      const h = week(st, e - 7 * k * DAY);
      if (h.stmt && h.sales) { ts += h.sales; td += h.due; n++; }
    }
    const full = n >= MIN_WEEKS, rate = full ? Math.round((ts - td) / ts * 10000) / 10000 : DEFAULT_RATE;
    const comment = `Foodja fees estimate: sales ${span} ${w.sales.toFixed(2)} x ${(rate * 100).toFixed(2)}% (${full ? '12 wk avg' : 'default'})`;
    out.push({ weekEnding: we, store, loc, basis: 'estimate', sales: w.sales, days: w.days, rate, fee: c(w.sales * rate), comment });
  }
}
process.stdout.write(JSON.stringify(out, null, 1));
