async () => { const docs=[]; const walk=w=>{try{docs.push(w.document);for(const f of w.document.querySelectorAll("iframe,frame")){try{walk(f.contentWindow)}catch(e){}}}catch(e){}}; walk(window);
const d=docs.find(x=>x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid')); if(!d) return 'nogrid '+location.href+' docs '+docs.length;
const g=d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
g.dataSource.filter({field:'Number',operator:'contains',value:'BD000171'}); await new Promise(r=>setTimeout(r,6000));
return JSON.stringify(g.dataSource.view().map(x=>({n:x.Number,t:x.Type,d:String(x.Date),loc:x.Location,amt:x.Amount,st:x.ApprovalStatus,id:x.TransactionId}))); }
