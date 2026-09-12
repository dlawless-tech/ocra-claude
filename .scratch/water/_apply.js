() => {
  const LOC = '299 - Norms Support Center', LID = '6330baf0-6c6f-49d8-b59a-dd08686277d2', AMT = 132;
  const wrap = document.querySelector('[name="journalEntryLocation_input"]').closest('.k-widget');
  const orig = wrap.parentElement.querySelector('input:not(.k-input), select');
  const w = jQuery(orig).data('kendoComboBox');
  const d = w.dataSource.data();
  let idx = -1;
  for (let i = 0; i < d.length; i++) { if (d[i].locationName === LOC) { idx = i; break; } }
  if (idx < 0) return 'FAIL: location not in list';
  w.select(idx); w.trigger('change');
  const sc = angular.element(orig).scope(); if (sc) sc.$apply();
  const g = jQuery('[data-role=grid]').data('kendoGrid');
  const ds = g.dataSource;
  if (ds.data().length !== 2) return 'FAIL: expected 2 lines, got ' + ds.data().length;
  for (let i = 0; i < ds.data().length; i++) {
    const m = ds.at(i);
    m.set('location', LOC); m.set('locationId', LID);
    if (m.glAccount.indexOf('5635') === 0) { m.set('debit', AMT); m.set('credit', 0); }
    else if (m.glAccount.indexOf('2285') === 0) { m.set('credit', AMT); m.set('debit', 0); }
    else return 'FAIL: unexpected account ' + m.glAccount;
  }
  return JSON.stringify({hdr: document.querySelector('[name="journalEntryLocation_input"]').value,
    lines: ds.data().map(r=>({a:r.glAccount, d:r.debit, c:r.credit, l:r.location}))});
}
