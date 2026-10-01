() => {
const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } }; walk(document);
const d = seen.find(x=>x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'));
const g = d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
const r = g.dataSource.view().filter(x=>/Riverside|Sterling/.test(x.Location) && /Uber/.test(x.Number));
return JSON.stringify(r.map(x=>{ const o=x.toJSON(); return Object.fromEntries(Object.entries(o).filter(([k,v])=>v!==null&&v!==''&&typeof v!=='object')); }));
}
