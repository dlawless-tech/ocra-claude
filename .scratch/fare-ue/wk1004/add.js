async () => {
const want = [{"side":"debit","gl":"7380 - Uber Eats Third Party Fees","amount":1271.66,"comment":"marketplace fees"},{"side":"debit","gl":"7535 - Third Party Refunds","amount":69.24,"comment":"net chargeback"},{"side":"debit","gl":"2270 - Sales Tax Payable","amount":656.84,"comment":""},{"side":"credit","gl":"1111 - Uber Eats Deposit Clearing","amount":1997.74,"comment":""}];
const apo = v => String(v || '').split(String.fromCharCode(8217)).join("'");
const g = jQuery('[data-role=grid]').data('kendoGrid');
const sc = angular.element(document.querySelector('#newRowButtonsContainer')).scope();
const f = sc.gridOptions.journalEntryDetailsGrid.newRowForm;
const dd = f.GLAccountsKendoDropDownList;
const rows = Array.prototype.slice.call(g.dataSource.data());
if (!rows.length) return 'STOP: entry has no lines to take the location from';
const locId = rows[0].locationId;
const has = w => rows.some(m => apo(m.glAccount) === w.gl && (m.comment || '') === w.comment && +m[w.side] > 0);
const log = [];
for (const w of want.filter(w => !has(w))) {
  const acct = dd.dataSource.data().find(a => apo(a.label) === w.gl);
  if (!acct) { log.push('STOP: no account ' + w.gl); continue; }
  const before = g.dataSource.total();
  dd.value(acct.glAccountId); dd.trigger('change');
  sc.$apply(() => { f.model.debit = w.side === 'debit' ? String(w.amount) : '0'; f.model.credit = w.side === 'credit' ? String(w.amount) : '0'; f.model.comment = w.comment; });
  sc.$apply(() => f.addRowToGrid());
  for (let t = 0; t < 40 && g.dataSource.total() === before; t++) await new Promise(r => setTimeout(r, 250));
  if (g.dataSource.total() !== before + 1) { log.push('STOP: add failed ' + w.gl); continue; }
  const m = g.dataSource.at(before);
  if (apo(m.glAccount) !== w.gl || Math.abs(+m[w.side] - w.amount) > 0.004) { log.push('STOP: added wrong row ' + m.glAccount + ' ' + m[w.side]); continue; }
  if (m.locationId !== locId) { m.set('locationId', locId); m.set('location', rows[0].location); }
  log.push('added ' + w.side + ' ' + w.amount.toFixed(2) + ' ' + w.gl);
}
return log.join(' ; ') || 'nothing to add';
}