const fs = require('fs'); const gl = require('./gl.json');
const L = fs.readFileSync('ez-0905.csv', 'utf8').split(/\r?\n/).filter(Boolean); const h = L[0].split(',');
const P = l => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map(s => s.replace(/,$/, '').replace(/^"|"$/g, ''));
const o = L.slice(1).map(P).map(c => Object.fromEntries(h.map((k, i) => [k, c[i]]))).filter(x => x['Order Number'] && x['Order Number'] !== 'Total');
const name = { 'Ontario Mills': 'Ontario', 'S. Torrance': 'South Torrance' };
const je = fs.readFileSync('je905.txt', 'utf8').split('\n').filter(Boolean).map(s => JSON.parse(JSON.parse(s)));
const A = new Date('8/9/2026'), B = new Date('9/4/2026');
for (const j of je) { const loc = j.rows[0][4].replace(/^\d+ - /, ''); const os = o.filter(x => (name[x['Store Name']] || x['Store Name']) === loc);
  const ctd = os.reduce((s, x) => s + +x['Caterer Total Due'], 0), fee = os.reduce((s, x) => s - x['Commission'] - x['Payment Transaction Fee'], 0);
  const D = (gl[loc] ? gl[loc].rows : []).filter(r => r.type === 'Journal Entry' && r.debit && new Date(r.date) >= A && new Date(r.date) <= B).reduce((s, r) => s + r.debit, 0);
  const g = k => j.rows.find(x => x[3].startsWith(k)); const v = x => +(x[1] - x[2]).toFixed(2);
  console.log([loc, 'D ' + D.toFixed(2), 'CTD ' + ctd.toFixed(2), '1118 want ' + (ctd - D).toFixed(2), 'posted ' + v(g('1118')), 'fee want ' + fee.toFixed(2), 'posted ' + v(g('5514'))].join('|')); }
