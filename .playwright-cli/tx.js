async () => {
const seen=[];
const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } };
walk(document);
const d = seen.find(x=>x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'));
if(!d) return 'nogrid '+seen.length;
const g = d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
g.dataSource.filter({field:'Number', operator:'contains', value:'UberEats'});
await new Promise(r=>setTimeout(r,8000));
const dt = x => { const D=new Date(x.Date); return D.getFullYear()+'-'+String(D.getMonth()+1).padStart(2,'0')+'-'+String(D.getDate()).padStart(2,'0'); };
return JSON.stringify(g.dataSource.view().filter(x=>dt(x)>='2026-09-13').map(x=>({d:dt(x),num:x.Number,loc:x.Location,id:x.TransactionId,st:x.ApprovalStatus,amt:x.Amount})));
}
