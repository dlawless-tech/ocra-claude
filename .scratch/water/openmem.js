() => {
  const seen=[];
  const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } };
  walk(document);
  const d = seen.find(x=>{ try { return x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'); } catch(e){ return false; } });
  if(!d) return 'no grid';
  const g = d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
  const rows = Array.from(g.tbody[0].querySelectorAll('tr'));
  for (const tr of rows) {
    const it = g.dataItem(tr);
    if (it && it.Name === 'Template: 211 - Slauson:Accrued Electricity') {
      const f = tr.querySelector('font');
      if (f) { f.click(); return 'opened'; }
      const a = tr.querySelector('a'); if (a) { a.click(); return 'opened via a'; }
      return 'row found, no clickable: ' + tr.innerHTML.slice(0,200);
    }
  }
  return 'not found';
}
