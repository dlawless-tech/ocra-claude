#!/usr/bin/env node
// Foodja statement PDFs -> [{code, store, file, period, total, due, orders:[{date, order, total, due}]}]
// "Restaurant Total" is the order's sales, "Amount Due" is what Foodja pays. Needs pdftotext on PATH.
// usage: parse-statements.js <dir of PDFs>
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const dir = process.argv[2]; const out = [];
const n = s => parseFloat(s.replace(/,/g, ''));
for (const f of fs.readdirSync(dir).filter(f => /\.pdf$/i.test(f)).sort()) {
  const t = execFileSync('pdftotext', ['-raw', path.join(dir, f), '-'], { encoding: 'utf8' }).split(/\r?\n/);
  const s = { code: null, store: null, file: f, period: null, total: null, due: null, orders: [] };
  for (const l of t) {
    let m;
    if (!s.period && (m = l.match(/^(\w+ \d{1,2}, \d{4}) to (\w+ \d{1,2}, \d{4})$/))) s.period = m[1] + ' to ' + m[2];
    if ((m = l.match(/^(1NORMS\w*) (.+?) (\d{1,2}\/\d{1,2}\/\d{4}) (\d+) ([\d,]+\.\d\d) (-?[\d,]+\.\d\d)$/))) { s.code = m[1]; s.store = m[2]; s.orders.push({ date: m[3], order: m[4], total: n(m[5]), due: n(m[6]) }); continue; }
    if ((m = l.match(/^(\d{1,2}\/\d{1,2}\/\d{4}) (\d+) (-?[\d,]+\.\d\d) (-?[\d,]+\.\d\d)$/))) { s.orders.push({ date: m[1], order: m[2], total: n(m[3]), due: n(m[4]) }); continue; }
    if ((m = l.match(/^\* Total: (1NORMS\w*) (-?[\d,]+\.\d\d) (-?[\d,]+\.\d\d)$/))) { s.code = s.code || m[1]; s.total = n(m[2]); s.due = n(m[3]); }
  }
  if (s.total === null) { console.error('FAIL: no total line in ' + f); process.exit(1); }
  const r = k => Math.round(s.orders.reduce((a, o) => a + o[k], 0) * 100) / 100;
  if (r('total') !== s.total || r('due') !== s.due) { console.error(`FAIL: ${f} orders sum ${r('total')}/${r('due')} against total ${s.total}/${s.due}`); process.exit(1); }
  out.push(s);
}
console.log(JSON.stringify(out, null, 1));
