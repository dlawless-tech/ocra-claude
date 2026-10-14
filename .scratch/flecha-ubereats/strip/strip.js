// Drop the 1235 lines from a 3rd Party entry read back with read.js; each store's offset comes off
// a 1210 line of the same amount, else its 7161 line. Writes a post-week.sh week json.
//   strip.js <readback.txt> > week.json     exit 2 when there is no 1235 line
const fs = require('fs');
const raw = fs.readFileSync(process.argv[2], 'utf8');
const e = JSON.parse(JSON.parse(raw.match(/^"\{.*\}"$/m)[0]));
const c = v => Math.round(v * 100) / 100;
const is = (l, n) => l.a.startsWith(n + ' ');
const uber = e.lines.filter(l => is(l, '1235'));
if (!uber.length) process.exit(2);
let keep = e.lines.filter(l => !is(l, '1235'));
const net = {};
for (const l of uber) { const x = c(l.cr - l.dr); const k = l.loc;
  const r = keep.findIndex(m => m.loc === k && is(m, '1210') && c(m.dr - m.cr) === x);
  if (r >= 0) keep.splice(r, 1); else net[k] = c((net[k] || 0) + x); }
for (const k in net) {
  const f = keep.find(m => m.loc === k && is(m, '7161'));
  if (!f) { console.error('STOP: no 7161 line at ' + k); process.exit(1); }
  const v = c(f.dr - f.cr - net[k]); f.dr = v > 0 ? v : 0; f.cr = v < 0 ? -v : 0;
}
keep = keep.filter(l => c(l.dr) || c(l.cr));
const out = { date: e.date, number: e.number, comment: e.comment,
  lines: keep.map(l => ({ gl: l.a, glId: l.aId, loc: l.loc, locId: l.locId, side: l.dr ? 'debit' : 'credit', amount: c(l.dr || l.cr), comment: l.c || '' })) };
const dr = out.lines.filter(l => l.side === 'debit').reduce((a, l) => a + l.amount, 0), cr = out.lines.filter(l => l.side === 'credit').reduce((a, l) => a + l.amount, 0);
if (c(dr - cr)) { console.error('STOP: out of balance ' + c(dr - cr)); process.exit(1); }
out.total = c(dr);
console.log(JSON.stringify(out, null, 1));
