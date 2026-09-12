async () => {
  const seen=[];
  const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } };
  walk(document);
  const d = seen.find(x=>{ try { return x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'); } catch(e){ return false; } });
  const g = d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
  await g.dataSource.read();
  await new Promise(r=>setTimeout(r,2500));
  const v = g.dataSource.view();
  const arr=[]; for(let i=0;i<v.length;i++) arr.push(v[i]);
  return JSON.stringify({total:arr.length, water: arr.filter(x=>/water/i.test(x.Name||'')).map(x=>({n:x.Name, st:x.ScheduleStatus, amt:x.Amount}))});
}
