// Tie 20100 Customer Advance Orders to Toast by store, and bridge each store's GL balance to its open advance orders.
// usage: node recon.js <gl.json> <toast.json> <end YYYY-MM-DD> <out.json>
// An advance payment (paid on a day before its order's day) is a GL credit on the paid day and a debit on the order day,
// at amount + tip + gratuity. Payments made after the order day are late: the DSS books them unevenly, so they are listed apart.
const fs = require('fs');
const [glF, tF, END, outF] = process.argv.slice(2);
const STORE = { MX: '1 - MX', SLU: '2 - SLU', Skinker: '3 - Skinker', 'Maryland Heights': '4 - Page', Fenton: '5 - Fenton', Kirkwood: '6 - Kirkwood', Chesterfield: '7 - Spirit' };
const iso = s => { const [m, d, y] = s.split(' ')[0].split('/'); return `${y.length == 2 ? '20' + y : y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`; };
const r2 = n => Math.round(n * 100) / 100;
const sum = (a, f = x => x.liab) => r2(a.reduce((s, x) => s + f(x), 0));
const gl = JSON.parse(fs.readFileSync(glF)).map(x => ({ ...x, store: x.loc.replace(/^Snarf's Sandwiches /, ''), day: iso(x.d) }));
const pays = JSON.parse(fs.readFileSync(tF)).filter(x => x.status != 'VOIDED' && x.status != 'DENIED')
  .map(x => ({ ...x, store: STORE[x.loc], liab: r2(x.amt + x.tip + x.grat), adv: x.paidBd < x.orderBd }));
const unknown = [...new Set(pays.filter(x => !x.store).map(x => x.loc))]; if (unknown.length) console.log('UNMAPPED Toast stores:', unknown.join(', '));
const START = gl.reduce((m, x) => x.day < m ? x.day : m, '9999');
const item = x => ({ order: x.order, name: x.tab, paid: x.paid, ordered: x.ordered, type: x.other || x.type, amt: x.liab });
const out = { start: START, end: END, stores: [] };
for (const store of Object.values(STORE)) {
  const g = gl.filter(x => x.store == store && x.day <= END), p = pays.filter(x => x.store == store);
  const glBeg = g.length ? r2(g[0].beg) : 0, glEnd = g.length ? r2(g[g.length - 1].bal) : glBeg;
  const toastBeg = sum(p.filter(x => x.adv && x.paidBd < START && x.orderBd >= START));
  const open = p.filter(x => x.adv && x.paidBd <= END && x.orderBd > END).sort((a, b) => a.orderBd.localeCompare(b.orderBd)).map(item);
  const toastEnd = sum(open, x => x.amt);
  // day by day, GL against advance payments only
  const days = {};
  const add = (d, k, v) => { if (d < START || d > END) return; (days[d] = days[d] || { glCr: 0, glDr: 0, tCr: 0, tDr: 0 })[k] += v; };
  for (const x of g) { add(x.day, 'glCr', x.cr); add(x.day, 'glDr', x.dr); }
  for (const x of p.filter(x => x.adv)) { add(x.paidBd, 'tCr', x.liab); add(x.orderBd, 'tDr', x.liab); }
  const late = p.filter(x => !x.adv);
  const exceptions = Object.entries(days).sort().map(([d, v]) => {
    const cr = r2(v.glCr - v.tCr), dr = r2(v.glDr - v.tDr);
    if (Math.abs(cr) < 0.005 && Math.abs(dr) < 0.005) return null;
    const lateHere = late.filter(x => x.paidBd == d || x.orderBd == d).map(x => ({ ...item(x), side: x.paidBd == d ? 'paid late today' : 'order today, paid late' }));
    const due = p.filter(x => x.adv && x.orderBd == d).map(item);
    return { d, extraCredit: cr, extraDebit: dr, net: r2(cr - dr), late: lateHere, ordersDue: due };
  }).filter(Boolean);
  // a late payment adds its credit on the paid day and its debit on the order day; what is left is a GL line Toast cannot explain
  for (const e of exceptions) { e.lateNet = r2(e.late.reduce((s, l) => s + (l.side == 'paid late today' ? l.amt : -l.amt), 0)); e.rest = r2(e.net - e.lateNet); }
  const dayNet = r2(exceptions.reduce((s, e) => s + e.net, 0));
  const unexplained = r2(glEnd - toastEnd - (glBeg - toastBeg) - dayNet);
  // month ends (and END): GL balance, Toast open advance orders, and the month's exceptions by kind
  const ends = [...new Set(g.map(x => x.day.slice(0, 7)))].map(m => { const d = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)).toISOString().slice(0, 10); return d > END ? END : d; });
  const months = ends.map(d => {
    const upTo = g.filter(x => x.day <= d); const gl = upTo.length ? r2(upTo[upTo.length - 1].bal) : glBeg;
    const toast = sum(p.filter(x => x.adv && x.paidBd <= d && x.orderBd > d));
    const inMonth = exceptions.filter(e => e.d.slice(0, 7) == d.slice(0, 7));
    const s_ = f => r2(inMonth.reduce((s, e) => s + f(e), 0));
    return { end: d, gl, toast, diff: r2(gl - toast), late: s_(e => e.lateNet), noToast: s_(e => Math.max(e.rest, 0)), short: s_(e => Math.min(e.rest, 0)) };
  });
  out.stores.push({ store, glBeg, toastBeg, begDiff: r2(glBeg - toastBeg), glEnd, toastEnd, diff: r2(glEnd - toastEnd), dayNet, unexplained, months, open, exceptions });
  const f = n => n.toFixed(2).padStart(9);
  console.log(`${store.padEnd(13)} GL ${f(glEnd)}  Toast open ${f(toastEnd)} (${String(open.length).padStart(2)})  diff ${f(glEnd - toastEnd)} = before ${START} ${f(glBeg - toastBeg)} + days ${f(dayNet)} + unexplained ${f(unexplained)}`);
}
fs.writeFileSync(outF, JSON.stringify(out, null, 1));
