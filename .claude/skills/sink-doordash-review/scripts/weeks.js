// Review 13562 by DoorDash week (Mon-Sun): DSS sales, the deposit after the week, the fee that implies,
// the DoorDash entries dated in the week, and 13562 at the end of Sunday, which equals the week's payout once posted.
// usage: node weeks.js <gl.json> <first Monday M/D/YYYY> <last Sunday M/D/YYYY>
const tx = require(require('path').resolve(process.argv[2]));
const D = s => { const [m, d, y] = s.split('/'); return Date.UTC(+y, m - 1, +d); }; const day = 864e5;
const fd = x => { const d = new Date(x); return (d.getUTCMonth() + 1) + '/' + d.getUTCDate(); };
const f = x => x.toFixed(2).padStart(9);
console.log('week          sales      deposit             implied    booked    diff     bal@Sun  entries');
for (let s = D(process.argv[3]); s <= D(process.argv[4]); s += 7 * day) {
  const e = s + 6 * day; const inW = t => D(t.d) >= s && D(t.d) <= e;
  const S = tx.filter(t => /^NJ/.test(t.num) && !t.cm && inW(t)).reduce((a, t) => a + t.dr - t.cr, 0);
  const dep = tx.filter(t => t.type === 'Bank Deposit' && D(t.d) > e && D(t.d) <= e + 7 * day)[0];
  const fe = tx.filter(t => t.type === 'Journal Entry' && !/^NJ/.test(t.num) && inW(t));
  const B = fe.reduce((a, t) => a + t.cr - t.dr, 0); const imp = dep ? S - dep.cr : NaN;
  const upTo = tx.filter(t => D(t.d) <= e); const last = upTo.length ? upTo[upTo.length - 1].bal : NaN;
  console.log((fd(s) + '-' + fd(e)).padEnd(11), f(S), (dep ? dep.d + ' ' + dep.cr.toFixed(2) : 'none').padEnd(20), dep ? f(imp) : '        -', f(B), dep ? f(B - imp) : '        -', f(last), ' ' + fe.map(t => t.num).join(', '));
}
const manual = tx.filter(t => /^NJ/.test(t.num) && t.cm);
if (manual.length) { console.log('\nmanual entries (NJ with a comment):'); manual.forEach(t => console.log(' ', t.d, t.num, t.dr || -t.cr, t.cm)); }
