// Spirit's work-file record for one entry: its two lines keyed by account, from spirit.js.
// usage: node spirit-work.js <spirit.json> <entry date YYYY-MM-DD> <entry.json from read-entry.sh>
const fs = require('fs');
const [PLAN, DATE, ENTRY] = process.argv.slice(2);
const p = JSON.parse(fs.readFileSync(PLAN, 'utf8')).find(x => x.date === DATE);
const e = JSON.parse(fs.readFileSync(ENTRY, 'utf8'));
if (!p) { console.log(JSON.stringify({ fail: 'no Spirit part dated ' + DATE })); process.exit(1); }
const ar = e.lines.find(l => /^10125/.test(l.account)), fee = e.lines.find(l => /^70450/.test(l.account));
if (!ar || !fee || e.lines.length !== 2) { console.log(JSON.stringify({ fail: 'Spirit entry is not one 10125 and one 70450 line' })); process.exit(1); }
const a = Math.abs(p.fees), pos = p.fees >= 0;
console.log(JSON.stringify({ loc: 'Spirit', id: e.id, tot: a, basis: p.basis, rate: p.rate,
  lines: [{ comment: ar.account, col: pos ? 'credit' : 'debit', amount: a }, { comment: fee.account, col: pos ? 'debit' : 'credit', amount: a }],
  warnings: p.basis === 'actual' ? [] : [p.basis + (p.rate ? ' at ' + p.rate + '%' : '') + ' of ' + p.D.toFixed(2)] }));
