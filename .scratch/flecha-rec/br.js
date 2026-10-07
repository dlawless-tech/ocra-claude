() => { const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } }; walk(document);
const d = seen.find(x=>x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'));
if(!d) return 'nogrid';
const g=d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
return JSON.stringify(g.dataSource.data().map(x=>x.toJSON())); }
