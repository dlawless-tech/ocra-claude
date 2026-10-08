const fs = require('fs');
const L = fs.readFileSync('ez-0905.csv', 'utf8').split(/\r?\n/).filter(Boolean); const h = L[0].split(',');
const P = l => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map(s => s.replace(/,$/, '').replace(/^"|"$/g, ''));
const o = L.slice(1).map(P).map(c => Object.fromEntries(h.map((k, i) => [k, c[i]]))).filter(x => x['Order Number'] && x['Order Number'] !== 'Total');
const n = (x, k) => +x[k] || 0; const r = v => v.toFixed(2);
const je = fs.readFileSync('je905.txt', 'utf8').split('\n').filter(Boolean).map(s => JSON.parse(JSON.parse(s)));
const s = {};
for (const x of o) { const k = x['Store Name']; const a = s[k] = s[k] || { ctd: 0, food: 0, del: 0, tax: 0, tip: 0, rem: 0, misc: 0, n: 0, dates: [] };
  a.n++; a.ctd += n(x, 'Caterer Total Due'); a.food += n(x, 'Food Total') + n(x, 'Promotion'); a.del += n(x, 'Delivery Fee'); a.tax += n(x, 'Sales Tax'); a.tip += n(x, 'Tip'); a.rem += n(x, 'Sales Tax Remitted by ezCater'); a.misc += n(x, 'Misc Fees'); }
console.log('store|n|5514 posted|1118 posted|5915 posted|ctd|F+T-ctd|F+D+T+Tip-ctd');
for (const j of je) { const loc = j.rows[0][4].replace(/^\d+ - /, ''); const a = s[loc] || s[loc + ' Mills'] || {};
  const g = k => j.rows.find(x => x[3].startsWith(k)); const v = x => x ? r(x[1] - x[2]) : '';
  console.log([loc, a.n, v(g('5514')), v(g('1118')), v(g('5915')), r(a.ctd || 0), r((a.food + a.tax - a.ctd) || 0), r((a.food + a.del + a.tax + a.tip - a.ctd) || 0)].join('|')); }
console.log('stores in report:', Object.keys(s).join(', '));
