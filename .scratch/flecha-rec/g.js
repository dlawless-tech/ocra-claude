() => { const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } }; walk(document);
const out=[]; for(const d of seen){ const jq=d.defaultView.jQuery; if(!jq) continue; jq('[data-role=grid]').each((i,el)=>{ const g=jq(el).data('kendoGrid'); if(g) out.push({id:el.id, n:g.dataSource.data().length, keys:Object.keys(g.dataSource.data()[0]?g.dataSource.data()[0].toJSON():{}), first:g.dataSource.data()[0]&&g.dataSource.data()[0].toJSON()}); }); }
return JSON.stringify(out); }
