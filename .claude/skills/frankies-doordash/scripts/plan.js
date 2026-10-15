// Plan one Monday-to-Sunday week per store from dd-payouts.sh and gl-parse.js output.
// usage: node plan.js <payouts.json> <gl.json> <Sunday M/D/YYYY> > plan.json
// A payout belongs to the week its covered window starts in (New York time). Prints warnings to stderr.
const fs = require('fs');
const [pf, gf, sunday] = process.argv.slice(2);
const P = JSON.parse(fs.readFileSync(pf, 'utf8')), G = JSON.parse(fs.readFileSync(gf, 'utf8'));
const r2 = v => Math.round(v * 100) / 100;
const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const ny = t => ymd(new Date(new Date(t).toLocaleString('en-US', { timeZone: 'America/New_York' })));
const gd = s => { const [M, D, Y] = s.split('/'); return Y + '-' + M.padStart(2, '0') + '-' + D.padStart(2, '0'); };
const [m, d, y] = sunday.split('/').map(Number); const sun = new Date(y, m - 1, d);
if (sun.getDay() !== 0) { console.error('STOP: ' + sunday + ' is not a Sunday'); process.exit(1); }
const mon = new Date(sun); mon.setDate(sun.getDate() - 6); const A = ymd(mon), B = ymd(sun);
const warn = s => console.error('WARN ' + s);
const out = [];
for (const store of ['Frankies 457', 'F&F Pizzeria']) {
  const ps = P.filter(p => p.store === store && ny(p.start) >= A && ny(p.start) <= B);
  for (const p of ps) {
    if (Math.abs(r2(p.sales + p.fees + p.mkt + p.amd) - p.net) > 0.005) { console.error(`STOP: ${store} payout ${p.id} does not close to its net`); process.exit(1); }
    if (ny(p.end) > B) warn(`${store} payout ${p.id} window runs past ${B} (${ny(p.end)})`);
    if (Math.abs(p.amd) > 1000) warn(`${store} payout ${p.id} amendment ${p.amd}: likely DoorDash Capital, booked off 1230; check before posting`);
  }
  const D = r2(G.filter(x => x.loc === store && x.type === 'Journal Entry' && x.cm === 'Third Party Delivery' && gd(x.d) >= A && gd(x.d) <= B).reduce((s, x) => s + x.dr, 0));
  const glDays = new Set(G.filter(x => x.loc === store && x.cm === 'Third Party Delivery' && gd(x.d) >= A && gd(x.d) <= B).map(x => gd(x.d)));
  const covered = d => ps.some(p => ny(p.start) <= d && ny(p.end) >= d);
  const bare = [...glDays].filter(d => !covered(d));
  if (bare.length) warn(`${store}: GL sales on ${bare.join(", ")} with no payout covering them yet`);
  for (const x of G.filter(x => x.loc === store && x.cm === 'Third Party Delivery' && gd(x.d) >= A && gd(x.d) <= B)) {
    if (G.filter(z => z.loc === store && z.num === x.num && z.cm === x.cm && z.dr === x.dr).length > 1) { warn(`${store}: ${x.num} on ${x.d} carries its DoorDash line twice (doubled DSS)`); break; }
  }
  const t = k => r2(ps.reduce((s, p) => s + p[k], 0));
  const sales = t('sales'), net = t('net');
  const plan = { store, entryDate: sunday, D, sales, net, payouts: ps.map(p => p.id),
    ar: r2(D - net), fees: r2(-t('fees')), mkt: r2(-t('mkt')), amd: r2(-t('amd')), diff: r2(D - sales) };
  out.push(plan);
}
console.log(JSON.stringify(out, null, 1));
