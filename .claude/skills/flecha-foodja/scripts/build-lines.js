#!/usr/bin/env node
// One Foodja fee entry per store per week from gl1238.txt (flecha-ezcater gl.sh), statements.json (parse-statements.js)
// and orders.json (orders.sh).
//
//   build-lines.js <gl1238.txt> <statements.json> <orders.json> <Sunday M/D/YYYY>... > lines.json
//
// Sales: Daily Sales Summary JEs (JE000xxxxx) on 1238, Mon-Sun, tax included. Fee: sales less what Foodja pays for the
// week's orders, the statement's Amount Due once posted, else each Order History order x (1 - FEE_RATE) to the cent.
const fs = require('fs');
const { rows, day } = require('../../flecha-ezcater/scripts/gl-rows.js');
const [glFile, stFile, ordFile, ...weeks] = process.argv.slice(2);
const stop = m => { console.error('STOP: ' + m); process.exit(1); };
const c = v => Math.round(v * 100) / 100;
const FEE_RATE = +(process.env.FEE_RATE || 0.409), TAX = 0.0775;
const LOC = { 'Flecha HB': '101 - Flecha HB', 'Flecha Town Square': '102 - Flecha Town Square', 'Flecha 4S Ranch': '103 - Flecha 4S Ranch', 'Flecha NB': '104 - Flecha NB' };
const STMT = { 'Flecha Cantina - HB': 'Flecha HB', 'Flecha Cantina - Town Square': 'Flecha Town Square', 'Flecha Cantina - 4s Ranch': 'Flecha 4S Ranch', 'Flecha Cantina - Newport Beach': 'Flecha NB' };
const DAY = 864e5, T = s => day(s).getTime();
const md = t => { const x = new Date(t); return (x.getMonth() + 1) + '/' + x.getDate(); };
const sum = (a, k) => c(a.reduce((x, o) => x + o[k], 0));

const gl = rows(glFile).filter(r => r.kind === 'sales');
const stmts = JSON.parse(fs.readFileSync(stFile, 'utf8')), orders = JSON.parse(fs.readFileSync(ordFile, 'utf8'));
for (const s of stmts) for (const st of s.stores) if (!STMT[st.store]) stop(`unknown statement store ${st.store} in ${s.file}`);
for (const o of orders) if (!STMT[o.store]) stop(`unknown Order History store ${o.store}`);
// Foodja periods run Mon-Sun two weeks, so a week sits wholly in one
const stmtFor = e => stmts.find(s => T(s.start) <= e - 6 * DAY && e <= T(s.end));

const out = [];
for (const we of weeks) {
  const e = T(we); if (new Date(e).getDay() !== 0) stop(we + ' is not a Sunday');
  const s = e - 6 * DAY, inWk = d => T(d) >= s && T(d) <= e, span = `${md(s)}-${md(e)}`;
  const st = stmtFor(e);
  for (const [store, loc] of Object.entries(LOC)) {
    const dss = gl.filter(r => r.loc === store && inWk(r.date));
    const sales = c(dss.reduce((a, r) => a + r.dr - r.cr, 0)), days = new Set(dss.map(r => r.date)).size;
    const oh = orders.filter(o => STMT[o.store] === store && inWk(o.date)).map(o => ({ ...o, due: c(o.total * (1 - FEE_RATE)) }));
    const so = st ? st.stores.filter(x => STMT[x.store] === store).flatMap(x => x.orders).filter(o => inWk(o.date)) : null;
    const src = so || oh, basis = so ? 'statement' : 'orders';
    if (!sales && !src.length) continue;
    const rt = sum(src, 'total'), due = sum(src, 'due'), warn = [];
    if (!src.length) { out.push({ weekEnding: we, store, loc, skip: `R365 sales ${sales.toFixed(2)} on ${days} days but no Foodja orders` }); continue; }
    if (!sales) { out.push({ weekEnding: we, store, loc, skip: `${src.length} Foodja orders ${rt.toFixed(2)} but no R365 sales` }); continue; }
    // DSS books Restaurant Total plus tax
    const gap = c(sales - rt * (1 + TAX));
    if (Math.abs(gap) > 0.05) warn.push(`R365 sales ${sales.toFixed(2)} vs Foodja ${rt.toFixed(2)} + tax ${c(rt * (1 + TAX)).toFixed(2)}, off ${gap.toFixed(2)}`);
    if (so) { const ohDue = sum(oh, 'due'); if (Math.abs(ohDue - due) > 0.05) warn.push(`statement due ${due.toFixed(2)} vs Order History ${ohDue.toFixed(2)}`); }
    const fee = c(sales - due);
    const comment = `Foodja fees: sales ${span} ${sales.toFixed(2)} less Foodja pays ${due.toFixed(2)} (${src.length} order${src.length === 1 ? "" : "s"}, ${basis})`;
    out.push({ weekEnding: we, store, loc, basis, sales, days, orders: src.length, rt, due, fee, rate: Math.round(fee / sales * 10000) / 10000, warn, comment });
  }
}
process.stdout.write(JSON.stringify(out, null, 1));
