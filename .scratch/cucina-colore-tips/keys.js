async () => {
const seen=[];const walk=(d)=>{seen.push(d);for(const f of d.querySelectorAll('iframe')){try{if(f.contentDocument)walk(f.contentDocument);}catch(e){}}};walk(document);
const d=seen.find(x=>x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'));
if(!d) return 'no grid';
const g=d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
g.dataSource.pageSize(1000);
g.dataSource.filter({field:'Number',operator:'eq',value:'Payroll'});
await new Promise(r=>setTimeout(r,10000));
const v=g.dataSource.view(); const r=v[0];
return JSON.stringify(Object.keys(r.toJSON?r.toJSON():r)) + ' || ' + v.slice(0,10).map(x=>{const j=x.toJSON?x.toJSON():x; return Object.entries(j).filter(([k,val])=>/Date|Created|Modif|Approv/i.test(k)).map(([k,val])=>k+'='+val).join(',')}).join(' || ');
}
