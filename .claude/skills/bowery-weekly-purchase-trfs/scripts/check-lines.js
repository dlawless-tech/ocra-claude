#!/usr/bin/env node
// Compare a read-back of the posted entry against lines.json.
//
//   playwright-cli -s=$S eval "$(cat ../bowery-weekly-mgmt-fees/scripts/read-lines.js)" > readback.txt
//   check-lines.js lines.json readback.txt [number]   number defaults to Purchase Transfers
const fs = require('fs'), path = require('path');
const x = require(path.resolve(process.argv[2]));
let s = fs.readFileSync(process.argv[3], 'utf8');
s = s.slice(s.indexOf('"{'), s.lastIndexOf('}"') + 2);
const e = JSON.parse(JSON.parse(s));
const apo = v => String(v || '').split('’').join("'");
const errs = [], want = process.argv[4] || 'Purchase Transfers';
if (e.date !== x.weekEnding) errs.push(`date ${e.date}, expected ${x.weekEnding}`);
if (e.number !== want) errs.push(`number "${e.number}", expected "${want}"`);
if (e.lines.length !== x.lines.length) errs.push(`${e.lines.length} lines, expected ${x.lines.length}`);
const dr = e.lines.reduce((t, l) => t + l.dr, 0), cr = e.lines.reduce((t, l) => t + l.cr, 0);
if (Math.abs(dr - cr) > 0.001) errs.push(`debits ${dr.toFixed(2)} != credits ${cr.toFixed(2)}`);
if (Math.abs(dr - x.total) > 0.001) errs.push(`entry amount ${dr.toFixed(2)}, expected ${x.total.toFixed(2)}`);
for (const w of x.lines) {
  const ok = e.lines.some(l => apo(l.a) === w.gl && apo(l.loc) === w.loc
    && Math.abs((w.side === 'credit' ? l.cr : l.dr) - w.amount) < 0.001 && (w.side === 'credit' ? l.dr : l.cr) === 0);
  if (!ok) errs.push(`${w.side} ${w.gl} @ ${w.loc} ${w.amount.toFixed(2)}: missing or wrong`);
  console.log(`${w.side.padEnd(7)} ${w.gl.padEnd(40)} ${w.loc.padEnd(24)} ${w.amount.toFixed(2).padStart(10)}  ${ok ? 'ok' : 'MISSING'}`);
}
console.log(`${'Total'.padEnd(73)} ${x.total.toFixed(2).padStart(10)}  entry ${dr.toFixed(2)}`);
if (errs.length) { console.error('MISMATCH\n  ' + errs.join('\n  ')); process.exit(1); }
console.log('MATCH');
