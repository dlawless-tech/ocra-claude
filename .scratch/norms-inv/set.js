() => { const g=jQuery('[data-role=grid]').data('kendoGrid'); const ds=g.dataSource; const out=[];
for(let i=0;i<ds.data().length;i++){ const m=ds.at(i);
 if(/^1210 /.test(m.glAccount)){ m.set('debit',0); m.set('credit',213691.96); }
 else if(/^5180 /.test(m.glAccount)){ m.set('debit',213691.96); m.set('credit',0); }
 out.push(m.glAccount+' '+m.debit+' '+m.credit); }
return out.join(' | '); }
