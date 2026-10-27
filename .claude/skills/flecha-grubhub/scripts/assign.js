// Store for each Grubhub deposit whose 1242 line sits at Corporate, matched by amount.
// usage: node assign.js gl.txt [--all]   (--all treats every Grubhub deposit as Corporate, to test)
// Prints "<BD>|<M/D/YYYY>|<amount>|<location>" or "<BD>|<M/D/YYYY>|<amount>|AMBIGUOUS <reason>".
// A deposit pays one store's Tue-Mon week that ended 4 to 10 days before it, at a fee of 10% to 45%
// of that week's sales; deposits on one day go to different stores. Two fits: the one nearer each
// store's past fee rate wins by 10 points or more, else neither.
const fs = require('fs');
const [file, flag] = process.argv.slice(2);
const d = s => { const [m, dd, y] = s.split('/').map(Number); return new Date(y, m - 1, dd); };
const add = (x, n) => { const y = new Date(x); y.setDate(y.getDate() + n); return y; };
const mdy = x => `${x.getMonth() + 1}/${x.getDate()}/${x.getFullYear()}`;
const md = x => `${x.getMonth() + 1}/${x.getDate()}`;
const c = s => Math.round(Number(String(s).replace(/,/g, '')) * 100);
const STORES = { 'Flecha 4S Ranch': '103 - Flecha 4S Ranch', 'Flecha HB': '101 - Flecha HB', 'Flecha NB': '104 - Flecha NB', 'Flecha Town Square': '102 - Flecha Town Square' };

const rows = [];
for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
  const r = line.split('|');
  if (!/^\d+\/\d+\/\d{4}$/.test(r[0])) continue;
  rows.push({ dt: d(r[0]), type: r[1], ref: r[2], store: r[3], comment: r.length > 7 ? r[4] : '', dr: c(r[r.length - 3]), cr: c(r[r.length - 2]) });
}
const isDep = r => r.type === 'Bank Deposit' && /GRUBHUB/i.test(r.comment);
const placed = rows.filter(r => isDep(r) && STORES[r.store]);
// August Corporate deposits were cleared by the 3rd Party entries; leave them
const loose = rows.filter(r => isDep(r) && r.dt >= new Date(2026, 8, 1) && (flag === '--all' || !STORES[r.store]));
const week = dt => { let mon = add(dt, -4); while (mon.getDay() !== 1) mon = add(mon, -1); return [add(mon, -6), mon]; };
const salesOf = (st, [a, b]) => rows.filter(r => r.store === st && r.type === 'Journal Entry' && /^JE[0-9]+$/.test(r.ref) && r.dt >= a && r.dt <= b).reduce((s, r) => s + r.dr - r.cr, 0);
const feeOf = (sales, amt) => (sales - amt) / sales;
const inBand = f => f >= 0.10 && f <= 0.45;
// store's fee rate over its last 4 store-coded deposits before a day
const rateOf = (st, dt) => {
  const h = placed.filter(r => r.store === st && r.dt < dt).map(r => ({ s: salesOf(st, week(r.dt)), a: r.cr - r.dr }))
    .filter(x => x.s > 0 && inBand(feeOf(x.s, x.a))).slice(-4);
  return h.length ? h.reduce((t, x) => t + x.s - x.a, 0) / h.reduce((t, x) => t + x.s, 0) : null;
};

const byDay = new Map();
for (const r of loose) byDay.set(mdy(r.dt), [...(byDay.get(mdy(r.dt)) || []), r]);
for (const [day, deps] of byDay) {
  const dt = d(day), wk = week(dt), [tue, mon] = wk;
  const cands = Object.keys(STORES)
    .filter(st => !placed.some(r => r.store === st && r.dt > mon && r.dt <= add(mon, 10) && !deps.includes(r)))
    .map(st => ({ st, sales: salesOf(st, wk), rate: rateOf(st, dt) })).filter(x => x.sales > 0);
  // every fit, a deposit may stay unplaced; keep those placing the most
  let fits = [];
  const walk = (i, used, pick, score) => {
    if (i === deps.length) return fits.push({ pick, score, n: pick.filter(Boolean).length });
    const amt = deps[i].cr - deps[i].dr;
    walk(i + 1, used, [...pick, null], score);
    for (const x of cands) {
      const f = feeOf(x.sales, amt);
      if (!used.has(x.st) && inBand(f)) walk(i + 1, new Set([...used, x.st]), [...pick, x.st], score + (x.rate == null ? 0 : Math.abs(f - x.rate)));
    }
  };
  walk(0, new Set(), [], 0);
  const most = Math.max(...fits.map(f => f.n));
  fits = most ? fits.filter(f => f.n === most).sort((a, b) => a.score - b.score) : [];
  const best = fits.length === 1 || (fits.length > 1 && fits[1].score - fits[0].score >= 0.10) ? fits[0] : null;
  const sales = cands.map(x => `${x.st} ${(x.sales / 100).toFixed(2)}`).join(', ') || 'none';
  deps.forEach((r, i) => {
    const amt = ((r.cr - r.dr) / 100).toFixed(2);
    const st = best && best.pick[i];
    const could = [...new Set(fits.map(f => f.pick[i]).filter(Boolean))];
    if (st) console.log(`${r.ref}|${day}|${amt}|${STORES[st]}`);
    else console.log(`${r.ref}|${day}|${amt}|AMBIGUOUS ${could.length ? 'could be ' + could.join(' or ') : 'no store fits'} (sales ${md(tue)}-${md(mon)}: ${sales})`);
  });
}
