() => {
  const seen=[];
  const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } };
  walk(document);
  const d = seen.find(x=>{ try { return x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'); } catch(e){ return false; } });
  if(!d) return 'no grid yet; frames=' + seen.length;
  const g = d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
  const v = g.dataSource.view();
  const arr=[]; for(let i=0;i<v.length;i++) arr.push(v[i]);
  return JSON.stringify({total:g.dataSource.total(), cols:g.columns.map(c=>c.field), rows: arr.slice(0,40).map(x=>({n:x.Name, num:x.Number, loc:x.Location, t:x.TransactionType, rec:x.Recurrence||x.AutoRecurrence||x.Frequency}))});
}
