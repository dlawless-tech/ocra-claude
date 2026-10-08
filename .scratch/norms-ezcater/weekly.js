const fs = require('fs'); const gl = require('./gl.json');
const L = fs.readFileSync('ez.csv', 'utf8').split(/\r?\n/).filter(Boolean); const h = L[0].split(',');
const P = l => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map(s => s.replace(/,$/, '').replace(/^"|"$/g, ''));
const o = L.slice(1).map(P).map(c => Object.fromEntries(h.map((k, i) => [k, c[i]]))).filter(x => x['Order Number'] && x['Order Number'] !== 'Total');
const name = { 'Ontario Mills': 'Ontario', 'S. Torrance': 'South Torrance' };
const sat = d => { const x = new Date(d); x.setDate(x.getDate() + (6 - x.getDay())); return (x.getMonth() + 1) + '/' + x.getDate() + '/' + x.getFullYear(); };
const xd = v => { const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(+v) * 864e5); return (d.getUTCMonth() + 1) + '/' + d.getUTCDate() + '/' + d.getUTCFullYear(); };
const r2 = v => Math.round(v * 100) / 100; const A = new Date('9/6/2026'), B = new Date('10/3/2026');
const k = {};
const at = (loc, w) => (k[loc + '|' + w] = k[loc + '|' + w] || { loc, week: w, D: 0, ctd: 0, fee: 0, orders: [], debits: [] });
for (const x of o) { const loc = name[x['Store Name']] || x['Store Name']; const d = xd(x['Event Date']); const a = at(loc, sat(d));
  a.ctd += +x['Caterer Total Due']; a.fee -= x['Commission'] + 0; a.fee -= +x['Payment Transaction Fee']; a.orders.push(x['Order Number'] + ' ' + d); }
for (const [loc, v] of Object.entries(gl)) for (const r of v.rows) if (r.type === 'Journal Entry' && r.debit && new Date(r.date) >= A && new Date(r.date) <= B) { const a = at(loc, sat(r.date)); a.D += r.debit; a.debits.push(r.date + ' ' + r.debit); }
const out = Object.values(k).map(a => ({ ...a, D: r2(a.D), ctd: r2(a.ctd), fee: r2(a.fee), ar: r2(a.D - a.ctd), diff: r2(a.D - a.ctd - a.fee) })).sort((a, b) => a.loc.localeCompare(b.loc) || new Date(a.week) - new Date(b.week));
fs.writeFileSync('plan-weekly.json', JSON.stringify(out, null, 1));
for (const a of out) console.log([a.loc, a.week, a.D, a.ctd, a.fee, a.ar, a.diff, a.orders.join(' '), a.debits.join(' ')].join('|'));
const s = out.reduce((t, a) => [t[0] + a.fee, t[1] + a.ar, t[2] + a.diff], [0, 0, 0]); console.log('TOTAL fee', s.map(r2).join(' '), 'entries', out.length);
