async () => {
const H = {authorization: 'Bearer ' + sessionStorage.getItem('authToken'), accept: 'application/json'};
const rests = JSON.parse(localStorage.getItem('associatedRestaurants'));
const base = 'https://api-order-processing-gtm.grubhub.com/merchant/accounting/customers/';
const s = await (await fetch(base + rests.map(r => r.id).join(',') + '/deposits/summary?startTime=2026-09-08T00:00:00.000Z&endTime=2026-09-25T06:59:59.000Z', {headers: H})).json();
const ny = t => new Date(t).toLocaleDateString('en-CA', {timeZone: 'America/New_York'});
const out = {rests: rests.map(r => ({id: r.id, name: r.name, st: r.streetAddress})), summaryKeys: Object.keys(s), deps: []};
const list = Object.values(s).flat();
for (const d of (Array.isArray(list) ? list : [])) {
  const restId = d.rest_id;
  const f = await (await fetch(base + restId + '/deposits/' + d.restaurant_distribution_id, {headers: H})).json();
  const tx = f.associated_transactions || [];
  const days = {};
  for (const t of tx) { const k = ny(t.transaction_time); days[k] = (days[k]||0) + (t.prepaid_amount||0); }
  out.deps.push({restId, rdid: d.restaurant_distribution_id, sid: f.short_distribution_id || d.short_distribution_id, paid: d.effective_date, first: d.earliest_transaction_time, last: d.latest_transaction_time, total: f.total ?? d.total, totals: f.totals, days,
    types: [...new Set(tx.map(t => t.transaction_type))],
    odd: tx.filter(t => /REFUND|CS_CREDIT|ADJ/i.test(t.transaction_type||'')).map(t => ({type: t.transaction_type, id: t.order_number || t.transaction_id, time: t.transaction_time, amt: t.prepaid_amount, lbl: t.description || t.label}))});
}
if (!out.deps.length) out.raw = JSON.stringify(s).slice(0, 1500);
return out;
}
