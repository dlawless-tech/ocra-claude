async () => {
  const seen=[]; const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } };
  walk(document);
  const d = seen.find(x=>x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'));
  if(!d) return 'nogrid';
  const g = d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
  g.dataSource.filter({logic:'and', filters:[{field:'Number', operator:'contains', value:'Door'}]});
  await new Promise(r=>setTimeout(r,8000));
  const dt = x => { const D=new Date(x.Date); return D.getFullYear()+'-'+String(D.getMonth()+1).padStart(2,'0')+'-'+String(D.getDate()).padStart(2,'0'); };
  return JSON.stringify(g.dataSource.view().map(x => [dt(x), x.Number, x.Location, x.ApprovalStatus, x.Amount, x.TransactionId, x.Type, x.Attachment]));
}
