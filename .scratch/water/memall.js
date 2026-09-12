() => {
  const seen=[];
  const walk=(d)=>{ seen.push(d); for(const f of d.querySelectorAll('iframe')){ try{ if(f.contentDocument) walk(f.contentDocument); }catch(e){} } };
  walk(document);
  const d = seen.find(x=>{ try { return x.defaultView.jQuery && x.defaultView.jQuery('[data-role=grid]').data('kendoGrid'); } catch(e){ return false; } });
  const g = d.defaultView.jQuery('[data-role=grid]').data('kendoGrid');
  const v = g.dataSource.view();
  const arr=[]; for(let i=0;i<v.length;i++) arr.push(v[i]);
  const water = arr.filter(x=>/water/i.test(x.Name||'')).map(x=>x.Name);
  const sample = arr.filter(x=>/Accrued Electricity/.test(x.Name||'')).slice(0,2).map(x=>({n:x.Name, rep:x.TimesToRepeat, done:x.TimesRepeated, st:x.ScheduleStatus, id:x.TransactionId||x.Id}));
  return JSON.stringify({count:arr.length, water, sample});
}
