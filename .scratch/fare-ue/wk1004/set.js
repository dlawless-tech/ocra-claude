() => {
const want = [{"side":"debit","gl":"7380 - Uber Eats Third Party Fees","amount":1271.66,"comment":"marketplace fees"},{"side":"debit","gl":"7535 - Third Party Refunds","amount":69.24,"comment":"net chargeback"},{"side":"debit","gl":"2270 - Sales Tax Payable","amount":656.84,"comment":""},{"side":"credit","gl":"1111 - Uber Eats Deposit Clearing","amount":1997.74,"comment":""}];
const loc = "11300 - FARE Old Town";
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