#!/usr/bin/env node
// Split each store's hourly labor line into FOH Hourly and BOH Hourly.
//
//   build-split.js <detail.csv> <lines.json> > plan.json
//
// detail.csv is the PAY DETAILS LG export, column B "<location>.<job GL>".
// lines.json comes from dump-lines.sh. Report on stderr, plan on stdout.
const fs = require('fs');
const { loadPayDetails, ALL_LABOR_5212, r2 } = require('./pay-details');

const [csv, linesFile] = process.argv.slice(2);
let by;
try { by = loadPayDetails(csv); } catch (e) { console.error('FAIL: ' + e.message); process.exit(1); }

const lines = JSON.parse(fs.readFileSync(linesFile, 'utf8'));
const at = (acct, loc) => lines.filter(l => l.account.startsWith(acct + ' ') && l.location.startsWith(loc + ' '));
const net = ls => r2(ls.reduce((s, l) => s + l.debit - l.credit, 0));

const plan = { repoint: [], set: [], add: [], remove: [] }, report = [];
let problems = 0;
for (const loc of Object.keys(by).sort()) {
  const foh = by[loc].FOH, boh = by[loc].BOH;
  const hourly = at('5212', loc), bohL = at('5242', loc), fohL = at('5241', loc);
  const any = [...hourly, ...bohL, ...fohL];

  if (ALL_LABOR_5212.has(loc)) {
    // one 5212 line; entries before 10/2026 carry it on 6025, so repoint that
    const lab = [...hourly, ...at('6025', loc)], split = [...bohL, ...fohL];
    if (lab.length !== 1) { report.push(`${loc}: expected one 5212 or 6025 line, found ${lab.length}`); problems++; continue; }
    if (!hourly.length) plan.repoint.push([lab[0].i, '5212']);
    const moved = net(split);
    if (moved) plan.set.push([lab[0].i, r2(net(lab) + moved), 0]);
    for (const l of split) plan.remove.push(l.i);
    report.push(`${loc}: all labor on 5212, ${r2(net(lab) + moved).toFixed(2)}`);
    continue;
  }
  if (!any.length) {
    if (foh || boh) { report.push(`${loc}: ${r2(foh + boh)} of hourly labor but no hourly line`); problems++; }
    continue;
  }
  if (hourly.length > 1 || bohL.length > 1 || fohL.length > 1) { report.push(`${loc}: duplicate hourly lines`); problems++; continue; }
  // until repointed, the 5212 line still holds the store's whole hourly figure
  const entryTotal = net(hourly.length ? hourly : [...bohL, ...fohL]);
  if (r2(foh + boh) !== entryTotal) { report.push(`${loc}: file ${r2(foh + boh)} vs entry ${entryTotal}`); problems++; continue; }

  const bohRow = bohL[0] || hourly[0];
  if (!bohL.length) plan.repoint.push([bohRow.i, '5242']);
  plan.set.push([bohRow.i, boh, 0]);
  if (fohL.length) plan.set.push([fohL[0].i, foh, 0]);
  else if (foh) plan.add.push({ loc, locRow: bohRow.i, debit: foh });
  report.push(`${loc}: FOH ${foh.toFixed(2)}  BOH ${boh.toFixed(2)}`);
}
console.error(report.join('\n'));
if (problems) { console.error(`FAIL: ${problems} store(s) do not reconcile`); process.exit(1); }
process.stdout.write(JSON.stringify(plan));
