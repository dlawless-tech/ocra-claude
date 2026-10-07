() => { const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument);}catch(e){} } }; walk(document);
const d=seen.find(x=>x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'));
const g=d.defaultView.jQuery('[data-role=grid]').data('kendoGrid'); const r=g.dataSource.view()[0];
return JSON.stringify({total:g.dataSource.total(), filter:g.dataSource.filter(), keys:Object.keys(r.toJSON()), cols:g.columns.map(c=>c.field)}); }
