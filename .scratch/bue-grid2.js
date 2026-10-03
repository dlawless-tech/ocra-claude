async () => {
const seen=[];
const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } };
walk(document);
const d = seen.find(x=>x.querySelector('input') && /Approval Status/.test(x.body.innerText||''));
if(!d) return 'nogrid';
const g = d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
g.dataSource.filter({field:"Amount", operator:"eq", value:121.5});
await new Promise(r=>setTimeout(r,8000));
const dt = x => { const D=new Date(x.Date); return D.getFullYear()+'-'+String(D.getMonth()+1).padStart(2,'0')+'-'+String(D.getDate()).padStart(2,'0'); };
return JSON.stringify(g.dataSource.view().filter(x=>true).map(x => ({n:x.Number,d:dt(x),loc:x.Location, id:x.TransactionId, status:x.ApprovalStatus, amt:x.Amount, type:x.Type||x.TransactionType, cmt:x.Comment||x.Memo})));
}
