#!/usr/bin/env node
// Statements + 1119 GL detail -> one entry plan per store with a statement.
// usage: plan.js <statements.json> <gl.json> <period start M/D/YYYY> <period end M/D/YYYY> > plan.json
// D = the store's 1119 Journal Entry debits inside the period, its Foodja sales in R365.
const fs = require('fs'), path = require('path');
const [st, gl, start, end] = [JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), JSON.parse(fs.readFileSync(process.argv[3], 'utf8')), process.argv[4], process.argv[5]];
const map = JSON.parse(fs.readFileSync(path.join(__dirname, 'stores.json'), 'utf8'));
const A = map._accounts;
const day = s => { const [m, d, y] = s.split('/').map(Number); return new Date(y, m - 1, d).getTime(); };
const [t0, t1] = [day(start), day(end)];
const r2 = x => Math.round(x * 100) / 100;
const out = [];
for (const s of st) {
  const m = map[s.code];
  if (!m) { console.error('FAIL: no stores.json entry for ' + s.code + ' (' + s.store + ')'); process.exit(1); }
  const name = m[0].replace(/^\d+ - /, '');
  const rows = ((gl[name] || {}).rows || []).filter(r => day(r.date) >= t0 && day(r.date) <= t1);
  const sales = rows.filter(r => r.type === 'Journal Entry' && r.debit > 0);
  const D = r2(sales.reduce((a, r) => a + r.debit, 0));
  const posted = rows.filter(r => r.date === end && r.type === 'Journal Entry' && r.credit > 0).map(r => r.credit);
  const ar = r2(D - s.due), fee = r2(s.total - s.due), diff = r2(D - s.total);
  const line = (k, comment, amt, creditWhenPositive) => ({ comment, account: A[k][0], accountId: A[k][1], col: (amt >= 0) === creditWhenPositive ? 'credit' : 'debit', amount: Math.abs(amt) });
  const lines = [line('ar', 'a/r foodja - payout', ar, true), line('fees', 'foodja fees', fee, false), line('difference', 'difference', diff, false)];
  const warnings = [];
  if (diff !== 0) {
    // name the orders and R365 days that do not pair off by date and amount
    const left = sales.map(r => ({ ...r })); const lone = [];
    for (const o of s.orders) { const i = left.findIndex(r => r.date === o.date && Math.abs(r.debit - o.total) < 0.005); if (i >= 0) left.splice(i, 1); else lone.push(`order ${o.order} ${o.date} ${o.total.toFixed(2)}`); }
    warnings.push(`R365 sales ${D.toFixed(2)} vs statement ${s.total.toFixed(2)}, difference ${diff.toFixed(2)}` + (lone.length ? `; not in R365: ${lone.join(', ')}` : '') + (left.length ? `; R365 only: ${left.map(r => r.date + ' ' + r.debit.toFixed(2)).join(', ')}` : ''));
  }
  if (posted.length) warnings.push(`1119 already carries a credit dated ${end}: ${posted.join(', ')}`);
  const dr = r2(lines.filter(l => l.col === 'debit').reduce((a, l) => a + l.amount, 0)), cr = r2(lines.filter(l => l.col === 'credit').reduce((a, l) => a + l.amount, 0));
  if (dr !== cr) { console.error(`FAIL: ${s.code} unbalanced ${dr}/${cr}`); process.exit(1); }
  out.push({ code: s.code, loc: m[0], locId: m[1], file: s.file, D, total: s.total, due: s.due, fee, diff, amount: dr, posted: posted.length > 0, lines, warnings });
}
console.log(JSON.stringify(out, null, 1));
for (const p of out) console.error(`${p.loc.padEnd(24)} D ${p.D.toFixed(2).padStart(8)}  sales ${p.total.toFixed(2).padStart(8)}  due ${p.due.toFixed(2).padStart(8)}  fee ${p.fee.toFixed(2).padStart(7)}  diff ${p.diff.toFixed(2).padStart(8)}${p.posted ? '  POSTED' : ''}${p.warnings.length ? '\n    ' + p.warnings.join('\n    ') : ''}`);
