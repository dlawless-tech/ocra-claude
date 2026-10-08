// orders csv + 1118 GL -> one plan row per store with EZ activity in the window.
// usage: plan.js <orders.csv> <gl.json> <start M/D/YYYY> <end M/D/YYYY> > plan.json
// D = R365 JE debits in the window; fee = Commission + Payment Transaction Fee.
// Orders with no R365 sale are missing sales: their CTD + fee goes to 4010, the rest of D - CTD - fee to 5915.
// balAfter = 1118 balance after the entry, ignoring sales dated after the window; 0 once the window's payouts are coded.
const fs = require('fs'), path = require('path');
const [, , CSV, GL, S, E] = process.argv; const gl = require(path.resolve(GL));
const L = fs.readFileSync(CSV, 'utf8').split(/\r?\n/).filter(Boolean); const h = L[0].split(',');
const P = l => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map(s => s.replace(/,$/, '').replace(/^"|"$/g, ''));
const orders = L.slice(1).map(P).map(c => Object.fromEntries(h.map((k, i) => [k, c[i]]))).filter(x => x['Order Number'] && x['Order Number'] !== 'Total');
const name = { 'Ontario Mills': 'Ontario', 'S. Torrance': 'South Torrance' };
const r2 = v => Math.round(v * 100) / 100; const day = s => new Date(s).getTime() / 864e5;
const A = new Date(S), B = new Date(E);
const xd = v => { const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(+v) * 864e5); return (d.getUTCMonth() + 1) + '/' + d.getUTCDate() + '/' + d.getUTCFullYear(); };
for (const x of orders) {
  x.loc = name[x['Store Name']] || x['Store Name']; x.date = xd(x['Event Date']);
  x.ctd = +x['Caterer Total Due']; x.fee = r2(-x['Commission'] - x['Payment Transaction Fee']);
  x.food = +x['Food Total'] + +x['Promotion']; x.tax = +x['Sales Tax'];
}
const locs = new Set([...Object.keys(gl), ...orders.map(x => x.loc)]);
const out = [];
for (const loc of locs) {
  const os = orders.filter(x => x.loc === loc);
  const rows = gl[loc] ? gl[loc].rows : [];
  const inW = r => new Date(r.date) >= A && new Date(r.date) <= B;
  const sales = rows.filter(r => r.type === 'Journal Entry' && r.debit && inW(r)).map(r => ({ ...r, order: null }));
  // pair each R365 sale with the nearest-dated unmatched order, within a day before to five after, closest amount on ties
  for (const s of sales) {
    const c = os.filter(x => !x.sale && day(s.date) - day(x.date) >= -1 && day(s.date) - day(x.date) <= 5)
      .sort((a, b) => Math.abs(day(s.date) - day(a.date)) - Math.abs(day(s.date) - day(b.date)) || Math.abs(s.debit - a.food - a.tax) - Math.abs(s.debit - b.food - b.tax));
    if (c[0]) { c[0].sale = s; s.order = c[0]['Order Number']; }
  }
  const D = r2(sales.reduce((t, r) => t + r.debit, 0));
  const ctd = r2(os.reduce((t, x) => t + x.ctd, 0)), fee = r2(os.reduce((t, x) => t + x.fee, 0));
  if (!D && !ctd) continue;
  const missing = os.filter(x => !x.sale).map(x => ({ order: x['Order Number'], date: x.date, food: r2(x.food), due: x.ctd, amount: r2(x.ctd + x.fee) }));
  const miss = r2(missing.reduce((t, m) => t + m.amount, 0));
  const ar = r2(D - ctd), diff = r2(ar - fee + miss);
  const bal = r2(rows.filter(r => !(r.type === 'Journal Entry' && r.debit && new Date(r.date) > B)).reduce((t, r) => t + (r.debit || 0) - (r.credit || 0), 0));
  const warnings = [];
  for (const s of sales) if (!s.order) warnings.push(`R365 sale ${s.date} ${s.debit.toFixed(2)} has no EZ Cater order`);
  if (Math.abs(bal - ar) > 0.005) warnings.push(`1118 sits at ${(bal - ar).toFixed(2)} after this entry (payouts not coded yet, or an earlier leftover)`);
  out.push({ loc, orders: os.length, D, ctd, fee, ar, miss, diff, balAfter: r2(bal - ar), missing, warnings });
}
console.log(JSON.stringify(out.sort((a, b) => a.loc.localeCompare(b.loc)), null, 1));
