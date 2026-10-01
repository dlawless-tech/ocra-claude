#!/usr/bin/env node
// Turn one week's DoorDash financial report into one set of entry lines per store.
//
//   build-lines.js <report dir> <weekEnding M/D/YYYY> [--from YYYY-MM-DD] > lines.json
//
// The report dir holds the unzipped "By payout date" financial report. Rows dated before --from are
// dropped (the 9/6/2026 week drops 8/31); without --from any row outside Mon-Sun stops the run.
// Stops on adjustments, tax passed to the store, or a store whose columns do not add to its net total.
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2);
const fi = args.indexOf('--from'); const FROM = fi >= 0 ? args.splice(fi, 2)[1] : null;
const [dir, weekEnding] = args;
const STORES = require('./stores.json');
const GL = {
  clear: '1102 - DoorDash Deposit Clearing', comps: '4905 - Third Party App Marketing Comps',
  mkt: '7540 - Doordash Marketing', fees: '7310 - DoorDash Third Party Fees', err: '7535 - Third Party Refunds',
};
const stop = m => { console.error('STOP: ' + m); process.exit(1); };
const c = v => Math.round(v * 100) / 100;

function parse(t) {
  const rows = []; let r = [], f = '', q = false;
  for (let i = 0; i < t.length; i++) { const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { f += '"'; i++ } else q = false } else f += ch }
    else if (ch === '"') q = true; else if (ch === ',') { r.push(f); f = '' }
    else if (ch === '\n') { r.push(f.replace(/\r$/, '')); rows.push(r); r = []; f = '' } else f += ch }
  if (f || r.length) { r.push(f); rows.push(r) }
  const h = rows[0].map(k => k.replace(/^﻿/, ''));
  return rows.slice(1).filter(r => r.length >= h.length - 1).map(r => Object.fromEntries(h.map((k, i) => [k, r[i]])));
}
const read = prefix => { const fn = fs.readdirSync(dir).find(f => f.startsWith(prefix)); if (!fn) stop(`no ${prefix}* in ${dir}`); return parse(fs.readFileSync(path.join(dir, fn), 'utf8')); };
const det = read('FINANCIAL_DETAILED_TRANSACTIONS'), pay = read('FINANCIAL_PAYOUT_SUMMARY');
const n = (x, k) => { if (!(k in x)) stop(`no column "${k}"`); return +x[k] || 0; };
const COLS = {
  sub: 'Subtotal', taxm: 'Subtotal tax passed to merchant', comm: 'Commission', ppf: 'Payment processing fee',
  mktf: 'Marketing fees | (including any applicable taxes)', dYou: 'Customer discounts from marketing | (funded by you)',
  dDD: 'Customer discounts from marketing | (funded by DoorDash)', d3: 'Customer discounts from marketing | (funded by a third-party)',
  ddc: 'DoorDash marketing credit', tpc: 'Third-party contribution', err: 'Error charges', adj: 'Adjustments', net: 'Net total',
};
const sum = rows => { const t = {}; for (const k in COLS) t[k] = c(rows.reduce((s, x) => s + n(x, COLS[k]), 0)); return t; };

// Mon-Sun window
const [m, d, y] = weekEnding.split('/').map(Number);
const iso = dt => dt.toISOString().slice(0, 10);
const END = iso(new Date(Date.UTC(y, m - 1, d)));
if (new Date(END + 'T12:00:00Z').getUTCDay() !== 0) stop(`${weekEnding} is not a Sunday`);
const START = iso(new Date(Date.UTC(y, m - 1, d - 6)));
const from = FROM || START;

for (const x of [...det, ...pay]) if (!STORES[x['Store ID']]) stop(`unknown DoorDash store ${x['Store ID']} "${x['Store name']}"`);
const dropped = det.filter(x => x['Timestamp local date'] < from);
const outside = det.filter(x => x['Timestamp local date'] > END || (!FROM && x['Timestamp local date'] < START));
if (outside.length) stop(`${outside.length} rows outside ${START} to ${END}, first ${outside[0]['Timestamp local date']} ${outside[0]['Store name']}`);

const stores = [];
for (const [id, [store, loc]] of Object.entries(STORES)) {
  const all = det.filter(x => x['Store ID'] === id);
  // detail must carry the whole payout before any of it is dropped
  const ps = pay.filter(x => x['Store ID'] === id);
  const pnet = c(ps.reduce((s, x) => s + n(x, 'Net total'), 0)), dnet = sum(all).net;
  if (Math.abs(pnet - dnet) > 0.005) stop(`${store}: payout net ${pnet} != detail net ${dnet}`);
  const t = sum(all.filter(x => x['Timestamp local date'] >= from));
  if (t.adj) stop(`${store}: adjustments ${t.adj}, not modeled`);
  if (t.taxm) stop(`${store}: tax passed to store ${t.taxm}, not modeled`);
  const lines = [];
  const add = (gl, amt, comment) => { amt = c(amt); if (amt > 0) lines.push({ side: 'debit', gl, amount: amt, comment }); else if (amt < 0) lines.push({ side: 'credit', gl, amount: -amt, comment }); };
  add(GL.comps, -(t.dYou + t.dDD + t.d3 + t.ddc + t.tpc), 'customer discounts funded by store');
  add(GL.mkt, -t.mktf, 'marketing fees');
  add(GL.fees, -(t.comm + t.ppf), 'commission');
  add(GL.err, -t.err, 'error charges');
  const dr = c(lines.reduce((s, l) => s + (l.side === 'debit' ? l.amount : -l.amount), 0));
  // subtotal less net total = everything DoorDash kept
  if (Math.abs(dr - c(t.sub - t.net)) > 0.005) stop(`${store}: lines ${dr} != subtotal ${t.sub} - net ${t.net}`);
  if (dr) lines.unshift({ side: dr > 0 ? 'credit' : 'debit', gl: GL.clear, amount: Math.abs(dr), comment: 'total withheld from payouts' });
  const amount = c(lines.filter(l => l.side === 'debit').reduce((s, l) => s + l.amount, 0));
  stores.push({ store, loc, amount, sales: t.sub, net: t.net, payoutNet: pnet, payoutIds: ps.map(x => x['Payout ID']), payoutDate: (ps[0] || {})['Payout date'] || '', zero: lines.length === 0, lines });
}
if (dropped.length) console.error(`dropped ${dropped.length} rows dated before ${from}`);
process.stdout.write(JSON.stringify({ weekEnding, start: from, end: END, stores }, null, 1));
