async () => { const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument);}catch(e){} } }; walk(document);
const d=seen.find(x=>x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'));
const g=d.defaultView.jQuery('[data-role=grid]').data('kendoGrid'); const out=[];
const dt=x=>{const D=new Date(x.Date);return (D.getMonth()+1)+'/'+D.getDate()+'/'+D.getFullYear()};
for (const f of ['Name','Number','Comment','PaidTo']) { g.dataSource.filter({logic:'and',filters:[{field:f,operator:'contains',value:'door'}]}); await new Promise(r=>setTimeout(r,12000));
 out.push('## '+f+' '+g.dataSource.view().length); g.dataSource.view().slice(0,60).forEach(x=>out.push([dt(x),x.TransactionType,x.Number,x.Name,x.Location,x.Amount,x.ApprovalStatus,x.Comment,x.TransactionId].join('|'))); }
return out.join('\n'); }
