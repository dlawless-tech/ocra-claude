async () => { const want=[{"side":"debit","gl":"7350 - Grubhub Third Party Fees","amount":8.93,"comment":"delivery + order processing"},{"side":"debit","gl":"7570 - Grubhub Marketing","amount":15.18,"comment":"marketing + ad spend"},{"side":"debit","gl":"2270 - Sales Tax Payable","amount":18.18,"comment":"sales tax withheld"},{"side":"credit","gl":"1103 - Grubhub Deposit Clearing","amount":42.29,"comment":"orders 10/1 - 10/5, Grubhub net 127.60"}];
const g=jQuery('[data-role=grid]').data('kendoGrid'); const out=[];
const rows=Array.prototype.slice.call(g.dataSource.data()); const free=want.slice(); const keep=new Map();
// claim by GL and comment first, then by GL alone
for (const pass of [1,2]) for (const m of rows) { if (keep.has(m)) continue;
  const i=free.findIndex(w=>w.gl===m.glAccount && (pass===2 || (w.comment||'')===(m.comment||''))); if (i<0) continue;
  keep.set(m, free[i]); free.splice(i,1); }
for (const m of rows) { const w=keep.get(m);
  if (w) { m.set(w.side, w.amount); m.set(w.side==='credit'?'debit':'credit', 0); m.set('comment', w.comment); continue; }
  document.querySelector('tr[data-uid="'+m.uid+'"] .k-grid-delete').click(); out.push('removed '+m.glAccount); await new Promise(r=>setTimeout(r,300)); }
return out.join(' ; ') || 'nothing to trim'; }
