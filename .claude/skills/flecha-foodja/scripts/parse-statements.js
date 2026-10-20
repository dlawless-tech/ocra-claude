#!/usr/bin/env node
// Flecha Foodja statement PDFs -> [{file, period, start, end, total, due, stores:[{store, total, due, orders:[{date, order, total, due}]}]}]
// One PDF per period, all stores under billing code 12773. "Restaurant Total" is sales, "Amount Due" what Foodja pays.
// usage: parse-statements.js <dir of PDFs>   needs pdftotext on PATH
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const dir = process.argv[2]; const out = [];
const n = s => parseFloat(s.replace(/,/g, '')), r2 = x => Math.round(x * 100) / 100;
const mdy = s => { const d = new Date(s); return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`; };
const sum = (a, k) => r2(a.reduce((x, o) => x + o[k], 0));
for (const f of fs.readdirSync(dir).filter(f => /\.pdf$/i.test(f)).sort()) {
  const t = execFileSync('pdftotext', ['-raw', path.join(dir, f), '-'], { encoding: 'utf8' }).split(/\r?\n/);
  const s = { file: f, period: null, start: null, end: null, total: null, due: null, stores: [] };
  let cur = null, date = null, m;
  for (const l of t) {
    if (!s.period && (m = l.match(/^(\w+ \d{1,2}, \d{4}) to (\w+ \d{1,2}, \d{4})$/))) { s.period = l; s.start = mdy(m[1]); s.end = mdy(m[2]); continue; }
    if ((m = l.match(/^\*\* Total: (.+?) (-?[\d,]+\.\d\d) (-?[\d,]+\.\d\d)$/))) { Object.assign(cur, { total: n(m[2]), due: n(m[3]) }); cur = null; continue; }
    if ((m = l.match(/^\* Total: \d+ (-?[\d,]+\.\d\d) (-?[\d,]+\.\d\d)$/))) { s.total = n(m[1]); s.due = n(m[2]); continue; }
    // store's first order carries the store, a day's first order carries the date
    if ((m = l.match(/^(?:\d+ )?(Flecha .+?) (\d{1,2}\/\d{1,2}\/\d{4}) (\d+) (-?[\d,]+\.\d\d) (-?[\d,]+\.\d\d)$/))) {
      cur = { store: m[1], total: null, due: null, orders: [] }; s.stores.push(cur); date = m[2];
      cur.orders.push({ date, order: m[3], total: n(m[4]), due: n(m[5]) }); continue;
    }
    if (cur && (m = l.match(/^(\d{1,2}\/\d{1,2}\/\d{4}) (\d+) (-?[\d,]+\.\d\d) (-?[\d,]+\.\d\d)$/))) { date = m[1]; cur.orders.push({ date, order: m[2], total: n(m[3]), due: n(m[4]) }); continue; }
    if (cur && (m = l.match(/^(\d+) (-?[\d,]+\.\d\d) (-?[\d,]+\.\d\d)$/))) cur.orders.push({ date, order: m[1], total: n(m[2]), due: n(m[3]) });
  }
  if (s.total === null) { console.error('FAIL: no total line in ' + f); process.exit(1); }
  for (const st of s.stores) {
    if (st.total === null) { console.error(`FAIL: ${f} ${st.store} has no subtotal`); process.exit(1); }
    // Foodja rounds each order, so a store's orders can miss its due by a few cents
    if (sum(st.orders, 'total') !== st.total || Math.abs(sum(st.orders, 'due') - st.due) > 0.05) { console.error(`FAIL: ${f} ${st.store} orders ${sum(st.orders, 'total')}/${sum(st.orders, 'due')} against ${st.total}/${st.due}`); process.exit(1); }
  }
  if (sum(s.stores, 'total') !== s.total || Math.abs(sum(s.stores, 'due') - s.due) > 0.05) { console.error(`FAIL: ${f} stores sum against ${s.total}/${s.due}`); process.exit(1); }
  out.push(s);
}
console.log(JSON.stringify(out, null, 1));
