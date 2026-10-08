// plan.js <orders.csv> <gl.json> <start> <end>: per store D, CTD, fee, the three lines, and the 1118 balance after the entry
const fs = require('fs'); const [, , CSV, GL, S, E] = process.argv; const gl = require(require('path').resolve(GL));
const L = fs.readFileSync(CSV, 'utf8').split(/\r?\n/).filter(Boolean); const h = L[0].split(',');
const P = l => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map(s => s.replace(/,$/, '').replace(/^"|"$/g, ''));
const o = L.slice(1).map(P).map(c => Object.fromEntries(h.map((k, i) => [k, c[i]]))).filter(x => x['Order Number'] && x['Order Number'] !== 'Total');
const name = { 'Ontario Mills': 'Ontario', 'S. Torrance': 'South Torrance' };
const r2 = v => Math.round(v * 100) / 100; const A = new Date(S), B = new Date(E);
const locs = new Set([...Object.keys(gl), ...o.map(x => name[x['Store Name']] || x['Store Name'])]);
const out = [];
for (const loc of locs) {
  const os = o.filter(x => (name[x['Store Name']] || x['Store Name']) === loc);
  const rows = gl[loc] ? gl[loc].rows : [];
  const inW = r => new Date(r.date) >= A && new Date(r.date) <= B;
  const D = r2(rows.filter(r => r.type === 'Journal Entry' && r.debit && inW(r)).reduce((s, r) => s + r.debit, 0));
  const ctd = r2(os.reduce((s, x) => s + +x['Caterer Total Due'], 0));
  const fee = r2(os.reduce((s, x) => s - x['Commission'] - x['Payment Transaction Fee'], 0));
  if (!D && !ctd) continue;
  const bal = r2(rows.filter(r => new Date(r.date) <= B).reduce((s, r) => s + (r.debit || 0) - (r.credit || 0), 0));
  const ar = r2(D - ctd), diff = r2(ar - fee);
  out.push({ loc, orders: os.length, D, ctd, fee, ar, diff, balBefore: bal, balAfter: r2(bal - ar) });
}
console.log(JSON.stringify(out, null, 1));
