#!/usr/bin/env node
// Turn one period's Grubhub deposits into one set of entry lines per store.
//
//   build-lines.js week.raw <entry date M/D/YYYY> > lines.json
//
// Orders are bucketed by New York date. Stops on an unknown transaction type, a deposit whose
// orders straddle the period, or a deposit whose fields do not add to its total.
const fs = require('fs');
const [file, entryDate] = process.argv.slice(2);
const STORES = require('./stores.json');
const GL = {
  fees: '7350 - Grubhub Third Party Fees', mkt: '7570 - Grubhub Marketing', promo: '4905 - Third Party App Marketing Comps',
  ref: '7535 - Third Party Refunds', tax: '2270 - Sales Tax Payable', clear: '1103 - Grubhub Deposit Clearing',
};
const stop = m => { console.error('STOP: ' + m); process.exit(1); };
let s = fs.readFileSync(file, 'utf8');
s = s.slice(s.indexOf('"{'), s.lastIndexOf('}"') + 2);
const w = JSON.parse(JSON.parse(s));
const ny = t => new Date(t).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
const inP = t => ny(t) >= w.start && ny(t) <= w.end;
const c = v => Math.round(v) / 100;

const acc = {};
for (const [rid, [name, loc]] of Object.entries(STORES)) acc[name] = acc[name] || { store: name, loc, ids: [], gross: 0, net: 0, fees: 0, mkt: 0, promo: 0, ref: 0, tax: 0 };
for (const d of w.deposits) {
  const tx = d.associated_transactions || [];
  const n = tx.filter(t => inP(t.transaction_time)).length;
  if (!n) continue;
  if (n !== tx.length) stop(`deposit ${d.short_distribution_id} straddles the period (${n} of ${tx.length} rows inside)`);
  const st = STORES[d.rest_id]; if (!st) stop(`unknown Grubhub restaurant ${d.rest_id}`);
  const a = acc[st[0]], T = d.totals;
  const sumT = Object.values(T).reduce((x, y) => x + y, 0);
  if (sumT !== d.total) stop(`${d.short_distribution_id}: totals ${sumT} != deposit ${d.total}`);
  if (T.commission_fee_tax) stop(`${d.short_distribution_id}: unmodeled commission_fee_tax ${T.commission_fee_tax}`);
  let gross = 0, ref = 0, misc = 0;
  for (const t of tx) {
    if (t.transaction_type === 'PCI_SINGLE_ONLINE') gross += t.prepaid_amount;
    else if (t.transaction_type === 'PCI_SINGLE_REFUND') ref += t.prepaid_amount;
    else if (t.transaction_type === 'MISC_CHARGE' || t.transaction_type === 'CS_CREDIT') misc += t.prepaid_amount;
    else stop(`${d.short_distribution_id}: unmodeled row ${t.transaction_type} "${t.transaction_type_description}"`);
  }
  if (gross + ref !== T.prepaid_total) stop(`${d.short_distribution_id}: orders ${gross} + refunds ${ref} != prepaid_total ${T.prepaid_total}`);
  if (misc !== T.account_adj) stop(`${d.short_distribution_id}: misc rows ${misc} != account_adj ${T.account_adj}`);
  a.ids.push(d.short_distribution_id); a.gross += gross; a.net += d.total;
  a.fees -= T.grubhub_delivery_fee_total + T.processing_fee;
  a.mkt -= T.commission_total + T.gh_plus_commission_total + T.account_adj;
  a.promo -= T.restaurant_funded_promo_total + T.restaurant_funded_reward_total;
  a.ref -= ref; a.tax -= T.withheld_sales_tax;
}
const md = v => +v.slice(5, 7) + '/' + +v.slice(8, 10);
const stores = [];
for (const a of Object.values(acc)) {
  const lines = [];
  const add = (gl, amt, comment) => { if (amt > 0) lines.push({ side: 'debit', gl, amount: c(amt), comment }); else if (amt < 0) lines.push({ side: 'credit', gl, amount: c(-amt), comment }); };
  add(GL.fees, a.fees, 'delivery + order processing');
  add(GL.mkt, a.mkt, 'marketing + ad spend');
  add(GL.promo, a.promo, 'restaurant promotions');
  add(GL.ref, a.ref, 'cancellations + order adjustments');
  add(GL.tax, a.tax, 'sales tax withheld');
  const dr = a.fees + a.mkt + a.promo + a.ref + a.tax;
  // what Grubhub kept = orders booked to 1103 less the deposit
  if (dr !== a.gross - a.net) stop(`${a.store}: lines ${dr} != orders ${a.gross} - deposit ${a.net}`);
  add(GL.clear, -dr, `orders ${md(w.start)} - ${md(w.end)}, deposit ${a.ids.join(' + ')}`);
  stores.push({ store: a.store, loc: a.loc, amount: c(dr), orders: c(a.gross), deposit: c(a.net), deposits: a.ids, zero: !a.ids.length, lines });
}
process.stdout.write(JSON.stringify({ weekEnding: entryDate, start: w.start, end: w.end, stores }, null, 1));
