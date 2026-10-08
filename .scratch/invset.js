async () => { const N2285=__N2285__, N5635=__N5635__, TOT=__TOT__;
 const G={'2285':'77119bc6-3e3c-42dc-aaf8-186ff8752aad','5635':'4f470164-be53-f111-aa98-000d3a41fbd2'};
 const add=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='Add'&&x.offsetParent); if(!add) return 'STOP not in edit';
 const sc=angular.element(add).scope(); const f=sc.gridOptions.APInvoiceDetailsGrid.newRowForm;
 const ds=jQuery('#APInvoiceDetailsGrid').data('kendoGrid').dataSource; const W=()=>ds.data().filter(m=>/^(2285|5635) /.test(m.glAccount));
 const before=W().reduce((s,m)=>s+(+m.amount||0),0); if(Math.abs(before-TOT)>0.005) return 'STOP water total '+before.toFixed(2)+' want '+TOT;
 const loc=W()[0].locationId; const C='Accrual relieved to balance, difference to water expense';
 for(const [a,v] of [['2285',N2285],['5635',N5635]]){ const rows=ds.data().filter(m=>m.glAccount.startsWith(a+' '));
  if(rows.length>1) return 'STOP multiple '+a;
  if(rows.length===1){ rows[0].set('amount',v); rows[0].set('total',v); continue; }
  if(v===0) continue;
  const dd=f.GLAccountsKendoDropDownList; dd.value(G[a]); dd.trigger('change');
  sc.$apply(()=>{ f.model.amount=String(v); f.model.total=String(v); f.model.comment=C; f.model.location=loc; f.model.locations=[loc]; });
  await f.addRowToGrid(); await new Promise(r=>setTimeout(r,2000)); }
 const after=W().map(m=>m.glAccount.slice(0,4)+':'+m.amount+':'+m.location+':'+(m.isNew&&m.isNew()?'new':''));
 const sum=W().reduce((s,m)=>s+(+m.amount||0),0);
 return JSON.stringify({after,sum:sum.toFixed(2),all:ds.data().toJSON().reduce((s,m)=>s+(+m.amount||0),0).toFixed(2)}); }
