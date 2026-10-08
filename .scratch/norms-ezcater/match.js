const fs = require('fs');
const csv = s => { const out = []; let row = [], f = '', q = false; for (let i = 0; i < s.length; i++) { const c = s[i]; if (q) { if (c === '"' && s[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; } else if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; row.push(f); out.push(row); row = []; f = ''; } else f += c; } if (f || row.length) { row.push(f); out.push(row); } return out; };
const rows = csv(fs.readFileSync(process.argv[2], 'utf8')); const h = rows[0];
const o = rows.slice(1).filter(r => r.length > 5).map(r => Object.fromEntries(h.map((k, i) => [k, r[i]])));
const xd = n => { const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(+n) * 864e5); return (d.getUTCMonth() + 1) + '/' + d.getUTCDate() + '/' + d.getUTCFullYear(); };
const n = k => x => +x[k] || 0; const r2 = x => Math.round(x * 100) / 100;
const gl = require('./gl.json');
const A = new Date('9/6/2026'), B = new Date('10/3/2026');
const deb = {}; for (const [l, v] of Object.entries(gl)) deb[l] = v.rows.filter(r => r.debit && r.type === 'Journal Entry' && new Date(r.date) >= A && new Date(r.date) <= B).map(r => ({ ...r, used: false }));
for (const x of o) {
  x.date = xd(x['Event Date']);
  x.total = r2(['Food Total', 'Promotion', 'Delivery Fee', 'Sales Tax', 'Tip'].reduce((s, k) => s + n(k)(x), 0));
  x.ctd = +x['Caterer Total Due']; x.fee = r2(x.total - x.ctd);
  const ds = deb[x['Store Name']] || []; const m = ds.find(r => !r.used && Math.abs(r.debit - x.total) < 0.01) || ds.find(r => !r.used && r.date === x.date);
  if (m) m.used = true; x.r365 = m ? m.date + ' ' + m.debit : 'NONE';
  console.log([x['Order Number'], x['Store Name'], x.date, x.total, x.ctd, x.fee, x['Adjustments'], x['Discounts'], x['Misc Fees'], x['Rewards'], x['Sales Tax Remitted by ezCater'], x.r365].join('|'));
}
console.log('--- R365 debits with no order');
for (const [l, ds] of Object.entries(deb)) for (const r of ds) if (!r.used) console.log(l, r.date, r.debit);
