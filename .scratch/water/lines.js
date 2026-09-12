() => {
  const g = jQuery('[data-role=grid]').data('kendoGrid');
  if(!g) return 'no grid';
  const rows = g.dataSource.data().toJSON ? g.dataSource.data().toJSON() : g.dataSource.data().slice();
  const hdr = {};
  document.querySelectorAll('input, select, textarea').forEach(e=>{ if(e.name && e.value) hdr[e.name]=e.value; });
  return JSON.stringify({rows: rows, hdrKeys: Object.keys(hdr).slice(0,60)});
}
