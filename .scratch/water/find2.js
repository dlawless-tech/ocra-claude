() => {
  const seen=[];
  const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } };
  walk(document);
  const d = seen.find(x=>{ try { return x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'); } catch(e){ return false; } });
  const g = d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
  const v = g.dataSource.view();
  const hits = v.filter(x => JSON.stringify(x).toLowerCase().includes('water'));
  return JSON.stringify({fields:Object.keys(v[0]), hits: hits.map(x=>({n:x.Number,c:x.Comment,d:new Date(x.Date).toDateString(),l:x.Location,id:x.TransactionId,s:x.ApprovalStatus,a:x.Amount}))});
}
