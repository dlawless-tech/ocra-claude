() => {
  const seen=[];
  const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } };
  walk(document);
  const d = seen.find(x=>{ try { return x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'); } catch(e){ return false; } });
  const g = d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
  const v = g.dataSource.view();
  return JSON.stringify({n:v.length, rows: v.filter(x=>/water/i.test(x.Number+' '+x.Name)).map(x=>({n:x.Number,nm:x.Name,d:new Date(x.Date).toDateString(),l:x.Location,id:x.TransactionId,s:x.ApprovalStatus,a:x.Amount,t:x.TransactionType}))});
}
