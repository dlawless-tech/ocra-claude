() => {
  const seen=[];
  const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } };
  walk(document);
  const d = seen.find(x=>{ try { return x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'); } catch(e){ return false; } });
  const g = d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
  const rows = Array.from(g.tbody[0].querySelectorAll('tr'));
  for (const tr of rows) {
    const it = g.dataItem(tr);
    if (it && it.Name === 'Template: 211 - Slauson:Accrued Electricity') {
      const tds = Array.from(tr.querySelectorAll('td'));
      return JSON.stringify({item: {Name: it.Name, id: it.TransactionId || it.Id, type: it.TransactionType},
        cells: tds.map(t=>t.innerHTML.slice(0,160))});
    }
  }
  return 'not found';
}
