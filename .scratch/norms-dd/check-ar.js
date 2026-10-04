// per store, per week: D (Mon-Sun sales debits), entry A/R credit, implied net = D - credit, next deposit
const g = require('./gl.json');
const weeks = [['9/12/2026', '2026-09-07'], ['9/19/2026', '2026-09-14'], ['9/26/2026', '2026-09-21']];
const iso = s => { const [m, d, y] = s.split('/'); return y + '-' + m.padStart(2, '0') + '-' + d.padStart(2, '0'); };
const add = (s, n) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const out = {};
for (const [loc, b] of Object.entries(g)) {
  out[loc] = {};
  for (const [ed, mon] of weeks) {
    const sun = add(mon, 6), entryDay = iso(ed);
    const je = b.rows.filter(r => r.type === 'Journal Entry');
    const D = je.filter(r => iso(r.date) >= mon && iso(r.date) <= sun && r.debit > 0).reduce((s, r) => s + r.debit, 0);
    const cr = je.filter(r => iso(r.date) === entryDay && r.credit > 0).reduce((s, r) => s + r.credit, 0);
    const odd = je.filter(r => iso(r.date) >= mon && iso(r.date) <= sun && r.credit > 0 && iso(r.date) !== entryDay);
    const dep = b.rows.filter(r => r.type === 'Bank Deposit' && iso(r.date) > sun && iso(r.date) <= add(sun, 9)).map(r => r.credit);
    out[loc][ed] = { D: +D.toFixed(2), arCredit: +cr.toFixed(2), impliedNet: +(D - cr).toFixed(2), deposit: dep, odd: odd.length };
  }
}
console.log(JSON.stringify(out));
for (const [loc, w] of Object.entries(out)) for (const [ed, x] of Object.entries(w)) {
  const ok = x.deposit.length === 1 && Math.abs(x.deposit[0] - x.impliedNet) < 0.005;
  if (!ok) console.error(loc.padEnd(17), ed, 'D', x.D, 'cr', x.arCredit, 'net', x.impliedNet, 'dep', x.deposit.join('+') || '-', x.odd ? 'ODD' : '');
}
