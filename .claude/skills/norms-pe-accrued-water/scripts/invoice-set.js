async () => { const NACC=__NACC__, NEXP=__NEXP__, TOT=__TOT__, A='__ACC__', E='__EXP__';
 const G={[A]:'__GACC__',[E]:'__GEXP__'};
 const add=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='Add'&&x.offsetParent); if(!add) return 'STOP not in edit';
 const sc=angular.element(add).scope(); const f=sc.gridOptions.APInvoiceDetailsGrid.newRowForm;
 const ds=jQuery('#APInvoiceDetailsGrid').data('kendoGrid').dataSource; const W=()=>ds.data().filter(m=>m.glAccount.startsWith(A+' ')||m.glAccount.startsWith(E+' '));
 const before=W().reduce((s,m)=>s+(+m.amount||0),0); if(Math.abs(before-TOT)>0.005) return 'STOP bill total '+before.toFixed(2)+' want '+TOT;
 const loc=W()[0].locationId; const C='Accrual relieved to balance, difference to __NOUN__ expense';
 for(const [a,v] of [[A,NACC],[E,NEXP]]){ const rows=ds.data().filter(m=>m.glAccount.startsWith(a+' '));
  if(rows.length>1) return 'STOP multiple '+a;
  if(rows.length===1){ rows[0].set('amount',v); rows[0].set('total',v); continue; }
  if(v===0) continue;
  const dd=f.GLAccountsKendoDropDownList; dd.value(G[a]); dd.trigger('change');
  sc.$apply(()=>{ f.model.amount=String(v); f.model.total=String(v); f.model.comment=C; f.model.location=loc; f.model.locations=[loc]; });
  await f.addRowToGrid(); await new Promise(r=>setTimeout(r,2000)); }
 const after=W().map(m=>m.glAccount.slice(0,4)+':'+m.amount+':'+m.location+':'+(m.isNew&&m.isNew()?'new':''));
 const sum=W().reduce((s,m)=>s+(+m.amount||0),0);
 return JSON.stringify({after,sum:sum.toFixed(2),all:ds.data().toJSON().reduce((s,m)=>s+(+m.amount||0),0).toFixed(2)}); }
