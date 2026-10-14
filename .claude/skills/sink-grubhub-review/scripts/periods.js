// Review 13580 by Grubhub period and optionally write entry plans.
// A period runs Tuesday to Monday in Denver days and splits at month end; Grubhub pays each one separately.
// Prints per period: R365 DSS sales, Grubhub gross, fees, withheld tax, refunds, net, the Grubhub payout it matched,
// the GrubHub entries dated in the period, and 13580 at period end against the payouts R365 has not yet deposited.
// usage: node periods.js <gh.json> <gl.json> <from YYYY-MM-DD> [--plan <out.json> --source <entry id>]
const fs = require('fs');
const [ghPath, glPath, from] = process.argv.slice(2);
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const gh = JSON.parse(fs.readFileSync(ghPath, 'utf8')); const gl = JSON.parse(fs.readFileSync(glPath, 'utf8'));
const day = t => new Date(t).toLocaleDateString('en-CA', { timeZone: 'America/Denver' });
const iso = s => { const [m, d, y] = s.split('/'); return y + '-' + m.padStart(2, '0') + '-' + d.padStart(2, '0'); };
const r2 = x => Math.round(x * 100) / 100; const c = x => (x || 0) / 100;

const per = {};
for (const x of gh.tx.filter(x => x.transaction_type !== 'DISTRIBUTION')) {
  const d = day(x.transaction_time); const D = new Date(d + 'T12:00:00Z');
  let s = new Date(D - ((D.getUTCDay() - 2 + 7) % 7) * 864e5);
  if (s.getUTCMonth() !== D.getUTCMonth()) s = new Date(Date.UTC(D.getUTCFullYear(), D.getUTCMonth(), 1, 12));
  const k = s.toISOString().slice(0, 10);
  // period end: the Monday, or month end when sooner
  let e = new Date(s.getTime() + ((1 - s.getUTCDay() + 7) % 7) * 864e5);
  const me = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + 1, 0, 12)); if (e > me) e = me;
  const p = per[k] = per[k] || { s: k, e: e.toISOString().slice(0, 10), gross: 0, fee: 0, wtax: 0, refund: 0, refunds: [], net: 0 };
  const isRefund = x.transaction_type === 'PCI_SINGLE_REFUND';
  const fee = -(c(x.advertising_fee) + c(x.grubhub_delivery_fee) + c(x.processing_fee) + c(x.gh_plus_fee) + c(x.commission_fee_tax) + c(x.restaurant_funded_promo) + c(x.restaurant_funded_reward));
  p.gross += c(x.prepaid_amount); p.wtax += -c(x.withheld_sales_tax); p.fee += fee; p.net += c(x.net_amount);
  // anything in net not explained by gross, fees and tax (a CS credit) lands in fees
  p.fee += -(c(x.net_amount) - (c(x.prepaid_amount) - fee - c(-x.withheld_sales_tax)));
  if (isRefund) { p.refund += -c(x.prepaid_amount); p.refunds.push(x.order_number); }
}
const payouts = gh.tx.filter(x => x.transaction_type === 'DISTRIBUTION').map(x => ({ d: day(x.transaction_time), amt: r2(-c(x.net_amount)) }));
const deposits = gl.filter(t => t.type === 'Bank Deposit').map(t => ({ d: iso(t.d), amt: r2(t.cr - t.dr), used: false }));
const bal = d => { const r = gl.filter(t => iso(t.d) <= d); return r.length ? r[r.length - 1].bal : NaN; };
const f = x => (isNaN(x) ? '-' : x.toFixed(2)).padStart(8);
const rows = Object.values(per).filter(p => p.s >= from).sort((a, b) => a.s < b.s ? -1 : 1);
const plans = []; let bad = 0;
console.log('period        DSS     gross    fees    wtax  refund     net  paid           bal@end  unpaid  entries');
for (const p of rows) {
  for (const k of ['gross', 'fee', 'wtax', 'refund', 'net']) p[k] = r2(p[k]);
  p.dss = r2(gl.filter(t => /^NJ/.test(t.num) && !t.cm && iso(t.d) >= p.s && iso(t.d) <= p.e).reduce((a, t) => a + t.dr - t.cr, 0));
  const pay = payouts.find(x => x.d >= p.e && Math.abs(x.amt - p.net) < 0.015);
  const dep = deposits.find(x => !x.used && x.d > p.e && Math.abs(x.amt - p.net) < 0.015); if (dep) dep.used = true; p.dep = dep ? dep.d : null;
  const ents = gl.filter(t => t.type === 'Journal Entry' && !/^NJ/.test(t.num) && iso(t.d) >= p.s && iso(t.d) <= p.e).map(t => t.num + ' ' + r2(t.cr - t.dr));
  const unpaid = r2(rows.filter(q => q.e <= p.e && q.net !== undefined && !(q.dep && q.dep <= p.e)).reduce((a, q) => a + q.net, 0));
  const open = p.e > iso(gl[gl.length - 1].d); const b = bal(p.e); const ties = Math.abs(b - unpaid) < 0.005; if (!ties && ents.length && !open) bad++;
  console.log((p.s.slice(5) + '-' + p.e.slice(5)).padEnd(12), f(p.dss), f(p.gross), f(p.fee), f(p.wtax), f(p.refund), f(p.net), (pay ? pay.d : 'unpaid').padEnd(11), f(b), f(unpaid), open ? 'OPEN' : ties ? 'TIES' : 'OFF', ents.join('; '));
  // DSS over Grubhub gross is a refund DSS never saw, or pennies of rounding that ride with the tax
  const diff = r2(p.dss - p.gross); const num = 'GrubHub ' + p.s.slice(5).replace('-', '.') + '-' + p.e.slice(5).replace('-', '.');
  if (Math.abs(diff) > 1 && !p.refunds.length) console.log('  WARN ' + num + ': DSS differs from Grubhub gross by ' + diff + ' with no refund; check the DSS days');
  const A = { f: ['74920 - GrubHub Fees', '12499ef7-e3a3-4577-8d14-ce21a080daf3'], ar: ['13580 - Grub Hub - Receivable', '74e527e7-2494-4a01-bb6c-8262ae83e522'], t: ['22000 - Sales Tax Payable', 'a3bdcb3b-18a3-45a0-8537-8d56a323338f'] };
  const L = (a, cm, d, cr) => ({ account: a, comment: cm, debit: d, credit: cr });
  const refundLine = p.refunds.length ? diff : 0; const tax = r2(p.wtax + (p.refunds.length ? 0 : diff));
  const lines = [L(A.f, num, p.fee, 0), L(A.ar, num, 0, r2(p.dss - p.net)), L(A.t, 'Sales tax', tax, 0)];
  if (refundLine) lines.push(L(A.f, 'Refund ' + p.refunds.map(o => 'O-' + o).join(', ') + ' not in DSS', refundLine, 0));
  if (Math.abs(r2(p.fee + tax + refundLine) - r2(p.dss - p.net)) > 0.005) { console.log('  STOP ' + num + ': lines do not balance'); process.exit(1); }
  const [y, m, d] = p.e.split('-');
  plans.push({ key: 'The Sink|' + (+m) + '/' + (+d) + '/' + y, num, source: arg('--source'), amount: r2(p.dss - p.net), r365loc: '10200 - The Sink', locId: 'e3e6211c-ba1d-4483-b4d5-f820e699122e', lines });
}
if (arg('--plan')) { fs.writeFileSync(arg('--plan'), JSON.stringify(plans, null, 1)); console.log('wrote ' + plans.length + ' plans to ' + arg('--plan')); }
if (bad) console.log(bad + ' posted period(s) do not tie');
