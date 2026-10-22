#!/usr/bin/env node
// Emit the eval function that loads labor.json into a duplicated Labor Allocation entry. Does not save.
//
//   set-labor.js labor.json > set.js
//   playwright-cli -s=$S eval "$(cat set.js)"
//
// Wage lines pair up as adjacent credit/debit rows sharing an employee comment; tax lines key
// on location. Pairs and tax lines the week lacks are deleted, missing ones are added through the
// new-row form, then every amount and comment is set. No backslashes: Windows argv rewrites them.
const x = require(require('path').resolve(process.argv[2]));
const loc = { Cookshop: '200', Shuka: '400', "Rosie's": '500', "Vic's": '700', Shukette: '600', 'Bowery Group': '800' };
process.stdout.write(`async () => {
const x = ${JSON.stringify({ moves: x.moves, tax: x.tax })};
const loc = ${JSON.stringify(loc)};
const wait = ms => new Promise(r => setTimeout(r, ms));
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
const used = new Set(), plan = [], adds = [], msg = [];
const take = (v, p) => { used.add(p); plan.push([v, p]); };
for (const v of x.moves) { const p = pairs.find(p => !used.has(p) && p.name === nm(v.name) && p.key === route(v)); if (p) take(v, p); }
for (const v of x.moves.filter(v => !plan.some(q => q[0] === v))) {
  const open = pairs.filter(p => !used.has(p) && p.key === route(v));
  const rivals = x.moves.filter(w => w !== v && !plan.some(q => q[0] === w) && route(w) === route(v));
  if (open.length === 1 && rivals.length === 0) { take(v, open[0]); msg.push('RENAMED ' + open[0].cr.comment + ' to ' + v.name); }
  else adds.push(v);
}

// account and location ids for new rows
const sc = angular.element(document.querySelector('#newRowButtonsContainer')).scope();
const f = sc.gridOptions.journalEntryDetailsGrid.newRowForm;
const dd = f.GLAccountsKendoDropDownList;
const locs = jQuery('#journalEntryLocation').data('kendoComboBox').dataSource.data();
const locOf = s => locs.find(l => String(l.locationNumber) === loc[s]);
const acctOf = a => dd.dataSource.data().find(d => String(d.label).startsWith(a + ' - '));
const need = adds.map(v => [v.creditAcct, v.debitAcct]).flat().concat(x.tax.some(t => !taxes[t.store]) ? ['610-01'] : []);
for (const a of need) if (!acctOf(a)) return 'STOP: no account ' + a + ' in the new-row form';
for (const s of adds.map(v => [v.from, v.to]).flat().concat(x.tax.map(t => t.store))) if (!locOf(s)) return 'STOP: no location ' + s;

// remove what the week lacks
const del = async (m, what) => {
  const before = g.dataSource.total(), conf = window.confirm;
  window.confirm = () => true;
  jQuery('tr[data-uid="' + m.uid + '"] .k-grid-delete').trigger('click');
  for (let t = 0; t < 40 && g.dataSource.total() === before; t++) await wait(250);
  window.confirm = conf;
  if (g.dataSource.total() !== before - 1) throw 'STOP: delete failed ' + what;
};
// one row through the new-row form; back-to-back adds can blank the account, so wait and retry it
const add = async (a, side, amount, s, comment) => {
  await wait(1500);
  const id = acctOf(a).glAccountId, l = locOf(s), before = g.dataSource.total();
  for (let t = 0; t < 10 && dd.value() !== id; t++) { dd.value(id); dd.trigger('change'); await wait(500); }
  if (dd.value() !== id) throw 'STOP: account not set ' + a;
  sc.$apply(() => { f.model.debit = side === 'debit' ? String(amount) : '0'; f.model.credit = side === 'credit' ? String(amount) : '0'; f.model.comment = comment; f.model.locationId = [l.locationId]; });
  if ([].concat(f.model.locationId)[0] !== l.locationId) throw 'STOP: form location not set ' + s;
  sc.$apply(() => f.addRowToGrid());
  for (let t = 0; t < 40 && g.dataSource.total() === before; t++) await wait(250);
  if (g.dataSource.total() !== before + 1) throw 'STOP: add failed ' + a + ' @ ' + s;
  const m = g.dataSource.at(before);
  if (acct(m) !== a || Math.abs(+m[side] - amount) > 0.004) throw 'STOP: added wrong row ' + m.glAccount + ' ' + m[side];
  if (m.locationId !== l.locationId) { m.set('locationId', l.locationId); m.set('location', l.locationName); }
};
try {
  for (const p of pairs.filter(p => !used.has(p))) {
    await del(p.cr, 'pair ' + p.cr.comment); await del(p.dr, 'pair ' + p.dr.comment);
    msg.push('REMOVED wage pair ' + p.cr.comment + ' ' + p.key);
  }
  for (const s of Object.keys(taxes)) if (!x.tax.some(t => t.store === s)) { await del(taxes[s], 'tax ' + s); delete taxes[s]; msg.push('REMOVED tax line @ ' + s); }
  for (const v of adds) {
    await add(v.creditAcct, 'credit', v.amount, v.from, v.name);
    await add(v.debitAcct, 'debit', v.amount, v.to, v.name);
    msg.push('ADDED ' + v.name + ' ' + v.amount.toFixed(2) + ': credit ' + v.creditAcct + ' @ ' + loc[v.from] + ', debit ' + v.debitAcct + ' @ ' + loc[v.to]);
  }
  for (const t of x.tax.filter(t => !taxes[t.store])) {
    const side = t.debit ? 'debit' : 'credit';
    await add('610-01', side, t[side], t.store, '');
    taxes[t.store] = g.dataSource.at(g.dataSource.total() - 1);
    msg.push('ADDED tax 610-01 @ ' + loc[t.store] + ' ' + side + ' ' + t[side].toFixed(2));
  }
} catch (e) { return String(e) + (msg.length ? ' ; after ' + msg.join(' ; ') : ''); }

for (const [v, p] of plan) {
  p.cr.set('credit', v.amount); p.cr.set('debit', 0); p.cr.set('comment', v.name);
  p.dr.set('debit', v.amount); p.dr.set('credit', 0); p.dr.set('comment', v.name);
}
for (const t of x.tax) { const m = taxes[t.store]; m.set('debit', t.debit); m.set('credit', t.credit); m.set('comment', ''); }
const all = Array.prototype.slice.call(g.dataSource.data());
const dr = all.reduce((s, m) => s + (+m.debit || 0), 0), cr = all.reduce((s, m) => s + (+m.credit || 0), 0);
return 'set ' + all.length + ' lines, debits ' + dr.toFixed(2) + ' credits ' + cr.toFixed(2) + (msg.length ? ' ; ' + msg.join(' ; ') : '');
}`);
