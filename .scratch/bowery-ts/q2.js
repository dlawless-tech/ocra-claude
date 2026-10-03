async () => { const docs=[]; const walk=w=>{try{docs.push(w.document);for(const f of w.document.querySelectorAll("iframe,frame")){try{walk(f.contentWindow)}catch(e){}}}catch(e){}}; walk(window);
const d=docs.find(x=>x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid')); if(!d) return 'nogrid';
const g=d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
g.dataSource.filter({field:'Number',operator:'startswith',value:'BD'}); await new Promise(r=>setTimeout(r,8000));
return JSON.stringify(g.dataSource.view().filter(x=>new Date(x.Date)>=new Date('2026-08-25')).map(x=>({n:x.Number,d:new Date(x.Date).toLocaleDateString(),loc:x.Location,amt:x.Amount,st:x.ApprovalStatus,c:x.Comment,id:x.TransactionId}))); }
