async () => {
const H = {authorization: 'Bearer ' + sessionStorage.getItem('authToken'), accept: 'application/json'};
const base = 'https://api-order-processing-gtm.grubhub.com/merchant/accounting/customers/';
const s = await (await fetch(base + '2221704/deposits/summary?startTime=2026-09-08T00:00:00.000Z&endTime=2026-10-04T06:59:59.000Z', {headers: H})).json();
const out = [];
for (const d of s['2221704']) {
  const f = await (await fetch(base + '2221704/deposits/' + d.restaurant_distribution_id, {headers: H})).json();
  out.push({sid: f.short_distribution_id, tx: f.associated_transactions});
}
return JSON.stringify(out);
}
