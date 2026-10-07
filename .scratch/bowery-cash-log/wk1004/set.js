() => {
const want = [{"side":"credit","gl":"210-00 - Tips Payable","amount":890.55,"comment":"09.28.26 - 10.04.26"},{"side":"debit","gl":"648-00 - Research & Development","amount":77,"comment":"Kalustyans - R&D Beverage 59.00; Samascott Orchards - R&D Beverage 18.00"},{"side":"debit","gl":"644-00 - Transportation Expense","amount":316,"comment":"Vicki Freeman - Transportation Expense 100.00; Wilfrin Fernandez-Cruz - Transportation Expense 150.00; Uber - Kitchen Transport 19.00; Uber - Kitchen Transport 18.00; Uber - Kitchen Transport 29.00"},{"side":"debit","gl":"100-99 - Undeposited Funds","amount":497.55,"comment":"09.28.26 - 10.04.26"}];
const loc = "200 - Cookshop";
const apo = v => String(v || '').split(String.fromCharCode(8217)).join("'");
const key = (side, gl) => side + ' | ' + apo(gl);
const g = jQuery('[data-role=grid]').data('kendoGrid');
const rows = Array.prototype.slice.call(g.dataSource.data());
const have = {};
for (const m of rows) {
  if (apo(m.location) !== loc) return 'STOP: line ' + m.glAccount + ' at ' + m.location + ', expected ' + loc;
  const side = +m.credit ? 'credit' : +m.debit ? 'debit' : null;
  if (!side) return 'STOP: zero line ' + m.glAccount;
  const k = key(side, m.glAccount);
  if (have[k]) return 'STOP: two lines on ' + k;
  have[k] = m;
}
const msg = [];
for (const w of want) if (!have[key(w.side, w.gl)]) msg.push('ADD ' + w.side + ' ' + w.amount.toFixed(2) + ' ' + w.gl + ' comment "' + w.comment + '"');
for (const k of Object.keys(have)) if (!want.some(w => key(w.side, w.gl) === k)) msg.push('REMOVE ' + k);
if (msg.length) return msg.join(' ; ');
for (const w of want) {
  const m = have[key(w.side, w.gl)];
  m.set(w.side, w.amount); m.set(w.side === 'credit' ? 'debit' : 'credit', 0); m.set('comment', w.comment);
}
const dr = rows.reduce((t, m) => t + (+m.debit || 0), 0), cr = rows.reduce((t, m) => t + (+m.credit || 0), 0);
return 'set ' + rows.length + ' lines, debits ' + dr.toFixed(2) + ' credits ' + cr.toFixed(2);
}