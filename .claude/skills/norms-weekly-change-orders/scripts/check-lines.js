#!/usr/bin/env node
// Compare an entry read back from R365 against lines.json.
//
//   check-lines.js lines.json readback.txt [number]
//
// readback.txt is the eval output of bowery-weekly-mgmt-fees/scripts/read-lines.js.
// Prints MATCH, or one line per difference. Lines key on side, GL, location, and comment.
const fs = require('fs');
const want = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const raw = fs.readFileSync(process.argv[3], 'utf8');
const body = (raw.match(/^"\{.*\}"$/m) || [])[0];
if (!body) { console.log('STOP: no read-lines result in ' + process.argv[3]); process.exit(1); }
const got = JSON.parse(JSON.parse(body));
const number = process.argv[4] || want.number;
const c = n => Math.round(+n * 100);
const apo = s => String(s || '').split(String.fromCharCode(8217)).join("'").trim();
const key = (side, gl, loc, cm) => [side, apo(gl), apo(loc), apo(cm)].join(' | ');

const bad = [];
const d = new Date(got.date), w = new Date(want.date);
if (d.toDateString() !== w.toDateString()) bad.push('date reads ' + got.date + ', want ' + want.date);
if (apo(got.number) !== number) bad.push('number reads "' + got.number + '", want "' + number + '"');

const tally = {};
for (const l of want.lines) { const k = key(l.side, l.gl, l.loc, l.comment); tally[k] = (tally[k] || []).concat(c(l.amount)); }
let dr = 0, cr = 0;
for (const l of got.lines) {
  dr += c(l.dr); cr += c(l.cr);
  const side = c(l.cr) ? 'credit' : c(l.dr) ? 'debit' : null;
  if (!side) { bad.push('zero line ' + l.a + ' @ ' + l.loc); continue; }
  const k = key(side, l.a, l.loc, l.c), amt = side === 'credit' ? c(l.cr) : c(l.dr);
  const i = (tally[k] || []).indexOf(amt);
  if (i < 0) bad.push('extra ' + k + ' ' + (amt / 100).toFixed(2));
  else tally[k].splice(i, 1);
}
for (const k in tally) for (const a of tally[k]) bad.push('missing ' + k + ' ' + (a / 100).toFixed(2));
if (dr !== cr) bad.push('debits ' + (dr / 100).toFixed(2) + ' credits ' + (cr / 100).toFixed(2));
if (dr !== c(want.total)) bad.push('entry totals ' + (dr / 100).toFixed(2) + ', want ' + want.total.toFixed(2));

for (const s of want.stores) console.log(s.loc.padEnd(24) + String(s.total.toFixed(2)).padStart(10) + '  ' + s.days.join(' '));
console.log('TOTAL'.padEnd(24) + want.total.toFixed(2).padStart(10) + '  ' + got.lines.length + ' lines');
console.log(bad.length ? bad.join('\n') : 'MATCH');
process.exit(bad.length ? 1 : 0);
