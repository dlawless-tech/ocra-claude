// Build a work file for one entry date from Grubhub deposits, the GL report and the store templates.
// usage: node build-work.js <deps.json> <gl.json> <templates.json> <from> <to> <out.json> [sid,sid,...]
//   from/to: the sales window the entry covers (YYYY-MM-DD), the same window the GL report ran over.
//   A deposit is counted when its latest sales day falls inside the window. Extra sids force a deposit in,
//   for a deposit that reaches back into a part already posted.
// templates.json comes from read-entries.sh; each record's id is the entry to fill.
const fs = require('fs');
const [depsF, glF, tplF, from, to, outF, extra] = process.argv.slice(2);
const MAP = {'S Indian Hill Blvd': 'Claremont', 'Valley Blvd': 'El Monte', 'Lakewood Blvd': 'Lakewood', 'N La Cienega Blvd': 'La Cienega', 'E Slauson Ave': 'Slauson', 'E 17th St': 'Santa Ana', 'Hawthorne Blvd': 'North Torrance', 'Tyler St': 'Riverside', 'Rosemead Blvd': 'Pico Rivera', 'N Azusa Ave': 'West Covina', 'Whittier Blvd': 'Whittier', 'N Euclid St': 'Anaheim', 'Beach Blvd': 'Huntington Beach', 'E Katella Ave': 'Orange', 'Sherman Way': 'Van Nuys', 'Firestone Blvd': 'Downey', 'Harbor Blvd': 'Costa Mesa', 'S Avalon Blvd': 'Carson', 'Pacific Coast Hwy': 'South Torrance', 'W Imperial Hwy': 'Inglewood', 'Renaissance Pkwy': 'Rialto', 'East Mills Circle': 'Ontario', 'Hollywood Boulevard': 'Hollywood', 'W Charleston Blvd': 'Las Vegas'};
const locOf = st => { for (const k in MAP) if (st.includes(k)) return MAP[k]; return null; };
const rd = f => { let j = JSON.parse(fs.readFileSync(f, 'utf8')); return typeof j === 'string' ? JSON.parse(j) : j; };
const deps = rd(depsF); for (const x of deps) { x.loc = locOf(x.street); x.last = Object.keys(x.days).sort().pop() || ''; }
const gl = rd(glF), tpl = rd(tplF), force = (extra || '').split(',').filter(Boolean);
const r2 = v => Math.round(v * 100) / 100;
const FIXED = ['ar grubhub - deposit', 'commissions', 'delivery commissions', 'order processing fees', 'sales tax'];
const work = [], skipped = [];
for (const t of tpl) {
  const L = t.loc;
  const ds = deps.filter(x => x.loc === L && ((x.last >= from && x.last <= to) || force.includes(x.sid)));
  const D = (gl[L] || {D: 0}).D;
  if (!ds.length && !D) { skipped.push(L + ': no deposit, no sales'); continue; }
  if (!ds.length) { skipped.push(L + ': sales ' + D.toFixed(2) + ' but no deposit'); continue; }
  const sum = f => ds.reduce((a, x) => a + (x.T[f] || 0), 0) / 100;
  const net = r2(ds.reduce((a, x) => a + x.total, 0) / 100), gross = r2(sum('prepaid_total'));
  const ar = r2(D - net), com = r2(-sum('commission_total')), del = r2(-sum('grubhub_delivery_fee_total')), pf = r2(-sum('processing_fee')), tax = r2(-sum('withheld_sales_tax'));
  const plug = r2(ar - com - del - pf - tax);
  const plugC = t.L.map(l => l[3]).find(c => c && !FIXED.includes(c));
  if (!plugC) { skipped.push(L + ': template has no plug line'); continue; }
  if (tax && !t.L.some(l => l[3] === 'sales tax')) { skipped.push(L + ': withheld tax ' + tax + ' but no sales tax line'); continue; }
  const lines = [{comment: 'ar grubhub - deposit', col: ar >= 0 ? 'credit' : 'debit', amount: Math.abs(ar)}, {comment: 'commissions', col: 'debit', amount: com}, {comment: 'delivery commissions', col: 'debit', amount: del}, {comment: 'order processing fees', col: 'debit', amount: pf}];
  if (tax) lines.push({comment: 'sales tax', col: 'debit', amount: tax});
  lines.push({comment: plugC, col: plug >= 0 ? 'debit' : 'credit', amount: Math.abs(plug)});
  const dr = r2(lines.filter(l => l.col === 'debit').reduce((a, l) => a + l.amount, 0)), cr = r2(lines.filter(l => l.col === 'credit').reduce((a, l) => a + l.amount, 0));
  if (dr !== cr) throw new Error(L + ' unbalanced ' + dr + '/' + cr);
  if (!tax && Math.abs(r2(D - gross) - plug) > 0.005) throw new Error(L + ' plug is not D - gross');
  work.push({loc: L, id: t.id, deps: ds.map(x => x.sid), D, net, gross, tot: dr, lines});
  console.log(L.padEnd(17), ds.map(x => x.sid).join('+').padEnd(16), 'D', D.toFixed(2).padStart(7), 'net', net.toFixed(2).padStart(7), 'ar', ar.toFixed(2).padStart(7), 'fees', r2(com + del + pf).toFixed(2).padStart(7), 'tax', tax.toFixed(2), 'plug', plug.toFixed(2).padStart(7), 'tot', dr.toFixed(2));
}
const used = new Set(work.flatMap(w => w.deps));
for (const x of deps) if (x.loc && !used.has(x.sid) && x.last < from && x.created.slice(0, 10) > to) skipped.push('deposit ' + x.sid + ' (' + x.loc + ', last sales ' + x.last + ') falls before the window: already counted, or pass it as an extra sid');
fs.writeFileSync(outF, JSON.stringify(work, null, 1));
for (const s of skipped) console.log('NOTE ' + s);
