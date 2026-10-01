#!/usr/bin/env node
// Compare a read-back of the posted entry against fees.json.
//
//   playwright-cli -s=$S eval "$(cat scripts/read-lines.js)" > readback.txt
//   check-lines.js fees.json readback.txt [number]   number defaults to Management Fees
const fs = require('fs'), path = require('path');
const fees = require(path.resolve(process.argv[2]));
let s = fs.readFileSync(process.argv[3], 'utf8');
s = s.slice(s.indexOf('"{'), s.lastIndexOf('}"') + 2);
const e = JSON.parse(JSON.parse(s));
const apo = x => String(x || '').split('’').join("'");
const errs = [];
if (e.date !== fees.weekEnding) errs.push(`date ${e.date}, expected ${fees.weekEnding}`);
const want = process.argv[4] || 'Management Fees';
if (e.number !== want) errs.push(`number "${e.number}", expected "${want}"`);
if (e.lines.length !== 20) errs.push(`${e.lines.length} lines, expected 20`);
const dr = e.lines.reduce((t, l) => t + l.dr, 0), cr = e.lines.reduce((t, l) => t + l.cr, 0);
if (Math.abs(dr - cr) > 0.001) errs.push(`debits ${dr.toFixed(2)} != credits ${cr.toFixed(2)}`);
if (Math.abs(dr - fees.entryAmount) > 0.001) errs.push(`entry amount ${dr.toFixed(2)}, expected ${fees.entryAmount.toFixed(2)}`);
const rows = [];
for (const st of fees.stores) {
  const mine = e.lines.filter(l => apo(l.c) === st.store || apo(l.c).startsWith(st.store + ' '));
  const amts = mine.map(l => l.dr || l.cr);
  if (mine.length !== 4 || amts.some(a => Math.abs(a - st.fee) > 0.001)) errs.push(`${st.store}: ${amts.join(', ')} expected 4 x ${st.fee.toFixed(2)}`);
  rows.push(`${st.store.padEnd(10)} ${st.fee.toFixed(2).padStart(10)}  posted ${amts.map(a => a.toFixed(2)).join(' / ')}`);
}
console.log(rows.join('\n') + `\n${'Total'.padEnd(10)} ${fees.total.toFixed(2).padStart(10)}  entry ${dr.toFixed(2)}`);
if (errs.length) { console.error('MISMATCH\n  ' + errs.join('\n  ')); process.exit(1); }
console.log('MATCH');
