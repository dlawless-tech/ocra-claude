async () => {
  // Rewrite the open JE's grid to WANT = [{acct:'2285',loc:'217 - Anaheim',dr,cr}], comment C on every line.
  // Only these edits persist: model.set on existing rows, newRowForm.addRowToGrid for new rows,
  // the row's .k-grid-delete trash icon for removals. dataSource.add / remove do not save.
  const WANT = [{"acct":"5635","loc":"217 - Anaheim","dr":0,"cr":14.34},{"acct":"2285","loc":"217 - Anaheim","dr":14.34,"cr":0},{"acct":"5635","loc":"225 - Claremont","dr":0,"cr":645.38},{"acct":"2285","loc":"225 - Claremont","dr":645.38,"cr":0},{"acct":"5635","loc":"220 - Costa Mesa","dr":19.07,"cr":0},{"acct":"2285","loc":"220 - Costa Mesa","dr":0,"cr":19.07},{"acct":"5635","loc":"244 - Downey","dr":0,"cr":0.73},{"acct":"2285","loc":"244 - Downey","dr":0.73,"cr":0},{"acct":"5635","loc":"262 - El Monte","dr":1326.77,"cr":0},{"acct":"2285","loc":"262 - El Monte","dr":0,"cr":1326.77},{"acct":"5635","loc":"269 - Hollywood","dr":0,"cr":1987.72},{"acct":"2285","loc":"269 - Hollywood","dr":1987.72,"cr":0},{"acct":"5635","loc":"219 - Huntington Beach","dr":0,"cr":72.97},{"acct":"2285","loc":"219 - Huntington Beach","dr":72.97,"cr":0},{"acct":"5635","loc":"264 - Inglewood","dr":0,"cr":228.74},{"acct":"2285","loc":"264 - Inglewood","dr":228.74,"cr":0},{"acct":"5635","loc":"250 - La Cienega","dr":0,"cr":404.52},{"acct":"2285","loc":"250 - La Cienega","dr":404.52,"cr":0},{"acct":"5635","loc":"215 - Lakewood","dr":348.81,"cr":0},{"acct":"2285","loc":"215 - Lakewood","dr":0,"cr":348.81},{"acct":"6335","loc":"299 - Norms Support Center","dr":154.62,"cr":0},{"acct":"2285","loc":"299 - Norms Support Center","dr":0,"cr":154.62},{"acct":"5635","loc":"213 - North Torrance","dr":246.81,"cr":0},{"acct":"2285","loc":"213 - North Torrance","dr":0,"cr":246.81},{"acct":"5635","loc":"270 - Ontario","dr":0,"cr":234.08},{"acct":"2285","loc":"270 - Ontario","dr":234.08,"cr":0},{"acct":"5635","loc":"218 - Orange","dr":0,"cr":6.15},{"acct":"2285","loc":"218 - Orange","dr":6.15,"cr":0},{"acct":"5635","loc":"261 - Pico Rivera","dr":565.5,"cr":0},{"acct":"2285","loc":"261 - Pico Rivera","dr":0,"cr":565.5},{"acct":"5635","loc":"265 - Rialto","dr":250.94,"cr":0},{"acct":"2285","loc":"265 - Rialto","dr":0,"cr":250.94},{"acct":"5635","loc":"245 - Riverside","dr":1049.77,"cr":0},{"acct":"2285","loc":"245 - Riverside","dr":0,"cr":1049.77},{"acct":"5635","loc":"243 - Santa Ana","dr":11.89,"cr":0},{"acct":"2285","loc":"243 - Santa Ana","dr":0,"cr":11.89},{"acct":"5635","loc":"211 - Slauson","dr":9.74,"cr":0},{"acct":"2285","loc":"211 - Slauson","dr":0,"cr":9.74},{"acct":"5635","loc":"223 - South Torrance","dr":328.64,"cr":0},{"acct":"2285","loc":"223 - South Torrance","dr":0,"cr":328.64},{"acct":"5635","loc":"242 - Van Nuys","dr":0,"cr":780.05},{"acct":"2285","loc":"242 - Van Nuys","dr":780.05,"cr":0},{"acct":"5635","loc":"224 - West Covina","dr":0,"cr":95.4},{"acct":"2285","loc":"224 - West Covina","dr":95.4,"cr":0},{"acct":"5635","loc":"222 - Whittier","dr":7.72,"cr":0},{"acct":"2285","loc":"222 - Whittier","dr":0,"cr":7.72}], C = "True up to unbilled water thru 10/3/2026", IDS = {
 "accounts": {
  "2285": "77119bc6-3e3c-42dc-aaf8-186ff8752aad",
  "5635": "4f470164-be53-f111-aa98-000d3a41fbd2",
  "6335": "65470164-be53-f111-aa98-000d3a41fbd2"
 },
 "locations": {
  "211 - Slauson": "91fe6665-1421-4c6f-9362-4a0755e90e50",
  "213 - North Torrance": "6023b2ee-cbfb-4ac3-8163-f2a30bfd5973",
  "215 - Lakewood": "6dcbe84a-d322-4121-819c-9e95fbee7901",
  "217 - Anaheim": "0184ee57-288c-4bd0-a40a-99617f534235",
  "218 - Orange": "10871501-d0e5-485b-9b48-94d523395a9c",
  "219 - Huntington Beach": "0545600a-ad8b-425c-ba65-2ca2e7e43530",
  "220 - Costa Mesa": "3c591a6c-3174-4e51-ac3f-d6bd9180373c",
  "222 - Whittier": "56f189ab-e837-409f-9070-f15b135d357a",
  "223 - South Torrance": "6e5bf60e-9b0d-40ce-ae9e-baa997351589",
  "224 - West Covina": "8f55b444-968c-46b5-9e73-119793350017",
  "225 - Claremont": "e755458d-3948-412d-9ce5-bb79569c04c7",
  "242 - Van Nuys": "3aeb7f3a-6524-4d8d-a0b0-34e4875a568d",
  "243 - Santa Ana": "b39c50e8-df51-4bce-8405-9b38b57e85e5",
  "244 - Downey": "c128c598-d7a3-49b3-91ce-8aba11ea244f",
  "245 - Riverside": "9d35968e-d643-499e-9d40-13f2e49b9256",
  "250 - La Cienega": "ada0939c-683f-425b-8160-80b1f828aec1",
  "261 - Pico Rivera": "52100969-d713-4d9c-98c4-b08d00165501",
  "262 - El Monte": "6778c11e-fe6e-4bb2-90f0-22e8065d730b",
  "263 - Carson": "5566d87b-86d5-419a-9b7d-00d7ea7084df",
  "264 - Inglewood": "469d05f9-b494-4bbf-91f7-68c97e66bffc",
  "265 - Rialto": "2e76328e-1731-48fb-b8ab-f68c79fd0014",
  "269 - Hollywood": "72d6c464-4b5a-4b06-a723-72b6c0a26046",
  "270 - Ontario": "93f40990-6686-42a8-a145-4c46fcc8cc57",
  "272 - Las Vegas": "122dda46-43da-47e8-9dc3-8aeebd507771",
  "299 - Norms Support Center": "6330baf0-6c6f-49d8-b59a-dd08686277d2"
 }
};
  const NAMES = { '2285': '2285 - Accrued Water', '5635': '5635 - Utilities Water', '6335': '6335 - Water-Corp' };
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
