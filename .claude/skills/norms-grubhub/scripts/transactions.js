async () => {
// The deposit Grubhub will pay for one period, per store, predicted from its order transactions, in deposits.js's shape.
// Swap __START__/__END__ (YYYY-MM-DD, the period's Tuesday and Monday) with sed first.
// Deposits cut at midnight Chicago, so the window runs in Chicago days; days still buckets prepaid by Los Angeles day.
const H = {authorization: 'Bearer ' + sessionStorage.getItem('authToken'), accept: 'application/json'};
const rests = JSON.parse(localStorage.getItem('associatedRestaurants'));
const end = new Date(Date.parse('__END__T12:00:00Z') + 864e5).toISOString().slice(0, 10);
const day = (t, tz) => new Date(t).toLocaleDateString('en-CA', {timeZone: tz});
const F = {prepaid_total: 'prepaid_amount', commission_total: 'advertising_fee', grubhub_delivery_fee_total: 'grubhub_delivery_fee', processing_fee: 'processing_fee',
  gh_plus_commission_total: 'gh_plus_fee', withheld_sales_tax: 'withheld_sales_tax', restaurant_funded_promo_total: 'restaurant_funded_promo', restaurant_funded_reward_total: 'restaurant_funded_reward', commission_fee_tax: 'commission_fee_tax'};
const out = {};
for (let i = 0; i < rests.length; i += 10) {
  const ids = rests.slice(i, i + 10).map(r => r.id).join(',');
  const tx = await (await fetch('https://api-order-processing-gtm.grubhub.com/merchant/accounting/v1/' + ids + '/transactions?timeZone=America/Chicago&channelGroup=&startDate=__START__&endDate=' + end, {headers: H})).json();
  for (const t of tx) {
    // payout rows settle earlier periods
    if (t.transaction_type === 'DISTRIBUTION') continue;
    const c = day(t.transaction_time, 'America/Chicago');
    if (c < '__START__' || c > '__END__') continue;
    const r = rests.find(x => String(x.id) === String(t.restaurant_id));
    const s = out[r.id] = out[r.id] || {street: r.streetAddress, city: r.city, sid: 'tx' + r.id, created: 'pending', total: 0, T: Object.fromEntries([...Object.keys(F), 'account_adj'].map(k => [k, 0])), days: {}, odd: []};
    // a CS_CREDIT is no sale, so it stays out of gross and the day buckets
    const credit = t.transaction_type === 'CS_CREDIT';
    let known = 0;
    if (!credit) for (const [k, f] of Object.entries(F)) { s.T[k] += t[f] || 0; known += t[f] || 0; }
    s.T.account_adj += (t.net_amount || 0) - known;
    s.total += t.net_amount || 0;
    if (!credit) { const k = day(t.transaction_time, 'America/Los_Angeles'); s.days[k] = (s.days[k] || 0) + (t.prepaid_amount || 0); }
    if (t.transaction_type !== 'PCI_SINGLE_ONLINE') s.odd.push([t.transaction_type, c, t.prepaid_amount, t.order_number].join(' '));
  }
}
for (const s of Object.values(out)) s.check = Object.values(s.T).reduce((a, b) => a + b, 0) - s.total;
return JSON.stringify(Object.values(out));
}
