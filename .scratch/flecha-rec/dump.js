() => { const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } }; walk(document);
const d = seen.find(x=>x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'));
if(!d) return 'nogrid';
const g=d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
const v=g.dataSource.data(); const types={}; v.forEach(x=>types[x.Type]=(types[x.Type]||0)+1);
return JSON.stringify({n:v.length, total:g.dataSource.total(), types, rec:v.filter(x=>/Rec/i.test(x.Type)).map(x=>({n:x.Number,d:x.Date,t:x.Type,s:x.ApprovalStatus,a:x.Amount,id:x.TransactionId,loc:x.Location}))}); }
