// Uber reads + GL -> work.json for post-entry.sh / edit-entry.sh, plus the prior-week check
// usage: node build-work.js <uber.jsonl> <gl-cur.json> <gl-prior.json> <entries.json> <work.json>
const fs = require('fs');
const [uf, cf, pf, ef, wf] = process.argv.slice(2);
const MAP = {Bellflower: 'Lakewood', 'Los Angeles': 'La Cienega', 'Huntington Park': 'Slauson', 'Ontario Mills': 'Ontario'};
// "NORMS - Carson", "NORMS - Van Nuys (Los Angeles)", "NORMS (Inglewood)", "NORMS (Hollywood) (Los Angeles)"
const loc = s => { const p = s.match(/^norms\s*\(([^)]*)\)/i); const w = (p ? p[1] : s.replace(/^norms\s*-\s*/i, '').replace(/\s*\(.*$/, '')).trim(); return MAP[w] || w; };
const r2 = x => Math.round(x * 100) / 100;
const uber = fs.readFileSync(uf, 'utf8').split(/\r?\n/).filter(Boolean).map(l => { let o = JSON.parse(l); return typeof o === 'string' ? JSON.parse(o) : o; });
const cur = JSON.parse(fs.readFileSync(cf, 'utf8')), prior = JSON.parse(fs.readFileSync(pf, 'utf8'));
const ents = JSON.parse(fs.readFileSync(ef, 'utf8'));
const work = [], seen = new Set();
for (const u of uber) {
  if (u.error) { console.log('READ FAIL', u.store, u.error); continue; }
  const L = loc(u.store); seen.add(L);
  const g = cur[L], e = ents.find(x => x.loc === L);
  if (!g || !e) { console.log('NO MATCH', u.store, '->', L); continue; }
  const p = prior[L], expDep = r2(p.D - p.jeCr), dep = r2(g.deps.reduce((a, d) => a + d.cr, 0));
  const D = g.D, ar = r2(D - u.payout), diff = r2(D - u.earnings - u.other);
  const r = {loc: L, id: e.id, arCredit: ar, marketing: u.marketing, fees: u.fees, ncDr: u.nc < 0 ? -u.nc : 0, ncCr: u.nc > 0 ? u.nc : 0, diffDr: diff > 0 ? diff : 0, diffCr: diff < 0 ? -diff : 0};
  r.totDr = r2(r.marketing + r.fees + r.ncDr + r.diffDr);
  const cr = r2(r.arCredit + r.ncCr + r.diffCr);
  const check = Math.abs(expDep - dep) < 0.005 ? 'ok' : `MISMATCH prior D-credit ${expDep} vs deposit ${dep}`;
  const flags = [cr !== r.totDr ? `UNBALANCED ${r.totDr}/${cr}` : '', u.other ? `other ${u.other} in difference` : '', /–/.test(u.period || '') && !/^Oct 5/.test(u.period) ? 'period ' + u.period : ''].filter(Boolean);
  r.prior = check; r.period = u.period; r.flags = flags;
  work.push(r);
  console.log(L.padEnd(17), 'D', D.toFixed(2).padStart(8), 'E', u.earnings.toFixed(2).padStart(8), 'P', u.payout.toFixed(2).padStart(8), 'AR', ar.toFixed(2).padStart(8), 'mk', u.marketing.toFixed(2).padStart(7), 'fee', u.fees.toFixed(2).padStart(7), 'nc', u.nc.toFixed(2).padStart(7), 'diff', diff.toFixed(2).padStart(8), 'tot', r.totDr.toFixed(2).padStart(8), check, flags.join('; '));
}
for (const L in cur) if (!seen.has(L)) console.log('NO UBER READ for', L);
fs.writeFileSync(wf, JSON.stringify(work, null, 1));
console.log(work.length + ' stores, total ' + r2(work.reduce((a, r) => a + r.totDr, 0)).toFixed(2));
