() => {
const want = [{"side":"debit","gl":"7350 - Grubhub Third Party Fees","amount":13.06,"comment":"delivery + order processing"},{"side":"debit","gl":"7570 - Grubhub Marketing","amount":13.04,"comment":"marketing + ad spend"},{"side":"debit","gl":"2270 - Sales Tax Payable","amount":15.67,"comment":"sales tax withheld"},{"side":"credit","gl":"1103 - Grubhub Deposit Clearing","amount":41.77,"comment":"orders 10/6 - 10/12, Grubhub net 104.37"}];
const loc = "10900 - FARE Sterling Food Hall";
const apo = v => String(v || '').split(String.fromCharCode(8217)).join("'");
const key = (side, gl, c) => side + ' | ' + apo(gl) + ' | ' + (c || '');
const g = jQuery('[data-role=grid]').data('kendoGrid');
const rows = Array.prototype.slice.call(g.dataSource.data());
const have = {};
for (const m of rows) {
  if (apo(m.location) !== loc) return 'STOP: line ' + m.glAccount + ' at ' + m.location + ', expected ' + loc;
  const side = +m.credit ? 'credit' : +m.debit ? 'debit' : null;
  if (!side) return 'STOP: zero line ' + m.glAccount;
  const k = key(side, m.glAccount, m.comment);
  if (have[k]) return 'STOP: two lines on ' + k;
  have[k] = m;
}
const msg = [];
for (const w of want) if (!have[key(w.side, w.gl, w.comment)]) msg.push('ADD ' + w.side + ' ' + w.amount.toFixed(2) + ' ' + w.gl + ' comment "' + w.comment + '"');
for (const k of Object.keys(have)) if (!want.some(w => key(w.side, w.gl, w.comment) === k)) msg.push('REMOVE ' + k);
if (msg.length) return msg.join(' ; ');
for (const w of want) {
  const m = have[key(w.side, w.gl, w.comment)];
  m.set(w.side, w.amount); m.set(w.side === 'credit' ? 'debit' : 'credit', 0); m.set('comment', w.comment);
}
const dr = rows.reduce((t, m) => t + (+m.debit || 0), 0), cr = rows.reduce((t, m) => t + (+m.credit || 0), 0);
return 'set ' + rows.length + ' lines, debits ' + dr.toFixed(2) + ' credits ' + cr.toFixed(2);
}