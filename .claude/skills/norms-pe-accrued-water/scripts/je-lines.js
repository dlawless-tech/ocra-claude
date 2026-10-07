async () => {
  // Rewrite the open JE's grid to __LINES__ = [{acct:'2285',loc:'217 - Anaheim',dr,cr}], comment __C__.
  // Only these edits persist: model.set on existing rows, newRowForm.addRowToGrid for new rows,
  // the row's .k-grid-delete trash icon for removals. dataSource.add / remove do not save.
  const WANT = __LINES__, C = __C__, IDS = __IDS__;
  const NAMES = { '2285': '2285 - Accrued Water', '5635': '5635 - Utilities Water' };
  const g = jQuery('[data-role=grid]').data('kendoGrid'), ds = g.dataSource; ds.pageSize(500);
  await new Promise(r => setTimeout(r, 800));
  const add = [...document.querySelectorAll('button')].find(x => x.innerText.trim() === 'Add' && x.offsetParent);
  const sc = angular.element(add).scope(), f = sc.gridOptions.journalEntryDetailsGrid.newRowForm;
  const rows = ds.data().slice();
  const n = Math.min(rows.length, WANT.length);
  for (let i = 0; i < n; i++) {
    const m = rows[i], w = WANT[i];
    m.set('glAccount', NAMES[w.acct]); m.set('glAccountId', IDS.accounts[w.acct]);
    m.set('location', w.loc); m.set('locationId', IDS.locations[w.loc]);
    m.set('debit', w.dr); m.set('credit', w.cr); m.set('comment', C);
  }
  for (const w of WANT.slice(n)) {
    const dd = f.GLAccountsKendoDropDownList; dd.value(IDS.accounts[w.acct]); dd.trigger('change');
    sc.$apply(() => { f.model.debit = String(w.dr); f.model.credit = String(w.cr); f.model.comment = C; f.model.locationId = [IDS.locations[w.loc]]; });
    await f.addRowToGrid(); await new Promise(r => setTimeout(r, 1500));
  }
  for (const m of rows.slice(n)) {
    g.tbody.find('tr[data-uid=' + m.uid + '] .k-grid-delete').trigger('click');
    await new Promise(r => setTimeout(r, 1200));
  }
  const d = ds.data().toJSON(); let dr = 0, cr = 0; d.forEach(x => { dr += +x.debit || 0; cr += +x.credit || 0; });
  return JSON.stringify({ n: d.length, want: WANT.length, dr: dr.toFixed(2), cr: cr.toFixed(2) });
}
