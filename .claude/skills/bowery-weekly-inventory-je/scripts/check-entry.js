#!/usr/bin/env node
// Compare a read-entry.sh readback against one store's lines.json amounts.
//
//   check-entry.js lines.json <store> readback.json [attachment name]
//
// Prints MATCH when the entry is numbered Inventory, dated the week ending, holds exactly the
// eight lines at their amounts on the store's location, balances, and lists the attachment.
const fs = require('fs');
const [, , L, store, R, att] = process.argv;
const all = JSON.parse(fs.readFileSync(L, 'utf8')); const x = all.stores[store];
const loc = JSON.parse(fs.readFileSync(__dirname + '/stores.json', 'utf8')).find(s => s.key === store).location;
const r = JSON.parse(fs.readFileSync(R, 'utf8'));
const [y, m, d] = all.weekEnd.split('-').map(Number);
const bad = [];
if (r.number !== 'Inventory') bad.push('number ' + r.number);
if (r.date !== `${m}/${d}/${y}`) bad.push('date ' + r.date);
if (r.lines.length !== 8) bad.push(r.lines.length + ' lines');
const c = v => Math.round(v * 100);
for (const [gl, v] of Object.entries(x.lines)) {
  const hit = r.lines.filter(l => l.gl === gl);
  if (hit.length !== 1) { bad.push(gl + ' on ' + hit.length + ' lines'); continue; }
  const l = hit[0];
  if (c(l.debit - l.credit) !== c(v)) bad.push(`${gl} ${(l.debit - l.credit).toFixed(2)}, want ${v.toFixed(2)}`);
  if (l.location !== loc) bad.push(`${gl} at ${l.location}`);
}
const dr = r.lines.reduce((s, l) => s + c(l.debit), 0), cr = r.lines.reduce((s, l) => s + c(l.credit), 0);
if (dr !== cr || dr !== c(x.total)) bad.push(`debits ${dr / 100} credits ${cr / 100}, want ${x.total}`);
if (att && !r.attachments.includes(att)) bad.push('no attachment ' + att);
console.log(bad.length ? 'DIFF: ' + bad.join('; ') : `MATCH ${store} ${r.date} ${x.total.toFixed(2)} ${r.status}`);
process.exit(bad.length ? 1 : 0);
