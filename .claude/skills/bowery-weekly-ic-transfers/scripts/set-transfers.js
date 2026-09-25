#!/usr/bin/env node
// Emit the eval function that loads transfers.json into a duplicated Intercompany Transfers entry.
//
//   set-transfers.js transfers.json > set.js
//   playwright-cli -s=$S eval "$(cat set.js)"
//
// Each transfer is a pair of lines, one per party's cash account. A pair already on the entry
// takes the new amount, direction, and comment. A pair the entry lacks, or a pair the week
// lacks, returns ADD / REMOVE lines and changes nothing. No backslashes: Windows argv rewrites them.
const x = require(require('path').resolve(process.argv[2]));
const cash = {
  Bowery: ['100-20', '800'], Cookshop: ['100-10', '200'], Shuka: ['100-03', '400'],
  "Rosie's": ['100-05', '500'], Shukette: ['100-06', '600'], "Vic's": ['100-08', '700'],
};
process.stdout.write(`() => {
const want = ${JSON.stringify(x.transfers)};
const cash = ${JSON.stringify(cash)};
const apo = s => String(s || '').split(String.fromCharCode(8217)).join("'");
const party = m => Object.keys(cash).find(p => String(m.glAccount).startsWith(cash[p][0] + ' ') && String(m.location).startsWith(cash[p][1] + ' '));
const key = (a, b) => [a, b].sort().join('|');
const g = jQuery('[data-role=grid]').data('kendoGrid');
const rows = Array.prototype.slice.call(g.dataSource.data());
const pairs = {}, odd = [];
for (const m of rows) {
  const p = party(m), c = apo(m.comment).match(/^(.+) -> (.+) Transfer/);
  if (!p || !c || (c[1] !== p && c[2] !== p)) { odd.push(m.glAccount + ' | ' + m.location + ' | ' + m.comment); continue; }
  (pairs[key(c[1], c[2])] = pairs[key(c[1], c[2])] || []).push([m, p]);
}
if (odd.length) return 'STOP: lines not in a transfer pair: ' + odd.join(' ; ');
const msg = [];
for (const t of want) {
  const k = key(t.from, t.to), have = pairs[k] || [];
  if (have.length === 0) msg.push('ADD ' + t.from + ' -> ' + t.to + ' ' + t.amount.toFixed(2) + ': credit ' + cash[t.from].join(' @ ') + ', debit ' + cash[t.to].join(' @ '));
  else if (have.length !== 2 || have[0][1] === have[1][1]) msg.push('STOP: pair ' + k + ' has ' + have.length + ' lines');
}
for (const k of Object.keys(pairs)) if (!want.some(t => key(t.from, t.to) === k)) msg.push('REMOVE ' + k + ' (' + pairs[k].length + ' lines)');
if (msg.length) return msg.join(' ; ');
for (const t of want) for (const [m, p] of pairs[key(t.from, t.to)]) {
  const side = p === t.from ? 'credit' : 'debit';
  m.set(side, t.amount); m.set(side === 'credit' ? 'debit' : 'credit', 0); m.set('comment', t.from + ' -> ' + t.to + ' Transfer');
}
const dr = rows.reduce((s, m) => s + (+m.debit || 0), 0), cr = rows.reduce((s, m) => s + (+m.credit || 0), 0);
return 'set ' + rows.length + ' lines, debits ' + dr.toFixed(2) + ' credits ' + cr.toFixed(2);
}`);
