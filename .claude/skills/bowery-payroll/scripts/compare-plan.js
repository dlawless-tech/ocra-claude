#!/usr/bin/env node
// Compare a built plan against the lines dumped from the R365 entry.
//
//   compare-plan.js <plan.json> <name>=<dump.json> [<name>=<dump.json> ...]
//
// Matches on account, side, amount, comment and line location, ignoring order.
const fs = require('fs');

const plans = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const n = s => String(s).replace(/,/g, '').trim();
let bad = 0;

for (const a of process.argv.slice(3)) {
  const i = a.indexOf('=');
  const name = a.slice(0, i);
  const p = plans.find(x => x.name === name);
  if (!p) { console.log(name + ': not in the plan'); bad++; continue; }
  const dump = JSON.parse(fs.readFileSync(a.slice(i + 1), 'utf8'));

  const key = (acct, deb, cre, loc, com) =>
    acct + '|' + (+n(deb)).toFixed(2) + '|' + (+n(cre)).toFixed(2) + '|@' + loc + '|' + com;
  const want = p.lines.map(l => key(l.account, l.debit, l.credit, l.location, l.comment));
  const got = dump.map(r => key(r[1].split(' - ')[0], r[3], r[4], r[6].split(' - ')[0].trim(), r[5].trim()));

  const left = got.slice();
  const missing = [];
  for (const k of want) { const j = left.indexOf(k); if (j < 0) missing.push(k); else left.splice(j, 1); }

  const tot = k => k.split('|').slice(1, 3).map(Number).reduce((x, y) => x + y, 0);
  const sum = xs => xs.reduce((s, k) => s + tot(k), 0).toFixed(2);
  if (!missing.length && !left.length) console.log(name.padEnd(14) + 'matches, ' + want.length + ' lines');
  else {
    bad++;
    console.log(name.padEnd(14) + 'plan ' + want.length + ' lines, R365 ' + got.length +
                ' -- ' + missing.length + ' planned not in R365 (' + sum(missing) + '), ' +
                left.length + ' in R365 not planned (' + sum(left) + ')');
    missing.forEach(k => console.log('    plan only  ' + k));
    left.forEach(k => console.log('    R365 only  ' + k));
  }
}
process.exit(bad ? 1 : 0);
