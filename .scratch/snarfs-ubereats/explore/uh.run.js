async () => {
  const stores = {MX:['a25fe789-5cdb-585c-81e3-30ce363d9691','d1ca1ae4-e901-4525-8760-298e82e28bde'], SLU:['91590c8f-effc-5d06-ad19-7415e5d2cf59','8987d4d3-c39e-45bb-b9b0-b2501c2bf19c'], Skinker:['da7678cd-24e9-5c30-8bc0-625df9b33cc3','4b89be5b-735c-4cf3-a262-b3e4419c1e4d'], Page:['b482afd0-491f-5225-aa63-18c8e9d9e31c','cf296234-d690-49e3-86fd-ae7a3474177e'], Fenton:['eb3111bc-364a-56c1-b255-f7860113254d','cb14815f-4da0-4b78-8f41-8e7fb5f701ea'], Kirkwood:['04ab58ae-6827-5c7b-98a2-ad550913d0b1','c6b0b896-2cac-42bf-9664-1ea05d548355'], Spirit:['b23f3690-feda-5e61-a752-eed6e8c81d8e','f2f5957b-2b4e-472a-95c5-f00782528e2d']};
  const n = s => s == null ? 0 : (/^-/.test(s) ? -1 : 1) * +s.replace(/[^\d.]/g, '');
  const out = [];
  for (const [store, [ru, org]] of Object.entries(stores)) {
    history.replaceState(null, '', '/manager/payments?restaurantUUID=' + ru);
    let offset = 0;
    for (;;) {
      const r = await fetch('/manager/api/listPayoutsHistory?localeCode=en', {method:'POST', headers:{'content-type':'application/json','x-csrf-token':'x'}, body: JSON.stringify({orgUUIDs:[org], isOngoingSettlementRequired:false, startDate:'2025-12-29', endDate:'2026-10-15', pagination:{pageSize:50, offset}})}).then(r => r.json());
      const p = r.data.payPeriods;
      for (const x of p) out.push({store, start:x.periodStartDate, end:x.periodEndDate, status:x.status, deposit:x.depositDate, earnings:n(x.earnings), marketing:n(x.marketing), fees:n(x.uberFees), amendments:n(x.amendments), net:n(x.netPayout), id:x.settlementUUID});
      if (r.data.nextOffset == null || !p.length) break; offset = r.data.nextOffset;
    }
  }
  return JSON.stringify(out);
}
