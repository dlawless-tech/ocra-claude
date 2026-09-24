() => {
  const seen=[];
  const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } };
  walk(document);
  const d = seen.find(x=>{ try { return x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'); } catch(e){ return false; } });
  if(!d) return 'no grid doc; frames='+seen.length;
  const g = d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
  const dt = x => { const D=new Date(x.Date); return D.getFullYear()+'-'+String(D.getMonth()+1).padStart(2,'0')+'-'+String(D.getDate()).padStart(2,'0'); };
  const v = g.dataSource.view();
  return JSON.stringify({count:v.length, sample:v.slice(0,3).map(x=>({n:x.Number,d:dt(x),l:x.Location,id:x.TransactionId,s:x.ApprovalStatus,a:x.Amount}))});
}
