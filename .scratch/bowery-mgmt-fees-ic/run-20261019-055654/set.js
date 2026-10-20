() => {
const fee = {"Cookshop":9997.69,"Shuka":10891.43,"Vic's":3328.92,"Rosie's":4328.95,"Shukette":11373.42};
const apo = s => String(s || '').split(String.fromCharCode(8217)).join("'");
const locName = s => apo(s).split(' - ').slice(1).join(' - ');
const byComment = c => Object.keys(fee).find(k => apo(c) === k || apo(c).startsWith(k + ' '));
const g = jQuery('[data-role=grid]').data('kendoGrid');
const rows = Array.prototype.slice.call(g.dataSource.data());
const plan = [], seen = {};
for (const m of rows) {
  const a = String(m.glAccount || ''), loc = locName(m.location), bowery = /^800 /.test(String(m.location));
  let store, side, comment;
  if (/^660-00 /.test(a)) { store = loc; side = 'debit'; comment = store; }
  else if (/^402-00 /.test(a) && bowery) { store = byComment(m.comment); side = 'credit'; comment = store; }
  else if (/^100-20 /.test(a) && bowery) { store = byComment(m.comment); side = 'debit'; comment = store + ' -> Bowery Transfer'; }
  else if (/^100-/.test(a) && !bowery) { store = loc; side = 'credit'; comment = store + ' -> Bowery Transfer'; }
  if (!store || !(store in fee)) return 'STOP: unmatched line ' + a + ' | ' + m.location + ' | ' + m.comment;
  seen[store] = (seen[store] || 0) + 1;
  plan.push([m, side, fee[store], comment]);
}
const bad = Object.keys(fee).filter(k => seen[k] !== 4);
if (rows.length !== 20 || bad.length) return 'STOP: ' + rows.length + ' lines; stores without 4 lines: ' + bad.join(', ');
for (const [m, side, amt, comment] of plan) {
  m.set(side, amt); m.set(side === 'debit' ? 'credit' : 'debit', 0); m.set('comment', comment);
}
const dr = rows.reduce((t, m) => t + (+m.debit || 0), 0), cr = rows.reduce((t, m) => t + (+m.credit || 0), 0);
return 'set 20 lines, debits ' + dr.toFixed(2) + ' credits ' + cr.toFixed(2);
}