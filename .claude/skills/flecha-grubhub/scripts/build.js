// Fee lines for Flecha GrubHub entries, actual or estimate, from gl-1242.sh rows.
// usage: node build.js gl.txt <report end M/D/YYYY> <entry date M/D/YYYY>...
// A period whose sales a deposit has settled is an actual: sales less deposit.
// Otherwise an estimate: sales x the store's rate over its last 4 actual periods with sales.
const fs = require('fs');
const [file, endArg, ...entries] = process.argv.slice(2);
const d = s => { const [m, dd, y] = s.split('/').map(Number); return new Date(y, m - 1, dd); };
const add = (x, n) => { const y = new Date(x); y.setDate(y.getDate() + n); return y; };
const md = x => `${x.getMonth() + 1}/${x.getDate()}`;
const mdy = x => `${md(x)}/${x.getFullYear()}`;
const c = s => Math.round(Number(String(s).replace(/,/g, '')) * 100);
const STORES = { 'Flecha 4S Ranch': '103 - Flecha 4S Ranch', 'Flecha HB': '101 - Flecha HB', 'Flecha NB': '104 - Flecha NB', 'Flecha Town Square': '102 - Flecha Town Square' };

const rows = [];
for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
  const r = line.split('|');
  if (!/^\d+\/\d+\/\d{4}$/.test(r[0]) || !STORES[r[3]]) continue;
  rows.push({ dt: d(r[0]), type: r[1], ref: r[2], store: r[3], comment: r.length > 7 ? r[4] : '', dr: c(r[r.length - 3]), cr: c(r[r.length - 2]) });
}
const first = rows.reduce((m, r) => r.dt < m ? r.dt : m, d(endArg)), END = d(endArg);

// Tuesday-to-Monday weeks, split at month end; entry dated the Sunday inside, else the period end
const periods = [];
let t = add(first, -((first.getDay() + 5) % 7) - 7);
while (t <= END) {
  const mon = add(t, 6);
  const cut = new Date(t.getFullYear(), t.getMonth() + 1, 0);
  const parts = cut < mon ? [[t, cut], [add(cut, 1), mon]] : [[t, mon]];
  for (const [a, b] of parts) {
    let sun = null; for (let x = new Date(a); x <= b; x = add(x, 1)) if (x.getDay() === 0) sun = x;
    periods.push({ a, b, entry: sun || b });
  }
  t = add(t, 7);
}

const salesOf = (p, store) => rows.filter(r => r.store === store && r.type === 'Journal Entry' && /^JE[0-9]+$/.test(r.ref) && r.dt >= p.a && r.dt <= p.b).reduce((s, r) => s + r.dr - r.cr, 0);
// each deposit settles the latest period ending before it whose sales are still open; around
// month end the last full week and the stub after it pay on the same Friday
const settledBy = new Map();
for (const store of Object.keys(STORES)) {
  const deps = rows.filter(r => r.store === store && r.type === 'Bank Deposit' && /GRUBHUB/i.test(r.comment)).sort((x, y) => x.dt - y.dt);
  for (const r of deps) {
    const open = periods.filter(p => p.b < r.dt && add(p.b, 10) >= r.dt && salesOf(p, store) > 0 && !settledBy.has(store + mdy(p.a)));
    const p = open[open.length - 1];
    if (!p) { settledBy.set('orphan' + r.ref, r); continue; }
    if (open.length > 1 && open.some(q => q !== p && add(q.b, 7) >= r.dt)) p.check = true;
    settledBy.set(store + mdy(p.a), r);
  }
}
const figures = (p, store) => {
  const dep = settledBy.get(store + mdy(p.a));
  return { sales: salesOf(p, store), deposit: dep ? dep.cr - dep.dr : 0, bds: dep ? [`${dep.ref} ${md(dep.dt)}`] : [],
    settled: !!dep || add(p.b, 7) <= END, check: !!p.check };
};
const orphans = [...settledBy].filter(([k]) => k.startsWith('orphan')).map(([, r]) => `${r.store} ${r.ref} ${md(r.dt)} ${(r.cr - r.dr) / 100}`);
if (orphans.length) console.error('deposits matched to no period: ' + orphans.join('; '));

const out = [];
for (const e of entries) {
  const p = periods.find(x => mdy(x.entry) === mdy(d(e)));
  if (!p) { console.error(`no period for entry ${e}`); process.exit(1); }
  const span = `${md(p.a)}-${md(p.b)}`;
  for (const [store, location] of Object.entries(STORES)) {
    const f = figures(p, store);
    const row = { entry: mdy(p.entry), period: span, store, location, sales: f.sales / 100 };
    if (f.settled) {
      if (f.sales && !f.deposit) row.flag = 'NO DEPOSIT';
      if (f.check) row.flag = 'CHECK DEPOSIT MATCH';
      Object.assign(row, { basis: 'actual', deposit: f.deposit / 100, deposits: f.bds, fee: (f.sales - f.deposit) / 100,
        comment: f.sales || f.deposit ? `GrubHub fees: sales ${span} ${(f.sales / 100).toFixed(2)} less ${f.bds.map(x => x.split(' ')[1]).join('+') || 'no'} deposit ${(f.deposit / 100).toFixed(2)}` : `GrubHub fees: no sales ${span}` });
    } else {
      const hist = (st) => periods.filter(x => x.b < p.a && add(x.b, 7) <= END).map(x => figures(x, st)).filter(x => x.sales > 0 && x.deposit > 0).slice(-4);
      let h = hist(store), label = `${h.length} period avg`;
      if (!h.length) { h = Object.keys(STORES).flatMap(hist); label = 'all-store avg'; }
      const rate = h.reduce((s, x) => s + x.sales - x.deposit, 0) / h.reduce((s, x) => s + x.sales, 0);
      const r4 = Math.round(rate * 10000) / 100;
      Object.assign(row, { basis: 'estimate', rate: r4, fee: Math.round(f.sales * rate) / 100,
        comment: f.sales ? `GrubHub fees estimate: sales ${span} ${(f.sales / 100).toFixed(2)} x ${r4.toFixed(2)}% (${label})` : `GrubHub fees estimate: no sales ${span}` });
    }
    out.push(row);
  }
}
console.log(JSON.stringify(out, null, 1));
