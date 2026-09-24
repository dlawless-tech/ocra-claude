() => {
  const seen=[];
  const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } };
  walk(document);
  const d = seen.find(x=>{ try { return x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'); } catch(e){ return false; } });
  const g = d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
  const rows = Array.from(g.tbody[0].querySelectorAll('tr'));
  const tr = rows.find(r => { const it = g.dataItem(r); return it && it.Name === 'Template: 242 - Van Nuys:Accrued Water'; });
  if(!tr) return 'row not found';
  const it = g.dataItem(tr);
  const keys = {};
  for (const k in it) { if (typeof it[k] !== 'object' && typeof it[k] !== 'function') keys[k] = it[k]; }
  return JSON.stringify({fields: keys, rowHtml: tr.outerHTML.slice(0,400)});
}
