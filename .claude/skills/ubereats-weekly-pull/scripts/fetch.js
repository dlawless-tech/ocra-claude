async () => {
  // pay periods deposited __DFROM__..__DTO__ for org __ORG__, kept when the period ends __FIRST__..__LAST__, each with its breakdown tree
  const n = s => s == null ? 0 : (/^-/.test(s) ? -1 : 1) * +String(s).replace(/[^\d.]/g, '');
  const post = (api, body) => fetch('/manager/api/' + api + '?localeCode=en', {method:'POST', headers:{'content-type':'application/json','x-csrf-token':'x'}, body: JSON.stringify(body)}).then(r => r.json());
  const iso = s => { const d = new Date(s); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); };
  const out = []; let offset = 0;
  for (;;) {
    const r = await post('listPayoutsHistory', {orgUUIDs:['__ORG__'], isOngoingSettlementRequired:false, startDate:'__DFROM__', endDate:'__DTO__', pagination:{pageSize:50, offset}});
    if (r.status !== 'success') return JSON.stringify({error: 'listPayoutsHistory ' + JSON.stringify(r.data)});
    for (const x of r.data.payPeriods) {
      const p = {start:iso(x.periodStartDate), end:iso(x.periodEndDate), status:x.status, deposit:x.depositDate ? iso(x.depositDate) : null, transactionId:x.transactionID, settlement:x.settlementUUID,
        earnings:n(x.earnings), marketing:n(x.marketing), uberFees:n(x.uberFees), amendments:n(x.amendments), net:n(x.netPayout)};
      if (p.end >= '__FIRST__' && p.end <= '__LAST__') out.push(p);
    }
    if (r.data.nextOffset == null || !r.data.payPeriods.length) break; offset = r.data.nextOffset;
  }
  for (const p of out) {
    const b = await post('getEarningsBreakdown', {orgUUIDs:['__ORG__'], startDate:p.start, endDate:p.end, locale:'en', settlementUUID:p.settlement});
    if (b.status !== 'success') { p.error = 'breakdown ' + JSON.stringify(b.data); continue; }
    const lines = [];
    const walk = (nodes, path) => { for (const x of nodes || []) { const k = path ? path + '/' + x.categoryName.text : x.categoryName.text; lines.push([k, n(x.categoryTotal.text)]); walk(x.childSummaryNodes, k); } };
    walk(b.data.taxonomyNodes, '');
    p.lines = Object.fromEntries(lines);
  }
  return JSON.stringify(out);
}
