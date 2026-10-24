// 10150 GL rows + EZ orders -> one entry plan per store per EZ payout, dated the Sunday ending the payout's delivery week.
// EZ pays each store on Tuesday the Caterer Total Due of the orders delivered Monday to Sunday before it (by event date).
// Each order brings its own R365 sale, whatever day R365 booked it; an unpaired sale goes with the order placed nearest it.
// Cr 10150 = those sales - due. Dr 70470 = order total - due, less a hand fee entry. 42060 takes the rest.
// check: each payout's due against its deposit, and each store's 10150 at the last Sunday.
// usage: plan.js <gl.json> <orders.json> <first Sunday YYYY-MM-DD> <last Sunday YYYY-MM-DD> > plan.json  ->  {entries, check}
const path = require('path');
const [, , G, O, F, L] = process.argv;
const gl = require(path.resolve(G)), orders = require(path.resolve(O));
const advances = require('./advances.json');
// EZ order rung in Toast at another store; the paying deposit credits its full total there and books its fee
const moved = require('./order-stores.json');
const stores = Object.fromEntries(Object.entries(require('./stores.json')).filter(([k]) => !k.startsWith('_')).map(([k, v]) => [k, v[0]]));
const r2 = v => Math.round(v * 100) / 100;
const ct = iso => { const [m, d, y] = new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Chicago' }).split('/'); return Date.UTC(+y, m - 1, +d) / 864e5; };
const md = s => { const [m, d, y] = s.split('/'); return Date.UTC(+y, m - 1, +d) / 864e5; };
const iso = s => { const [y, m, d] = s.split('-'); return Date.UTC(+y, m - 1, +d) / 864e5; };
const fmt = n => { const d = new Date(n * 864e5); return (d.getUTCMonth() + 1) + '/' + d.getUTCDate() + '/' + d.getUTCFullYear(); };
const sunday = n => n + ((7 - new Date(n * 864e5).getUTCDay()) % 7);
const loc = n => n.replace(/^Snarf.s /, '');
const ours = r => r.type === 'Journal Entry' && r.number === 'EZ Cater Fees';
const prior = r => r.type === 'Journal Entry' && r.number === 'EZ Cater';
const sale = r => r.type === 'Journal Entry' && /^NJ/.test(r.number);
const deposit = r => r.type === 'Bank Deposit';

// R365 books an EZ sale on the day it is placed. A sale pairs with orders submitted up to a day after it and delivered
// no more than a day before it: one order to within 0.10, two or three summing to it, the nearest single order within
// 10%, two or three within 10% of their total, then the one unpaired order placed within a day of it, whatever the amount.
// A credit to 10150 outside the daily sales (a "cancelled in Toast" recon) cancels the latest earlier sale of the same
// amount; failing that, it reduces the sale within two weeks before it whose remainder then pairs with its orders.
function pairAll(rows, os) {
  const cand = x => os.filter(o => !o.sale && o.sub - 1 <= x.day && x.day <= o.ev + 1);
  const take = (x, l) => { for (const o of l) o.sale = x; x.orders = l; };
  const sum = l => l.reduce((t, o) => t + o.total, 0);
  const subset = (c, amt, tol) => { for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) {
    if (Math.abs(c[i].total + c[j].total - amt) <= tol([c[i], c[j]])) return [c[i], c[j]];
    for (let k = j + 1; k < c.length; k++) if (Math.abs(sum([c[i], c[j], c[k]]) - amt) <= tol([c[i], c[j], c[k]])) return [c[i], c[j], c[k]]; } return null; };
  const near = (c, amt) => { const one = c.filter(o => Math.abs(o.total - amt) <= 0.10 * o.total).sort((p, q) => Math.abs(p.total - amt) - Math.abs(q.total - amt))[0];
    return one ? [one] : subset(c, amt, l => 0.10 * sum(l)); };
  // a credit line inside a DSS counts too
  const adj = rows.filter(r => !deposit(r) && !ours(r) && !prior(r) && r.amt < 0);
  for (const r of adj) {
    const o = rows.filter(x => sale(x) && !x.reversed && x.day <= r.day && Math.abs(x.amt + r.amt) <= 0.01).pop();
    if (o) { o.reversed = r.number + ' ' + r.date; r.reversed = o.number + ' ' + o.date; }
  }
  const sales = () => rows.filter(r => sale(r) && !r.reversed && !r.orders && r.amt > 0);
  for (const x of sales()) { const c = cand(x).find(o => Math.abs(o.total - x.amt) <= 0.10); if (c) take(x, [c]); }
  for (const x of sales()) { const h = subset(cand(x), x.amt, () => 0.10); if (h) take(x, h); }
  for (const x of sales()) { const h = near(cand(x), x.amt); if (h) take(x, h); }
  for (const r of adj.filter(r => !r.reversed)) for (const x of sales().filter(x => x.day <= r.day && x.day >= r.day - 14 && x.amt > -r.amt).reverse()) {
    const h = near(cand(x), x.amt + r.amt); if (h) { x.reduced = r2(-r.amt); x.amt = r2(x.amt + r.amt); r.reversed = 'part of ' + x.number + ' ' + x.date; take(x, h); break; }
  }
  for (const x of sales()) { const c = cand(x).filter(o => Math.abs(o.sub - x.day) <= 1); if (c.length === 1) take(x, c); }
}
function store(s) {
  // a hand fee entry closes the week before its date (Page's 8/31/2026 entry is August's)
  const rows = (gl[s] || []).map(r => ({ ...r, amt: r2(r.debit - r.credit), day: md(r.date) - (prior(r) ? 1 : 0) }));
  const os = orders.filter(o => (moved[o.order] || loc(o.store)) === s && o.status !== 'cancelled').map(o => ({ ...o, due: moved[o.order] ? o.total : o.due, sub: ct(o.sub_at), ev: ct(o.at) }));
  pairAll(rows, os);
  // each row in pieces by week: a paired sale splits over its orders by their totals and goes with each one's delivery
  // week; an unpaired sale goes with the order placed within a day of it and closest in amount; the rest stay in the week of their date
  for (const r of rows) {
    if (!r.orders) {
      const n = sale(r) && os.filter(o => Math.abs(o.sub - r.day) <= 1).sort((a, b) => Math.abs(a.sub - r.day) - Math.abs(b.sub - r.day) || Math.abs(a.total - r.amt) - Math.abs(b.total - r.amt))[0];
      if (n) r.near = n.order;
      r.pieces = [{ week: sunday(n ? n.ev : r.day), amt: r.amt }]; continue;
    }
    const t = r.orders.reduce((a, o) => a + o.total, 0); let left = r.amt;
    r.pieces = r.orders.map((o, i) => { const a = i === r.orders.length - 1 ? r2(left) : r2(r.amt * o.total / t); left -= a; return { week: sunday(o.ev), amt: a }; });
  }
  for (const r of rows) r.week = Math.max(...r.pieces.map(p => p.week));
  // a hand fee entry covers the fees of the orders delivered by its date, earliest week first
  const P = {}; let left = r2(-rows.filter(prior).reduce((t, r) => t + r.amt, 0));
  const until = Math.max(-Infinity, ...rows.filter(prior).map(r => r.day + 1));
  for (const w of [...new Set(os.filter(o => o.ev <= until).map(o => sunday(o.ev)))].sort((a, b) => a - b)) {
    const f = r2(os.filter(o => sunday(o.ev) === w).reduce((t, o) => t + o.total - o.due, 0)); const a = Math.min(f, left);
    if (a > 0) { P[w] = r2(a); left = r2(left - a); }
  }
  if (left > 0 && Object.keys(P).length) { const w = Math.max(...Object.keys(P).map(Number)); P[w] = r2(P[w] + left); }
  return { rows, os, P };
}

