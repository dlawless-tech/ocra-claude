async () => { const want=[{"side":"credit","gl":"1102 - DoorDash Deposit Clearing","amount":396.67,"comment":"total withheld from payouts"},{"side":"debit","gl":"7310 - DoorDash Third Party Fees","amount":331.09,"comment":"commission"},{"side":"debit","gl":"7535 - Third Party Refunds","amount":65.58,"comment":"error charges"}];
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
