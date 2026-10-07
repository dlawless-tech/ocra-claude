async () => { const g=jQuery('[data-role=grid]').data('kendoGrid'); let n=0;
for (let i=0;i<120;i++) { const m=g.dataSource.data().find(m=>m.location!=='11300 - FARE Old Town'); if(!m) break;
  const el=document.querySelector('tr[data-uid="'+m.uid+'"] .k-grid-delete'); if(!el) return 'STOP: no trash for '+m.glAccount+' after '+n;
  el.click(); n++; await new Promise(r=>setTimeout(r,300)); }
return 'removed '+n+', left '+g.dataSource.data().length; }
