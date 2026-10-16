async () => {
  const n = s => s == null ? 0 : (/^-/.test(s) ? -1 : 1) * +String(s).replace(/[^\d.]/g, '');
  const post = (api, body) => fetch('/manager/api/' + api + '?localeCode=en', {method:'POST', headers:{'content-type':'application/json','x-csrf-token':'x'}, body: JSON.stringify(body)}).then(r => r.json());
  const iso = s => { const d = new Date(s); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); };
  const out = []; let offset = 0;
  for (;;) {
    const r = await post('listPayoutsHistory', {orgUUIDs:['f2f5957b-2b4e-472a-95c5-f00782528e2d'], isOngoingSettlementRequired:false, startDate:'2026-09-28', endDate:'2026-10-15', pagination:{pageSize:50, offset}});
    for (const x of r.data.payPeriods) out.push({store:'Spirit', org:'f2f5957b-2b4e-472a-95c5-f00782528e2d', restaurant:'b23f3690-feda-5e61-a752-eed6e8c81d8e', start:iso(x.periodStartDate), end:iso(x.periodEndDate), status:x.status, deposit:x.depositDate, net:n(x.netPayout), settlement:x.settlementUUID});
    if (r.data.nextOffset == null || !r.data.payPeriods.length) break; offset = r.data.nextOffset;
  }
  for (const p of out) {
    const b = await post('getEarningsBreakdown', {orgUUIDs:['f2f5957b-2b4e-472a-95c5-f00782528e2d'], startDate:p.start, endDate:p.end, locale:'en', settlementUUID:p.settlement});
    if (b.status !== 'success') { p.error = 'breakdown ' + JSON.stringify(b.data); continue; }
    const top = {}, leaf = {};
    const walk = (nodes, path) => { for (const x of nodes || []) { const k = x.categoryName.text; leaf[path ? path + '/' + k : k] = n(x.categoryTotal.text); walk(x.childSummaryNodes, path ? path + '/' + k : k); } };
    for (const x of b.data.taxonomyNodes) top[x.categoryName.text] = n(x.categoryTotal.text);
    walk(b.data.taxonomyNodes, '');
    p.top = top; p.salesIncl = leaf['Earnings/SubtotalInclTax'] ?? top.Earnings; p.salesExcl = leaf['Earnings/SubtotalInclTax/SubtotalExclTax'] ?? null;
    p.detail = Object.fromEntries(Object.entries(leaf).filter(([k]) => !k.startsWith('Earnings') && !k.startsWith('UberFees/')));
  }
  return JSON.stringify(out);
}