const out = [], check = [];
for (const s of Object.keys(stores)) {
  const { rows, os, P: PW } = store(s);
  for (let w = iso(F); w <= iso(L); w += 7) {
    const act = rows.filter(r => r.pieces.some(p => p.week === w) && !deposit(r) && !ours(r) && !r.reversed && !prior(r))
      .map(r => ({ ...r, amt: r2(r.pieces.filter(p => p.week === w).reduce((t, p) => t + p.amt, 0)), split: r.pieces.length > 1 ? r.amt : null }));
    const A = r2(act.reduce((t, r) => t + r.amt, 0));
    const P = PW[w] || 0;
    const wo = os.filter(o => sunday(o.ev) === w);
    const due = r2(wo.reduce((t, o) => t + o.due, 0));
    const fee = r2(wo.reduce((t, o) => t + o.total - o.due, 0) - P);
    const ar = r2(A - P - due), diff = r2(ar - fee);
    if (!A && !due && !P) continue;
    const dep = rows.filter(r => deposit(r) && r.day >= w + 1 && r.day <= w + 4);
    const paid = r2(-dep.reduce((t, r) => t + r.amt, 0));
    const warnings = [];
    if (dep.length && Math.abs(paid - due) > 0.005) warnings.push(`deposit ${dep.map(r => r.date).join(', ')} ${paid.toFixed(2)} against ${due.toFixed(2)} due on orders delivered this week`);
    if (!dep.length && due) warnings.push(`no deposit yet for ${due.toFixed(2)} due on orders delivered this week`);
    for (const r of act) if (sale(r) && !r.orders) warnings.push(`R365 sale ${r.date} ${r.number} ${r.amt.toFixed(2)} matches no EZ order amount${r.near ? ', placed with ' + r.near : ''}`);
    for (const r of act) if (r.reduced) warnings.push(`R365 sale ${r.date} ${r.number} reduced by ${r.reduced.toFixed(2)} for a cancelled order`);
    for (const r of act) if (!sale(r)) warnings.push(`${r.date} ${r.number} ${r.comment} ${r.amt.toFixed(2)} on 10150 nets with no sale, left in this week`);
    for (const o of wo) if (!o.sale) warnings.push(`EZ order ${o.order} ${fmt(o.ev)} ${o.total.toFixed(2)} has no R365 sale`);
    // sale parked in 20100 by an earlier entry comes back to 42060 in its order's payout
    const adv = advances.filter(a => a.store === s && wo.some(o => o.order === a.order));
    const advance = r2(adv.reduce((t, a) => t + a.amount, 0));
    out.push({ store: s, location: stores[s], date: fmt(w), A, prior: P, due, deposit: paid, fee, ar, diff, advance, advanceOrders: adv.map(a => a.order),
      orders: wo.map(o => ({ order: o.order, submitted: fmt(o.sub), delivered: fmt(o.ev), total: o.total, due: o.due, sale: o.sale ? o.sale.date + ' ' + o.sale.number + ' ' + o.sale.amt.toFixed(2) : null })),
      r365: act.map(r => ({ date: r.date, number: r.number, comment: r.comment, amount: r.amt, splitFrom: r.split })),
      netted: rows.filter(r => r.reversed && !sale(r) && r.week === w).map(r => r.date + ' ' + r.number + ' ' + r.amt.toFixed(2) + ' nets with ' + r.reversed),
      existing: rows.filter(r => r.day === w && ours(r)).length ? true : false, warnings });
  }
  // 10150 at the last Sunday, once planned entries replace this skill's entries from the first planned week on:
  // due on orders delivered by then and not paid yet, plus R365 sales already booked for orders delivered later
  const last = iso(L), first = iso(F) - 6;
  // a recon credit that reduced a sale is already inside that sale's amount
  const bal = r2(rows.filter(r => r.day <= last && (!ours(r) || r.day < first) && !(r.reversed || '').startsWith('part of')).reduce((t, r) => t + r.amt, 0) - out.filter(p => p.store === s).reduce((t, p) => t + p.ar, 0));
  const lastPaid = Math.max(-Infinity, ...rows.filter(r => deposit(r) && r.day <= last).map(r => r.day));
  const unpaid = r2(os.filter(o => o.ev <= last && sunday(o.ev) + 2 > lastPaid).reduce((t, o) => t + o.due, 0));
  // R365 rows dated by then that no planned week has taken: sale pieces for orders delivered later, reversals not yet netted
  const ahead = r2(rows.filter(r => r.day <= last && !deposit(r) && !ours(r) && !prior(r)).reduce((t, r) =>
    t + (r.reversed && !r.reduced ? r.amt : r.pieces.filter(p => p.week > last).reduce((a, p) => a + p.amt, 0)) + (r.reduced && r.day <= last ? 0 : 0), 0)
    + rows.filter(r => r.reduced && r.day <= last).reduce((t, r) => t + r.reduced, 0)
    + rows.filter(r => r.reversed && r.reversed.startsWith('part of') && r.day <= last).reduce((t, r) => t + r.amt, 0)
    - rows.filter(r => r.reversed && r.reversed.startsWith('part of') && r.day <= last).reduce((t, r) => t + r.amt, 0));
  const lost = advances.filter(a => a.store === s && !os.some(o => o.order === a.order))
    .map(a => `20100 advance ${a.amount.toFixed(2)} parked ${a.parked} for EZ order ${a.order}: order cancelled or outside orders.json`);
  check.push({ store: s, balAfter: bal, unpaid, ahead, off: r2(bal - unpaid - ahead), ...(lost.length ? { warnings: lost } : {}) });
}
console.log(JSON.stringify({ entries: out, check }, null, 1));
