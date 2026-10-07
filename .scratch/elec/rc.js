() => { const ds=jQuery('[data-role=grid]').data('kendoGrid').dataSource; if(ds.data().length!==2) return 'STOP lines '+ds.data().length;
 const c='P7 accrual booked at Riverside, cleared on Downey bill 7/8-8/5';
 for(let i=0;i<2;i++){const m=ds.at(i);
  if(/^5630 /.test(m.glAccount)){ m.set('debit',6293.24); m.set('credit',0); m.set('comment',c); }
  else if(/^2281 /.test(m.glAccount)){ m.set('glAccount','5630 - Utilities Electric'); m.set('glAccountId','4e470164-be53-f111-aa98-000d3a41fbd2'); m.set('location','245 - Riverside'); m.set('locationId','9d35968e-d643-499e-9d40-13f2e49b9256'); m.set('debit',0); m.set('credit',6293.24); m.set('comment',c); }
  else return 'STOP acct '+m.glAccount; }
 return JSON.stringify({d:document.getElementById('journalEntryDate').value,n:document.getElementById('journalEntryNumber').value,l:ds.data().map(m=>[m.glAccount,m.debit,m.credit,m.location].join(':'))}); }
