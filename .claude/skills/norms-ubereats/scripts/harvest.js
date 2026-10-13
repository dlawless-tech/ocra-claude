async () => {
// UberEats entries dated __DATE__ (yyyy-mm-dd) from the All Transactions grid; run with __DATE__ replaced
const seen=[];const walk=(d)=>{seen.push(d);for(const f of d.querySelectorAll('iframe')){try{if(f.contentDocument)walk(f.contentDocument);}catch(e){}}};walk(document);
const d=seen.find(x=>x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'));
if(!d) return 'no grid';
const g=d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
g.dataSource.filter({field:'Number',operator:'contains',value:'UberEats'});
await new Promise(r=>setTimeout(r,8000));
const dt=x=>{const D=new Date(x.Date);return D.getFullYear()+'-'+String(D.getMonth()+1).padStart(2,'0')+'-'+String(D.getDate()).padStart(2,'0');};
return JSON.stringify(g.dataSource.view().filter(x=>dt(x)==='__DATE__').map(x=>({loc:x.Location,id:x.TransactionId,status:x.ApprovalStatus,amt:x.Amount})));
}
