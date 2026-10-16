// Plan one week's entry per store from dd-payouts.sh and gl-parse.js output.
// usage: node plan.js <pay.json> <gl.json> <Sunday M/D/YYYY> > plan.json
// The week's payouts are those due to deposit the Monday to Friday after the Sunday (next weekday after the payout date),
// so the Sunday balance equals those deposits. Each payout is matched to its 10130 deposit to catch one booked elsewhere.
// ar = D - net is the 10130 credit; D is the week's Third Party Delivery debits.
const fs = require('fs');
const [pf, gf, sunday] = process.argv.slice(2);
const P = JSON.parse(fs.readFileSync(pf, 'utf8')), G = JSON.parse(fs.readFileSync(gf, 'utf8'));
const STORES = ['MX', 'SLU', 'Skinker', 'Page', 'Fenton', 'Kirkwood', 'Spirit'];
const r2 = v => Math.round(v * 100) / 100;
const iso = s => { const [M, D, Y] = s.split('/'); return Y + '-' + M.padStart(2, '0') + '-' + D.padStart(2, '0'); };
const add = (s, n) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
// scheduled deposit: next weekday after the payout date; a bank holiday delay keeps the payout in its week
const nextWeekday = s => { let d = add(s, 1); while ([0, 6].includes(new Date(d + 'T12:00:00Z').getUTCDay())) d = add(d, 1); return d; };
const ct = t => new Date(t).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
const B = iso(sunday), A = add(B, -6);
if (new Date(B + 'T12:00:00Z').getUTCDay() !== 0) { console.error('STOP: ' + sunday + ' is not a Sunday'); process.exit(1); }
const glEnd = G.reduce((m, x) => iso(x.d) > m ? iso(x.d) : m, '');
const out = [];
for (const store of STORES) {
  const rows = G.filter(x => x.loc.endsWith(' - ' + store));
  const deps = rows.filter(x => x.type === 'Bank Deposit');
  const used = new Set();
  const PS = P.filter(p => p.store === store).sort((a, b) => iso(a.date) < iso(b.date) ? -1 : 1).map(p => {
    const i = deps.findIndex((x, j) => !used.has(j) && Math.abs(x.cr - x.dr - p.net) < 0.005 && iso(x.d) >= iso(p.date) && iso(x.d) <= add(iso(p.date), 10));
    if (i >= 0) used.add(i);
    return { ...p, dep: nextWeekday(iso(p.date)), booked: i >= 0 };
  });
  const ps = PS.filter(p => p.dep > B && p.dep <= add(B, 7));
  const dss = rows.filter(x => x.type === 'Journal Entry' && x.cm === 'Third Party Delivery' && iso(x.d) >= A && iso(x.d) <= B);
  if (!ps.length && !dss.length) continue;
  const warnings = [];
  const bad = ps.filter(p => Math.abs(r2(p.sales + p.fees + p.mkt + p.amd) - p.net) > 0.005).map(p => p.id);
  for (const p of ps) {
    if (Math.abs(p.amd) > 500) warnings.push(`payout ${p.id} amendment ${p.amd.toFixed(2)}, booked through 70400`);
    if (!p.booked && p.dep <= glEnd) warnings.push(`payout ${p.id} net ${p.net.toFixed(2)} paid ${p.date} has no 10130 deposit yet`);
  }
  for (const p of PS.filter(p => !p.booked && p.dep <= B && p.dep >= A)) warnings.push(`payout ${p.id} net ${p.net.toFixed(2)} paid ${p.date} never reached 10130; the balance carries it`);
  const D = r2(dss.reduce((s, x) => s + x.dr, 0));
  // a sales day no payout covers yet means DoorDash has not paid the week out
  const bare = [...new Set(dss.map(x => iso(x.d)))].filter(d => !PS.some(p => ct(p.start) <= d && ct(p.end) >= d));
  for (const x of dss) if (dss.some(z => z.num !== x.num && z.d === x.d)) { warnings.push(`two sales summaries on ${x.d} (doubled DSS)`); break; }
  const t = k => r2(ps.reduce((s, p) => s + p[k], 0));
  const sales = t('sales'), net = t('net');
  const plan = { store, entryDate: sunday, D, sales, net, fees: r2(-t('fees')), mkt: r2(-t('mkt')), amd: t('amd'), diff: r2(D - sales), ar: r2(D - net),
    payouts: ps.map(p => p.id), deposits: ps.map(p => p.dep), uncovered: bare, warnings };
  if (bad.length) plan.fail = 'payouts do not close to their net: ' + bad.join(', ');
  else if (!ps.length) plan.fail = 'no payout';
  if (bare.length) warnings.push(`R365 sales on ${bare.join(', ')} with no payout covering them yet`);
  if (Math.abs(plan.diff) > 400) warnings.push(`D less DoorDash sales is ${plan.diff.toFixed(2)}`);
  out.push(plan);
}
console.log(JSON.stringify(out, null, 1));
