// Plan one Monday-to-Sunday week per store from dd-payouts.sh and gl-parse.js output.
// usage: node plan.js <pay.json> <gl.json> <Sunday M/D/YYYY> > plan.json
// A payout belongs to the week its covered window starts in (Central time). ar = D - net, the 10130 credit and 70400 debit.
const fs = require('fs');
const [pf, gf, sunday] = process.argv.slice(2);
const P = JSON.parse(fs.readFileSync(pf, 'utf8')), G = JSON.parse(fs.readFileSync(gf, 'utf8'));
const STORES = ['MX', 'SLU', 'Skinker', 'Page', 'Fenton', 'Kirkwood', 'Spirit'];
const r2 = v => Math.round(v * 100) / 100;
const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const ct = t => new Date(t).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
const gd = s => { const [M, D, Y] = s.split('/'); return Y + '-' + M.padStart(2, '0') + '-' + D.padStart(2, '0'); };
const [m, d, y] = sunday.split('/').map(Number); const sun = new Date(y, m - 1, d);
if (sun.getDay() !== 0) { console.error('STOP: ' + sunday + ' is not a Sunday'); process.exit(1); }
const mon = new Date(sun); mon.setDate(sun.getDate() - 6); const A = ymd(mon), B = ymd(sun);
const out = [];
for (const store of STORES) {
  const loc = x => x.loc.endsWith(' - ' + store);
  const warnings = [];
  const ps = P.filter(p => p.store === store && ct(p.start) >= A && ct(p.start) <= B);
  const dss = G.filter(x => loc(x) && x.type === 'Journal Entry' && x.cm === 'Third Party Delivery' && gd(x.d) >= A && gd(x.d) <= B);
  if (!ps.length && !dss.length) continue;
  const bad = ps.filter(p => Math.abs(r2(p.sales + p.fees + p.mkt + p.amd) - p.net) > 0.005).map(p => p.id);
  for (const p of ps) {
    if (ct(p.end) > B) warnings.push(`payout ${p.id} window runs past ${B} (${ct(p.end)})`);
    if (Math.abs(p.amd) > 500) warnings.push(`payout ${p.id} amendment ${p.amd.toFixed(2)}, booked through 70400`);
  }
  const D = r2(dss.reduce((s, x) => s + x.dr, 0));
  const bare = [...new Set(dss.map(x => gd(x.d)))].filter(d => !ps.some(p => ct(p.start) <= d && ct(p.end) >= d));
  for (const x of dss) if (dss.some(z => z.num !== x.num && z.d === x.d)) { warnings.push(`two sales summaries on ${x.d} (doubled DSS)`); break; }
  const t = k => r2(ps.reduce((s, p) => s + p[k], 0));
  const sales = t('sales'), net = t('net');
  const plan = { store, entryDate: sunday, D, sales, net, fees: r2(-t('fees')), mkt: r2(-t('mkt')), amd: t('amd'), diff: r2(D - sales), ar: r2(D - net), payouts: ps.map(p => p.id), uncovered: bare, warnings };
  if (bad.length) plan.fail = 'payouts do not close to their net: ' + bad.join(', ');
  else if (!ps.length) plan.fail = 'no payout';
  if (bare.length) warnings.push(`R365 sales on ${bare.join(', ')} with no payout covering them yet`);
  if (Math.abs(plan.diff) > 400) warnings.push(`D less DoorDash sales is ${plan.diff.toFixed(2)}`);
  out.push(plan);
}
console.log(JSON.stringify(out, null, 1));
