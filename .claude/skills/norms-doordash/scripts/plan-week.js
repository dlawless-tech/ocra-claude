#!/usr/bin/env node
// Expected DoorDash entry lines per store for one week, and a check against posted entries.
// usage: plan-week.js <payouts.json> <gl.json> <payout date M/D/YYYY> <entry date M/D/YYYY> [entries.json] > plan.json
//   gl.json from gl-parse.js over a GL window that holds the week's Mon-Sun.
//   entries.json (optional) from read-entry.js: {"<loc>": {id, lines:[[account,debit,credit,comment,location]]}}
// Prints mismatches and DoorDash identity failures to stderr.
const fs = require('fs');
const [pf, gf, pd, ed, ef] = process.argv.slice(2);
const P = JSON.parse(fs.readFileSync(pf, 'utf8')).summariesList.filter(p => p.payoutDate === pd);
const G = JSON.parse(fs.readFileSync(gf, 'utf8'));
const E = ef ? JSON.parse(fs.readFileSync(ef, 'utf8')) : {};
const MAP = require('./stores.json');
const n = s => parseFloat(String(s).replace(/[$,]/g, '')); const r2 = x => Math.round(x * 100) / 100;
const iso = s => { const [m, d, y] = s.split('/'); return y + '-' + m.padStart(2, '0') + '-' + d.padStart(2, '0'); };
const add = (s, k) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + k); return d.toISOString().slice(0, 10); };
const sat = iso(ed), mon = add(sat, -5), sun = add(sat, 1);
const out = [];
for (const p of P) {
  const loc = MAP[p.storeId]; if (!loc) { console.error('UNKNOWN STORE', p.storeId, p.storeName); continue; }
  const rows = (G[loc] || { rows: [] }).rows.filter(r => r.type === 'Journal Entry' && iso(r.date) >= mon && iso(r.date) <= sun && r.debit > 0);
  const D = r2(rows.reduce((s, r) => s + r.debit, 0));
  const S = n(p.sales), C = -n(p.commissionAndFees), M = -n(p.marketingSpend), A = n(p.amendments), N = n(p.netPayout);
  if (Math.abs(S - C - M + A - N) > 0.005) console.error(loc, 'DOORDASH IDENTITY FAILS', p.payoutId);
  const dif = r2(D - S);
  const lines = {
    'a/r doordash - payout': [0, r2(D - N)],
    'commission & fees': [C, 0],
    'marketing spend': [M, 0],
    'amendments': A < 0 ? [-A, 0] : [0, A],
    'difference': dif >= 0 ? [dif, 0] : [0, -dif],
  };
  const x = { loc, payoutId: p.payoutId, sales: S, commission: C, marketing: M, amendments: A, net: N, D, lines };
  const e = E[loc];
  if (e) {
    x.id = e.id; const got = {}; for (const l of e.lines) got[l[3]] = [l[1], l[2]];
    x.wrong = Object.keys(lines).filter(k => !got[k] || Math.abs(got[k][0] - lines[k][0]) > 0.005 || Math.abs(got[k][1] - lines[k][1]) > 0.005);
    if (x.wrong.length) console.error(loc.padEnd(17), x.wrong.map(k => k + ' posted ' + (got[k] || '?') + ' want ' + lines[k]).join(' | '));
  }
  out.push(x);
}
console.error(out.length + ' stores' + (ef ? ', ' + out.filter(x => x.wrong && x.wrong.length).length + ' wrong' : ''));
console.log(JSON.stringify(out, null, 1));
