#!/usr/bin/env node
// Compare a read-back of one store's posted entry against lines.json.
//
//   playwright-cli -s=$S eval "$(cat ../bowery-weekly-mgmt-fees/scripts/read-lines.js)" > readback.txt
//   check-lines.js lines.json readback.txt "<store>" [number]   number defaults to Weekly Log - Deposits, Tips, Paid Outs
const fs = require('fs'), path = require('path');
const x = require(path.resolve(process.argv[2]));
const st = x.stores.find(v => v.store === process.argv[4]);
if (!st) { console.error(`no store "${process.argv[4]}" in ${process.argv[2]}`); process.exit(1); }
let s = fs.readFileSync(process.argv[3], 'utf8');
s = s.slice(s.indexOf('"{'), s.lastIndexOf('}"') + 2);
const e = JSON.parse(JSON.parse(s));
const apo = v => String(v || '').split('’').join("'");
const errs = [], want = process.argv[5] || 'Weekly Log - Deposits, Tips, Paid Outs';
if (e.date !== x.weekEnding) errs.push(`date ${e.date}, expected ${x.weekEnding}`);
if (e.number !== want) errs.push(`number "${e.number}", expected "${want}"`);
if (e.lines.length !== st.lines.length) errs.push(`${e.lines.length} lines, expected ${st.lines.length}`);
const dr = e.lines.reduce((t, l) => t + l.dr, 0), cr = e.lines.reduce((t, l) => t + l.cr, 0);
if (Math.abs(dr - cr) > 0.001) errs.push(`debits ${dr.toFixed(2)} != credits ${cr.toFixed(2)}`);
if (Math.abs(dr - st.amount) > 0.001) errs.push(`entry amount ${dr.toFixed(2)}, expected ${st.amount.toFixed(2)}`);
for (const l of e.lines) if (apo(l.loc) !== st.loc) errs.push(`${l.a} at ${l.loc}, expected ${st.loc}`);
for (const w of st.lines) {
  const l = e.lines.find(l => apo(l.a) === w.gl && (w.side === 'credit' ? l.cr : l.dr) > 0);
  const amt = l && Math.abs((w.side === 'credit' ? l.cr : l.dr) - w.amount) < 0.001 && (w.side === 'credit' ? l.dr : l.cr) === 0;
  const com = l && (l.c || '') === w.comment;
  const tag = !l ? 'MISSING' : !amt ? 'AMOUNT' : !com ? 'COMMENT' : 'ok';
  if (tag !== 'ok') errs.push(`${w.side} ${w.gl} ${w.amount.toFixed(2)} "${w.comment}": ${tag.toLowerCase()}${l ? ` (entry ${(l.dr || l.cr).toFixed(2)} "${l.c || ''}")` : ''}`);
  console.log(`${w.side.padEnd(7)} ${w.gl.padEnd(40)} ${w.amount.toFixed(2).padStart(10)}  ${w.comment.padEnd(30)} ${tag}`);
}
console.log(`${'Total'.padEnd(48)} ${st.amount.toFixed(2).padStart(10)}  entry ${dr.toFixed(2)}`);
if (errs.length) { console.error('MISMATCH\n  ' + errs.join('\n  ')); process.exit(1); }
console.log('MATCH');
