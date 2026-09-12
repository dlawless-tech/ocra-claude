() => {
  const o = {};
  ['journalEntryDate','journalEntryNumber','journalEntryLocation_input','journalEntryLocation'].forEach(n=>{
    const e = document.querySelector('[name="'+n+'"]'); if(e) o[n]=e.value;
  });
  const g = jQuery('[data-role=grid]').data('kendoGrid');
  o.lines = g ? g.dataSource.data().map(r=>({acct:r.glAccount, d:r.debit, c:r.credit, loc:r.location, tdid:r.transactionDetailId})) : 'no grid';
  o.status = (document.body.innerText.match(/Approved|Unapproved/)||[])[0];
  return JSON.stringify(o);
}
