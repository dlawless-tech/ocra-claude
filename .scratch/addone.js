async () => { const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='Add'&&x.offsetParent); const sc=angular.element(b).scope(); const f=sc.gridOptions.journalEntryDetailsGrid.newRowForm;
 const ds=jQuery('[data-role=grid]').data('kendoGrid').dataSource; const ref=ds.data().find(m=>/^2285 /.test(m.glAccount)); const loc=ds.data().find(m=>/Anaheim/.test(m.location));
 const dd=f.GLAccountsKendoDropDownList; dd.value(ref.glAccountId); dd.trigger('change');
 sc.$apply(()=>{ f.model.debit='0'; f.model.credit='2113.36'; f.model.comment='Move water accrual from Support Center to stores, true up unbilled thru 9/5'; f.model.locationId=[loc.locationId]; });
 const before=ds.data().length; await f.addRowToGrid(); await new Promise(r=>setTimeout(r,3000));
 const d=ds.data(); const last=d.find(m=>/^2285 /.test(m.glAccount)&&/Anaheim/.test(m.location));
 return JSON.stringify({before,after:d.length,dditem:(dd.dataItem()||{}).text||null,last:last?{id:last.transactionDetailId,isNew:last.isNew(),cr:last.credit,dr:last.debit,loc:last.location,c:last.comment,gl:last.glAccount}:null, model:f.model}); }
