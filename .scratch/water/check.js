async () => {
  const seen=[];
  const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } };
  walk(document);
  const d = seen.find(x=>{ try { return x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'); } catch(e){ return false; } });
  if(!d) return 'no grid doc';
  const g = d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
  await g.dataSource.filter({field:'Number', operator:'eq', value:'Accrued Water'});
  await new Promise(r=>setTimeout(r,3000));
  const v = g.dataSource.view();
  return JSON.stringify(v.map(x=>[x.Location, x.Amount, x.ApprovalStatus, new Date(x.Date).toDateString(), x.TransactionId]));
}
