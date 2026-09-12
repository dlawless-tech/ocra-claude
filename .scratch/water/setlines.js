() => {
  const LOC = '213 - North Torrance', LID = '6023b2ee-cbfb-4ac3-8163-f2a30bfd5973', AMT = 325;
  const g = jQuery('[data-role=grid]').data('kendoGrid');
  const ds = g.dataSource;
  for (let i = 0; i < ds.data().length; i++) {
    const m = ds.at(i);
    m.set('location', LOC);
    m.set('locationId', LID);
    if (m.glAccount.indexOf('5635') === 0) { m.set('debit', AMT); m.set('credit', 0); }
    else { m.set('credit', AMT); m.set('debit', 0); }
  }
  return JSON.stringify(ds.data().map(r=>({acct:r.glAccount, d:r.debit, c:r.credit, loc:r.location})));
}
