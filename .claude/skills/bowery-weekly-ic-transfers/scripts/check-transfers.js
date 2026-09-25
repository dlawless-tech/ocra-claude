#!/usr/bin/env node
// Compare a read-back of the posted entry against transfers.json.
//
//   playwright-cli -s=$S eval "$(cat ../bowery-weekly-mgmt-fees/scripts/read-lines.js)" > readback.txt
//   check-transfers.js transfers.json readback.txt [number]   number defaults to Intercompany Transfers
const fs = require('fs'), path = require('path');
const x = require(path.resolve(process.argv[2]));
let s = fs.readFileSync(process.argv[3], 'utf8');
s = s.slice(s.indexOf('"{'), s.lastIndexOf('}"') + 2);
const e = JSON.parse(JSON.parse(s));
const cash = {
  Bowery: ['100-20', '800'], Cookshop: ['100-10', '200'], Shuka: ['100-03', '400'],
  "Rosie's": ['100-05', '500'], Shukette: ['100-06', '600'], "Vic's": ['100-08', '700'],
};
const has = (p, side, amt, comment) => e.lines.some(l => l.a.startsWith(cash[p][0] + ' ') && l.loc.startsWith(cash[p][1] + ' ')
  && Math.abs((side === 'credit' ? l.cr : l.dr) - amt) < 0.001 && (side === 'credit' ? l.dr : l.cr) === 0
  && String(l.c).split('’').join("'") === comment);
const errs = [], want = process.argv[4] || 'Intercompany Transfers';
if (e.date !== x.weekEnding) errs.push(`date ${e.date}, expected ${x.weekEnding}`);
if (e.number !== want) errs.push(`number "${e.number}", expected "${want}"`);
if (e.lines.length !== x.transfers.length * 2) errs.push(`${e.lines.length} lines, expected ${x.transfers.length * 2}`);
const dr = e.lines.reduce((t, l) => t + l.dr, 0), cr = e.lines.reduce((t, l) => t + l.cr, 0);
if (Math.abs(dr - cr) > 0.001) errs.push(`debits ${dr.toFixed(2)} != credits ${cr.toFixed(2)}`);
if (Math.abs(dr - x.total) > 0.001) errs.push(`entry amount ${dr.toFixed(2)}, expected ${x.total.toFixed(2)}`);
for (const t of x.transfers) {
  const c = `${t.from} -> ${t.to} Transfer`;
  const ok = has(t.from, 'credit', t.amount, c) && has(t.to, 'debit', t.amount, c);
  if (!ok) errs.push(`${c} ${t.amount.toFixed(2)}: missing or reversed`);
  console.log(`${c.padEnd(32)} ${t.amount.toFixed(2).padStart(10)}  ${ok ? 'ok' : 'MISSING OR REVERSED'}`);
}
console.log(`${'Total'.padEnd(32)} ${x.total.toFixed(2).padStart(10)}  entry ${dr.toFixed(2)}`);
if (errs.length) { console.error('MISMATCH\n  ' + errs.join('\n  ')); process.exit(1); }
console.log('MATCH');
