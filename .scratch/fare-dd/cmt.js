() => { const C={'1102':'total withheld from payouts','7310':'commission','7540':'marketing fees','4905':'customer discounts funded by store','7535':'error charges'};
const g=jQuery('[data-role=grid]').data('kendoGrid'); const out=[];
for (const m of Array.prototype.slice.call(g.dataSource.data())) { const k=String(m.glAccount||'').slice(0,4); const amt=(+m.debit||0)+(+m.credit||0);
  if (!C[k]) return 'STOP: unmapped '+m.glAccount; if (!amt || m.comment) continue; m.set('comment',C[k]); out.push(k+' '+amt); }
return out.length ? 'commented '+out.join(', ') : 'nothing to comment'; }
