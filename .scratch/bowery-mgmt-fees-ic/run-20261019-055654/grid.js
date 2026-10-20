async () => {
const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument);}catch(e){} } }; walk(document);
const d = seen.find(x=>x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid') && /Approval Status/.test(x.body.innerText||''));
if(!d) return 'nogrid';
const g = d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
g.dataSource.filter({field:'Number', operator:'contains', value:'Management Fees'});
await new Promise(r=>setTimeout(r,7000));
const dt = x => { const D=new Date(x.Date); return (D.getMonth()+1)+'/'+D.getDate()+'/'+D.getFullYear(); };
return JSON.stringify(g.dataSource.view().map(x => ({n:x.Number, date:dt(x), id:x.TransactionId, st:x.ApprovalStatus, amt:x.Amount, loc:x.Location, type:x.Type})));
}
