async () => {
  const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } }; walk(document);
  const d = seen.find(x=>x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'));
  const g = d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
  const info = {total: g.dataSource.total(), pageSize: g.dataSource.pageSize(), serverPaging: g.dataSource.options.serverPaging};
  g.dataSource.filter({logic:'and', filters:[{field:'Location', operator:'contains', value:'Costa Mesa'}]});
  await new Promise(r=>setTimeout(r,8000));
  const dt = x => { const D=new Date(x.Date); return D.getFullYear()+'-'+String(D.getMonth()+1).padStart(2,'0')+'-'+String(D.getDate()).padStart(2,'0'); };
  return JSON.stringify({info, rows: g.dataSource.data().filter(x=>dt(x)>='2026-09-28' && dt(x)<='2026-10-13').map(x=>[dt(x), x.Number, x.Location, x.ApprovalStatus, x.Amount, x.TransactionId, x.Type])});
}
