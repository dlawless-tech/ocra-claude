const fs = require('fs');
const L = fs.readFileSync('ez-0905.csv', 'utf8').split(/\r?\n/).filter(Boolean); const h = L[0].split(',');
const P = l => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map(s => s.replace(/,$/, '').replace(/^"|"$/g, ''));
const o = L.slice(1).map(P).map(c => Object.fromEntries(h.map((k, i) => [k, c[i]]))).filter(x => x['Order Number'] && x['Order Number'] !== 'Total');
const K = ['Commission', 'Payment Transaction Fee', 'Preferred Partner Program', 'Misc Fees', 'Delivery Fee', 'Rewards', 'Sales Tax Remitted by ezCater', 'Adjustments', 'Discounts'];
const xd = v => { const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(+v) * 864e5); return (d.getUTCMonth() + 1) + '/' + d.getUTCDate(); };
for (const x of o) console.log([x['Store Name'], xd(x['Event Date']), x['Order Number'], ...K.map(k => x[k]), x['Food Total'], x['Sales Tax'], x['Tip'], x['Caterer Total Due']].join('|'));
