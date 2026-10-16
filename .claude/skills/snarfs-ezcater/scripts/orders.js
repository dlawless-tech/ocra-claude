// Every EZ Cater order submitted or delivered between __S__ and __E__ (ISO), all stores, from the
// GraphQL API behind the Partner Portal order lists. ALL holds past and upcoming orders; CANCELLED
// holds cancelled ones, kept with due 0: EZ pays nothing on them, whatever dueWhenCancelled says. Run with playwright-cli eval.
async () => {
  const q = `query($s: DateTime, $e: DateTime, $o: Int, $f: OrderStateFilterEnum) { me { catererAccount { orders(sourceTypes:[MARKETPLACE,EZ_ORDERING,DIRECT_ENTRY,CLUB_SODA], startDate:$s, endDate:$e, offset:$o, limit:50, orderBy:{field:EVENT_AT,direction:ASC}, filter:$f) {
    totalCount edges { catererWorkflowState { status }
    node { orderNumber submittedAt orderSource caterer { nickname } event { timestamp } catererCart { totals { catererTotalDue total } } } } } } } }`;
  const out = [];
  for (const f of ['ALL', 'CANCELLED']) {
    let o = 0, n = 1;
    while (o < n) {
      const r = await fetch('https://ezmanage-api.ezcater.com/graphql', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: q, variables: { s: '__S__', e: '__E__', o, f } }) });
      const j = await r.json(); if (j.errors) return 'FAIL: ' + JSON.stringify(j.errors);
      const x = j.data.me.catererAccount.orders; n = x.totalCount;
      for (const e of x.edges) {
        const d = e.node, t = d.catererCart.totals, w = e.catererWorkflowState, cx = f === 'CANCELLED';
        out.push({ order: d.orderNumber, store: d.caterer.nickname, sub_at: d.submittedAt, at: d.event.timestamp, status: w.status, source: d.orderSource,
          total: cx ? 0 : t.total, due: cx ? 0 : t.catererTotalDue });
      }
      if (!x.edges.length) break; o += 50;
    }
  }
  return JSON.stringify(out);
}
