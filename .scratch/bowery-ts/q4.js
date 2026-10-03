async () => { const docs=[]; const walk=w=>{try{docs.push(w.document);for(const f of w.document.querySelectorAll("iframe,frame")){try{walk(f.contentWindow)}catch(e){}}}catch(e){}}; walk(window);
const d=docs.find(x=>x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid')); if(!d) return 'nogrid';
const g=d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
const nums=['BD000191','BD000190','BD000097','BD000174','BD000177','BD000175','BD000176','BD000179','BD000181','BD000180'];
g.dataSource.filter({logic:'or',filters:nums.map(n=>({field:'Number',operator:'eq',value:n}))}); await new Promise(r=>setTimeout(r,10000));
return g.dataSource.view().map(x=>x.Number+' '+x.TransactionId).join('\n'); }
