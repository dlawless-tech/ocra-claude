() => {
  const TARGET = 'Van Nuys';
  const seen=[];
  const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } };
  walk(document);
  const d = seen.find(x=>{ try { return x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'); } catch(e){ return false; } });
  if(!d) return 'FAIL no grid doc';
  const g = d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
  const rows = Array.from(g.tbody[0].querySelectorAll('tr'));
  const hits = rows.filter(tr => { const it = g.dataItem(tr); return it && it.Location === TARGET && it.Number === 'Accrued Water'; });
  if (hits.length !== 1) return 'FAIL expected 1 row, got ' + hits.length;
  const f = hits[0].querySelector('font');
  if (!f) return 'FAIL no font cell';
  f.click();
  return 'opened';
}
