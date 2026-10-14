async () => {
  const fr=[...document.querySelectorAll('iframe')].map(f=>f.contentDocument).filter(Boolean);
  const docs=[document,...fr];
  const d=docs.find(x=>x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').length);
  if(!d) return 'no grid';
  const g=d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
  g.dataSource.filter({field:'Number',operator:'eq',value:'NJ00014232'});
  await new Promise(r=>setTimeout(r,7000));
  const dt=x=>{const D=new Date(x.Date);return D.getFullYear()+'-'+String(D.getMonth()+1).padStart(2,'0')+'-'+String(D.getDate()).padStart(2,'0');};
  return JSON.stringify(g.dataSource.view().map(x=>({n:x.Number,d:dt(x),type:x.Type||x.TransactionType,loc:x.Location,amt:x.Amount,st:x.ApprovalStatus,id:x.TransactionId})));
}
