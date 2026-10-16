async () => { const q = `query($s: DateTime, $e: DateTime, $o: Int) { me { catererAccount { orders(sourceTypes:[MARKETPLACE,EZ_ORDERING,DIRECT_ENTRY,CLUB_SODA], startDate:$s, endDate:$e, offset:$o, limit:50, orderBy:{field:EVENT_AT,direction:ASC}, filter:PAST) { totalCount edges { catererWorkflowState { status } node { orderNumber submittedAt orderSource caterer { nickname } event { timestamp } catererCart { totals { catererTotalDue subTotal posTotal total } } } } } } } }`;
const out = []; let o = 0, n = 1;
while (o < n) { const r = await fetch('https://ezmanage-api.ezcater.com/graphql', { method:'POST', credentials:'include', headers:{'content-type':'application/json'}, body: JSON.stringify({ query:q, variables:{ s:'__S__', e:'__E__', o } }) });
  const j = await r.json(); if (j.errors) return JSON.stringify(j.errors); const x = j.data.me.catererAccount.orders; n = x.totalCount;
  for (const e of x.edges) { const d = e.node, t = d.catererCart.totals; out.push({ order: d.orderNumber, store: d.caterer.nickname, at: d.event.timestamp, status: e.catererWorkflowState.status, source: d.orderSource, sub_at: d.submittedAt, due: t.catererTotalDue, sub: t.subTotal, pos: t.posTotal, total: t.total }); }
  o += 50; if (!x.edges.length) break; }
return JSON.stringify(out); }
