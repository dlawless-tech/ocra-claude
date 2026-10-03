() => {
const g = jQuery('[data-role=grid]').data('kendoGrid'); if (!g) return 'nogrid';
const want = __W__; const out = [];
for (const [acct, dr, cr] of want) {
  const rows = g.dataSource.data().filter(m => String(m.glAccount).startsWith(acct + ' '));
  if (rows.length !== 1) return 'rows for ' + acct + ': ' + rows.length;
  rows[0].set('debit', dr); rows[0].set('credit', cr); out.push(acct + ' ' + rows[0].debit + '/' + rows[0].credit);
}
return out.join(' | ');
}
