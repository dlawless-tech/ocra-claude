() => {
  const TARGET = '__T__';
  const seen=[];
  const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } };
  walk(document);
  const d = seen.find(x=>{ try { return x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'); } catch(e){ return false; } });
  const g = d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
  const rows = Array.from(g.tbody[0].querySelectorAll('tr'));
  for (const tr of rows) {
    const item = g.dataItem(tr);
    if (item && item.Location === TARGET) {
      const f = tr.querySelector('font');
      if (!f) return 'row found but no font cell';
      f.click();
      return 'opened ' + TARGET;
    }
  }
  return 'row not found';
}
