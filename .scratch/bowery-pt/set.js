() => {
const want = [{"side":"credit","gl":"510-01 - Purchases-Beverage Liquor","loc":"600 - Shukette","amount":219},{"side":"debit","gl":"510-04 - Purchases-Beverage N/A","loc":"600 - Shukette","amount":219}];
const apo = s => String(s || '').split(String.fromCharCode(8217)).join("'");
const key = (side, gl, loc) => [side, apo(gl), apo(loc)].join(' | ');
const g = jQuery('[data-role=grid]').data('kendoGrid');
const rows = Array.prototype.slice.call(g.dataSource.data());
const have = {};
for (const m of rows) {
  const side = +m.credit ? 'credit' : +m.debit ? 'debit' : null;
  if (!side) return 'STOP: zero line ' + m.glAccount + ' | ' + m.location;
  const k = key(side, m.glAccount, m.location);
  if (have[k]) return 'STOP: two lines on ' + k;
  have[k] = m;
}
const msg = [];
for (const w of want) if (!have[key(w.side, w.gl, w.loc)]) msg.push('ADD ' + w.side + ' ' + w.amount.toFixed(2) + ' ' + w.gl + ' @ ' + w.loc);
for (const k of Object.keys(have)) if (!want.some(w => key(w.side, w.gl, w.loc) === k)) msg.push('REMOVE ' + k);
if (msg.length) return msg.join(' ; ');
for (const w of want) {
  const m = have[key(w.side, w.gl, w.loc)];
  m.set(w.side, w.amount); m.set(w.side === 'credit' ? 'debit' : 'credit', 0); m.set('comment', '');
}
const dr = rows.reduce((s, m) => s + (+m.debit || 0), 0), cr = rows.reduce((s, m) => s + (+m.credit || 0), 0);
return 'set ' + rows.length + ' lines, debits ' + dr.toFixed(2) + ' credits ' + cr.toFixed(2);
}