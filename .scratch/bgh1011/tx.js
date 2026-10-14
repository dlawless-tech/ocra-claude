async () => {
// Every Grubhub order for all four stores in one sales window, totalled per store, as JSON.
// Swap 2026-10-06/2026-10-12 (YYYY-MM-DD, New York sales days, both inclusive) with sed first.
const H = {authorization: 'Bearer ' + sessionStorage.getItem('authToken'), accept: 'application/json'};
const rests = JSON.parse(localStorage.getItem('associatedRestaurants'));
const end = new Date(Date.parse('2026-10-12T12:00:00Z') + 864e5).toISOString().slice(0, 10);
const tx = await (await fetch('https://api-order-processing-gtm.grubhub.com/merchant/accounting/v1/' + rests.map(r => r.id).join(',') + '/transactions?timeZone=America/New_York&channelGroup=&startDate=2026-10-06&endDate=' + end, {headers: H})).json();
const ny = t => new Date(t).toLocaleDateString('en-CA', {timeZone: 'America/New_York'});
const nyt = t => new Date(t).toLocaleString('en-US', {timeZone: 'America/New_York', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit'});
const F = {prepaid_total: 'prepaid_amount', commission_total: 'advertising_fee', grubhub_delivery_fee_total: 'grubhub_delivery_fee', processing_fee: 'processing_fee',
  gh_plus_commission_total: 'gh_plus_fee', withheld_sales_tax: 'withheld_sales_tax', restaurant_funded_promo_total: 'restaurant_funded_promo', restaurant_funded_reward_total: 'restaurant_funded_reward', commission_fee_tax: 'commission_fee_tax'};
const out = {};
for (const t of tx) {
  // payout rows settle earlier periods
  if (t.transaction_type === 'DISTRIBUTION') continue;
  const day = ny(t.transaction_time);
  if (day < '2026-10-06' || day > '2026-10-12') continue;
  const r = rests.find(x => String(x.id) === String(t.restaurant_id));
  const s = out[r.id] = out[r.id] || {rest: r.displayName, rid: String(r.id), window: ['2026-10-06', '2026-10-12'], total: 0, T: Object.fromEntries([...Object.keys(F), 'account_adj'].map(k => [k, 0])), days: {}, odd: [], orders: []};
  let known = 0;
  for (const [k, f] of Object.entries(F)) { s.T[k] += t[f] || 0; known += t[f] || 0; }
  // anything net carries beyond the named fields, e.g. a CS_CREDIT
  s.T.account_adj += (t.net_amount || 0) - known;
  s.total += t.net_amount || 0;
  s.days[day] = (s.days[day] || 0) + (t.prepaid_amount || 0);
  if (t.transaction_type !== 'PCI_SINGLE_ONLINE') s.odd.push([t.transaction_type, day, t.prepaid_amount, t.order_number, t.transaction_type_description || ''].join(' '));
  s.orders.push([t.order_number, nyt(t.transaction_time), t.transaction_type_description || t.transaction_type, t.prepaid_amount, t.advertising_fee, t.grubhub_delivery_fee, t.processing_fee, t.net_amount]);
}
for (const s of Object.values(out)) s.check = Object.values(s.T).reduce((a, b) => a + b, 0) - s.total;
return JSON.stringify(Object.values(out));
}
