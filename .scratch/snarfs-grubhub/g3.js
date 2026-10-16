async () => {
const seen=[]; const walk=d=>{seen.push(d); for(const f of d.querySelectorAll('iframe')){try{if(f.contentDocument)walk(f.contentDocument)}catch(e){}}}; walk(document);
const d=seen.find(x=>x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'));
const g=d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
g.dataSource.pageSize(1000);
g.dataSource.filter({logic:'and',filters:[{field:'Location',operator:'contains',value:'Skinker'},{field:'Date',operator:'gte',value:new Date(2026,7,3)},{field:'Date',operator:'lte',value:new Date(2026,7,5)}]});
await new Promise(r=>setTimeout(r,10000));
const dt=x=>{const D=new Date(x.Date);return (D.getMonth()+1)+'/'+D.getDate()};
return JSON.stringify(g.dataSource.view().map(x=>[dt(x),x.Number,x.Type||x.TransactionType,x.ApprovalStatus,x.Amount,x.TransactionId,x.Comment||''].join(' | ')));
}
