// Spirit's work-file record for one entry: its two lines keyed by account, from spirit.js.
// usage: node spirit-work.js <spirit.json> <entry date YYYY-MM-DD> <entry.json from read-entry.sh>
const fs = require('fs');
const [PLAN, DATE, ENTRY] = process.argv.slice(2);
const p = JSON.parse(fs.readFileSync(PLAN, 'utf8')).find(x => x.date === DATE);
const e = JSON.parse(fs.readFileSync(ENTRY, 'utf8'));
if (!p) { console.log(JSON.stringify({ fail: 'no Spirit part dated ' + DATE })); process.exit(1); }
const ar = e.lines.find(l => /^10125/.test(l.account)), fee = e.lines.find(l => /^70450/.test(l.account));
const extra = e.lines.filter(l => l !== ar && l !== fee);
if (!ar || !fee || new Set(e.lines.map(l => l.account)).size !== e.lines.length) { console.log(JSON.stringify({ fail: 'Spirit entry needs one 10125 and one 70450 line, each account once' })); process.exit(1); }
const a = Math.abs(p.fees), pos = p.fees >= 0;
const warnings = p.basis === 'actual' ? [] : [p.basis + (p.rate ? ' at ' + p.rate + '%' : '') + ' of ' + p.D.toFixed(2)];
// any other line is zeroed and named
for (const l of extra) if (l.debit || l.credit) warnings.push(l.account + ' ' + (l.debit || -l.credit) + ' zeroed');
console.log(JSON.stringify({ loc: 'Spirit', id: e.id, tot: a, basis: p.basis, rate: p.rate,
  lines: [{ comment: ar.account, col: pos ? 'credit' : 'debit', amount: a }, { comment: fee.account, col: pos ? 'debit' : 'credit', amount: a },
    ...extra.map(l => ({ comment: l.account, col: 'debit', amount: 0 }))], warnings }));
