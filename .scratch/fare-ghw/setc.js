() => { const C={'1103':'Jun 23 - Aug 31 statements','7350':'delivery + order processing','7340':'catering delivery + order processing','7570':'marketing + ad spend','4905':'restaurant promotions','7535':'cancellations + order adjustments','2270':'sales tax withheld'};
const g=jQuery('[data-role=grid]').data('kendoGrid'); const out=[];
for (const m of Array.prototype.slice.call(g.dataSource.data())) { if (m.comment) { out.push('kept '+m.glAccount); continue; } const c=C[m.glAccount.slice(0,4)]; if(!c) return 'STOP: no comment for '+m.glAccount; m.set('comment',c); m.dirty=true; out.push(m.glAccount.slice(0,4)); }
return out.join(','); }
