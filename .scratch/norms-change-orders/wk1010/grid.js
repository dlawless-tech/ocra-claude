async () => {
const seen=[];const walk=(d)=>{seen.push(d);for(const f of d.querySelectorAll('iframe')){try{if(f.contentDocument)walk(f.contentDocument);}catch(e){}}};walk(document);
const d=seen.find(x=>x.defaultView.jQuery&&x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'));if(!d)return 'nogrid';
const g=d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
g.dataSource.filter({field:'Number',operator:'contains',value:'Change Orders 10-4'});
await new Promise(r=>setTimeout(r,6000));
const dt=x=>{const D=new Date(x.Date);return D.getFullYear()+'-'+String(D.getMonth()+1).padStart(2,'0')+'-'+String(D.getDate()).padStart(2,'0');};
return JSON.stringify(g.dataSource.view().map(x=>({n:x.Number,d:dt(x),id:x.TransactionId,s:x.ApprovalStatus,a:x.Amount})));
}
