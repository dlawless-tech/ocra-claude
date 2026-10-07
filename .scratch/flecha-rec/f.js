async () => { const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } }; walk(document);
const d = seen.find(x=>x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'));
const g=d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
g.dataSource.filter({field:'TransactionType',operator:'contains',value:'Reconcil'});
await new Promise(r=>setTimeout(r,8000));
return JSON.stringify(g.dataSource.view().map(x=>({n:x.Number,d:x.Date,t:x.TransactionType,s:x.ApprovalStatus,a:x.Amount,ca:x.CheckingAccount,id:x.TransactionId,nm:x.Name}))); }
