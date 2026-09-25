#!/usr/bin/env node
// Compare a read-back of the posted entry against labor.json.
//
//   playwright-cli -s=$S eval "$(cat ../bowery-weekly-mgmt-fees/scripts/read-lines.js)" > readback.txt
//   check-labor.js labor.json readback.txt [number]   number defaults to Labor Allocation
const fs = require('fs'), path = require('path');
const x = require(path.resolve(process.argv[2]));
let s = fs.readFileSync(process.argv[3], 'utf8');
s = s.slice(s.indexOf('"{'), s.lastIndexOf('}"') + 2);
const e = JSON.parse(JSON.parse(s));
const loc = { Cookshop: '200', Shuka: '400', "Rosie's": '500', "Vic's": '700', Shukette: '600', 'Bowery Group': '800' };
const nm = v => String(v || '').trim().split(/ +/).join(' ').toLowerCase();
const used = new Set();
const hit = (acct, st, dr, cr, comment) => {
  const l = e.lines.find(l => !used.has(l) && l.a.startsWith(acct + ' ') && l.loc.startsWith(loc[st] + ' ')
    && Math.abs(l.dr - dr) < 0.001 && Math.abs(l.cr - cr) < 0.001 && nm(l.c) === nm(comment));
  if (l) used.add(l);
  return !!l;
};
const errs = [], want = process.argv[4] || 'Labor Allocation';
if (e.date !== x.weekEnding) errs.push(`date ${e.date}, expected ${x.weekEnding}`);
if (e.number !== want) errs.push(`number "${e.number}", expected "${want}"`);
const n = x.moves.length * 2 + x.tax.length;
if (e.lines.length !== n) errs.push(`${e.lines.length} lines, expected ${n}`);
const dr = e.lines.reduce((t, l) => t + l.dr, 0), cr = e.lines.reduce((t, l) => t + l.cr, 0);
if (Math.abs(dr - cr) > 0.001) errs.push(`debits ${dr.toFixed(2)} != credits ${cr.toFixed(2)}`);
if (Math.abs(dr - x.total) > 0.001) errs.push(`entry amount ${dr.toFixed(2)}, expected ${x.total.toFixed(2)}`);
for (const v of x.moves) {
  const ok = hit(v.creditAcct, v.from, 0, v.amount, v.name) && hit(v.debitAcct, v.to, v.amount, 0, v.name);
  if (!ok) errs.push(`${v.name} ${v.from} -> ${v.to} ${v.amount.toFixed(2)}: missing`);
  console.log(`${v.name.padEnd(20)} ${(v.from + ' -> ' + v.to).padEnd(22)} ${v.amount.toFixed(2).padStart(9)}  ${ok ? 'ok' : 'MISSING'}`);
}
for (const t of x.tax) {
  const ok = hit('610-01', t.store, t.debit, t.credit, '');
  if (!ok) errs.push(`tax ${t.store}: missing`);
  console.log(`${'Payroll taxes'.padEnd(20)} ${t.store.padEnd(22)} ${(t.debit ? t.debit : -t.credit).toFixed(2).padStart(9)}  ${ok ? 'ok' : 'MISSING'}`);
}
console.log(`${'Total'.padEnd(43)} ${x.total.toFixed(2).padStart(9)}  entry ${dr.toFixed(2)}`);
if (errs.length) { console.error('MISMATCH\n  ' + errs.join('\n  ')); process.exit(1); }
console.log('MATCH');
