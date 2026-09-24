() => {
  const seen=[];
  const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } };
  walk(document);
  const d = seen.find(x=>{ try { return x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'); } catch(e){ return false; } });
  const g = d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
  const ds = g.dataSource;
  return JSON.stringify({
    total: ds.total(), pageSize: ds.pageSize(), page: ds.page(),
    serverFiltering: ds.options.serverFiltering, serverPaging: ds.options.serverPaging,
    filter: ds.filter(),
    transport: ds.options.transport && ds.options.transport.read && (ds.options.transport.read.url||ds.options.transport.read).toString().slice(0,300),
    cols: g.columns.map(c=>c.field)
  });
}
