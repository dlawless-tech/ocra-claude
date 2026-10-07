async () => { const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } }; walk(document);
 const d = seen.find(x=>{ try { return x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'); } catch(e){ return false; } });
 const g = d.defaultView.jQuery('[data-role=grid]').data('kendoGrid'); g.dataSource.pageSize(500);
 await g.dataSource.filter({logic:'or',filters:[{field:'Number',operator:'contains',value:'Accrued Electricity'}]});
 const v=g.dataSource.view(); const a=[]; for(let i=0;i<v.length;i++) a.push(v[i]);
 const x=a.find(r=>r.TransactionId==='1072dc71-8db3-4ec3-ba5a-e9efb4d718a6'); const y=a.find(r=>r.TransactionId==='1e73178b-471a-4736-8acc-cb2f74d2d309');
 const flat=o=>{const r={};if(!o)return null;for(const k in o){if(typeof o[k]!=='function'&&(typeof o[k]!=='object'||o[k] instanceof Date))r[k]=String(o[k]).slice(0,60);}return r;};
 return JSON.stringify({n:a.length,dup:flat(x),orig:flat(y)}); }
