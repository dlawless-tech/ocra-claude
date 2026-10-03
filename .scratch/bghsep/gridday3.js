async () => { const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument);}catch(e){} } }; walk(document);
const d=seen.find(x=>x.querySelector('input') && /Approval Status/.test(x.body.innerText||'')); if(!d) return 'nogrid';
const g=d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
g.dataSource.filter({logic:'and',filters:[{field:'Location',operator:'contains',value:'Shuka'},{field:'TransactionType',operator:'contains',value:'Journal'},{field:'Date',operator:'gte',value:new Date(2026,8,14)},{field:'Date',operator:'lte',value:new Date(2026,9,1)}]}); await new Promise(r=>setTimeout(r,9000));
const dt=x=>{const D=new Date(x.Date); return D.getFullYear()+'-'+String(D.getMonth()+1).padStart(2,'0')+'-'+String(D.getDate()).padStart(2,'0');};
return g.dataSource.view().map(x=>[dt(x),x.TransactionType,x.Name,x.TransactionId,x.ApprovalStatus,x.Amount,x.OriginDataSource].join(' | ')); }
