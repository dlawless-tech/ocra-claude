() => {
  const seen=[];
  const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } };
  walk(document);
  const d = seen.find(x=>{ try { return x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'); } catch(e){ return false; } });
  const g = d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
  return JSON.stringify(g.columns.map(c=>({f:c.field, t:c.title, hidden:!!c.hidden})));
}
