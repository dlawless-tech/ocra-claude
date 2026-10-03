async () => { const docs=[]; const walk=w=>{try{docs.push(w.document);for(const f of w.document.querySelectorAll("iframe,frame")){try{walk(f.contentWindow)}catch(e){}}}catch(e){}}; walk(window);
const d=docs.find(x=>x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid')); if(!d) return 'nogrid';
const g=d.defaultView.jQuery('[data-role=grid]').data('kendoGrid'); const out=[];
for (const loc of ['Vic','Cookshop']) {
  g.dataSource.pageSize(1000);
  g.dataSource.filter({logic:'and',filters:[{field:'Number',operator:'startswith',value:'BD'},{field:'Location',operator:'contains',value:loc}]});
  await new Promise(r=>setTimeout(r,10000));
  const v=g.dataSource.view(); out.push(loc+' rows='+v.length+' total='+g.dataSource.total());
  v.filter(x=>new Date(x.Date)>=new Date('2026-08-31')&&new Date(x.Date)<=new Date('2026-09-30')).forEach(x=>out.push([x.Number,new Date(x.Date).toLocaleDateString(),x.Location,x.Amount,x.Comment].join(' | ')));
}
return out.join('\n'); }
