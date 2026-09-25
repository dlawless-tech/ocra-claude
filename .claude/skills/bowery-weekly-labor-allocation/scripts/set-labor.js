#!/usr/bin/env node
// Emit the eval function that loads labor.json into a duplicated Labor Allocation entry.
//
//   set-labor.js labor.json > set.js
//   playwright-cli -s=$S eval "$(cat set.js)"
//
// Wage lines pair up as adjacent credit/debit rows sharing an employee comment; tax lines key
// on location. A move or tax line the entry lacks, or one the week lacks, returns ADD / REMOVE
// lines and changes nothing. No backslashes: Windows argv rewrites them.
const x = require(require('path').resolve(process.argv[2]));
const loc = { Cookshop: '200', Shuka: '400', "Rosie's": '500', "Vic's": '700', Shukette: '600', 'Bowery Group': '800' };
process.stdout.write(`() => {
const x = ${JSON.stringify({ moves: x.moves, tax: x.tax })};
const loc = ${JSON.stringify(loc)};
const store = m => Object.keys(loc).find(s => String(m.location).startsWith(loc[s] + ' '));
const nm = s => String(s || '').trim().split(' ').filter(Boolean).join(' ').toLowerCase();
const acct = m => String(m.glAccount).split(' ')[0];
const g = jQuery('[data-role=grid]').data('kendoGrid');
const rows = Array.prototype.slice.call(g.dataSource.data());
const pairs = [], taxes = {}, odd = [];
for (let i = 0; i < rows.length; i++) {
  const m = rows[i], a = acct(m);
  if (a === '610-01') { if (taxes[store(m)]) odd.push('second tax line at ' + m.location); taxes[store(m)] = m; continue; }
  const n = rows[i + 1];
  if (a.startsWith('600-') && n && acct(n).startsWith('600-') && nm(n.comment) === nm(m.comment)) {
    const [cr, dr] = (+m.debit > 0 && !(+n.debit > 0)) ? [n, m] : [m, n];
    pairs.push({ cr, dr, name: nm(m.comment), key: acct(cr) + '|' + acct(dr) + '|' + store(cr) + '|' + store(dr) });
    i++; continue;
  }
  odd.push(m.glAccount + ' | ' + m.location + ' | ' + m.comment);
}
if (odd.length) return 'STOP: lines outside a wage pair or tax line: ' + odd.join(' ; ');
const route = v => v.creditAcct + '|' + v.debitAcct + '|' + v.from + '|' + v.to;
const used = new Set(), plan = [], msg = [];
const take = (v, p) => { used.add(p); plan.push([v, p]); };
for (const v of x.moves) { const p = pairs.find(p => !used.has(p) && p.name === nm(v.name) && p.key === route(v)); if (p) take(v, p); }
for (const v of x.moves.filter(v => !plan.some(q => q[0] === v))) {
  const open = pairs.filter(p => !used.has(p) && p.key === route(v));
  const rivals = x.moves.filter(w => w !== v && !plan.some(q => q[0] === w) && route(w) === route(v));
  if (open.length === 1 && rivals.length === 0) { take(v, open[0]); msg.push('RENAMED ' + open[0].cr.comment + ' to ' + v.name); }
  else msg.push('ADD ' + v.name + ' ' + v.amount.toFixed(2) + ': credit ' + v.creditAcct + ' @ ' + loc[v.from] + ', debit ' + v.debitAcct + ' @ ' + loc[v.to]);
}
for (const p of pairs) if (!used.has(p)) msg.push('REMOVE wage pair ' + p.cr.comment + ' ' + p.key);
for (const t of x.tax) if (!taxes[t.store]) msg.push('ADD tax 610-01 @ ' + loc[t.store] + (t.debit ? ' debit ' + t.debit.toFixed(2) : ' credit ' + t.credit.toFixed(2)));
for (const s of Object.keys(taxes)) if (!x.tax.some(t => t.store === s)) msg.push('REMOVE tax line @ ' + s);
if (msg.some(s => !s.startsWith('RENAMED'))) return msg.join(' ; ');
for (const [v, p] of plan) {
  p.cr.set('credit', v.amount); p.cr.set('debit', 0); p.cr.set('comment', v.name);
  p.dr.set('debit', v.amount); p.dr.set('credit', 0); p.dr.set('comment', v.name);
}
for (const t of x.tax) { const m = taxes[t.store]; m.set('debit', t.debit); m.set('credit', t.credit); m.set('comment', ''); }
const dr = rows.reduce((s, m) => s + (+m.debit || 0), 0), cr = rows.reduce((s, m) => s + (+m.credit || 0), 0);
return 'set ' + rows.length + ' lines, debits ' + dr.toFixed(2) + ' credits ' + cr.toFixed(2) + (msg.length ? ' ; ' + msg.join(' ; ') : '');
}`);
