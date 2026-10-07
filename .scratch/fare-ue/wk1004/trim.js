async () => { const want=[{"side":"debit","gl":"7380 - Uber Eats Third Party Fees","amount":1271.66,"comment":"marketplace fees"},{"side":"debit","gl":"7535 - Third Party Refunds","amount":69.24,"comment":"net chargeback"},{"side":"debit","gl":"2270 - Sales Tax Payable","amount":656.84,"comment":""},{"side":"credit","gl":"1111 - Uber Eats Deposit Clearing","amount":1997.74,"comment":""}];
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
