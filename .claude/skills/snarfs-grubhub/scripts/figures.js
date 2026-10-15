// Grubhub transactions -> each store's figures for one sales window, in the entry's line categories, amounts in dollars.
// usage: node figures.js <raw.json from transactions.js> <start YYYY-MM-DD> <end YYYY-MM-DD>
const fs = require('fs');
const STORES = require('./stores.json');
let raw = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); if (typeof raw === 'string') raw = JSON.parse(raw);
const [START, END] = process.argv.slice(3);
const day = t => new Date(t).toLocaleDateString('en-CA', {timeZone: 'America/Chicago'});
const when = t => new Date(t).toLocaleString('en-US', {timeZone: 'America/Chicago', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit'});
// fee fields Grubhub signs negative; each feeds one template line
const FEES = {commissions: 'advertising_fee', 'delivery commissions': 'grubhub_delivery_fee', 'order processing fees': 'processing_fee', rewards: 'restaurant_funded_reward', 'targeted promotions': 'restaurant_funded_promo'};
const c = x => Math.round(x || 0);
const out = {};
for (const t of raw.sort((a, b) => a.transaction_time.localeCompare(b.transaction_time))) {
  // payout rows settle earlier periods
  if (t.transaction_type === 'DISTRIBUTION') continue;
  const d = day(t.transaction_time); if (d < START || d > END) continue;
  const st = STORES.find(s => s.grubhubId === String(t.restaurant_id)); if (!st) throw new Error('unmapped Grubhub restaurant ' + t.restaurant_id);
  const s = out[st.store] = out[st.store] || {store: st.store, location: st.location, window: [START, END], gross: 0, net: 0, cat: {...Object.fromEntries(Object.keys(FEES).map(k => [k, 0])), refunds: 0, 'account adjustments': 0}, days: {}, odd: [], orders: []};
  const ty = t.transaction_type;
  // a refund books at the order's gross; the fees Grubhub hands back come off the fee lines
  if (ty === 'PCI_SINGLE_ONLINE' || ty === 'PCI_SINGLE_REFUND') {
    let known = c(t.prepaid_amount);
    for (const [k, f] of Object.entries(FEES)) { s.cat[k] -= c(t[f]); known += c(t[f]); }
    // anything else Grubhub withholds on an order (plus fee, withheld tax)
    s.cat['account adjustments'] += known - c(t.net_amount);
    if (ty === 'PCI_SINGLE_REFUND') s.cat.refunds -= c(t.prepaid_amount);
    else { s.gross += c(t.prepaid_amount); s.days[d] = (s.days[d] || 0) + c(t.prepaid_amount); }
  } else s.cat['account adjustments'] -= c(t.net_amount);
  s.net += c(t.net_amount);
  if (ty !== 'PCI_SINGLE_ONLINE') s.odd.push([ty, d, (c(t.net_amount) / 100).toFixed(2), t.order_number || '', t.transaction_type_description || ''].join(' '));
  s.orders.push([t.order_number || '', when(t.transaction_time), t.transaction_type_description || ty, ...['prepaid_amount', 'advertising_fee', 'grubhub_delivery_fee', 'processing_fee', 'restaurant_funded_reward', 'restaurant_funded_promo', 'net_amount'].map(f => c(t[f]) / 100)]);
}
for (const s of Object.values(out)) {
  // gross less every category is the net, to the cent
  s.check = s.gross - Object.values(s.cat).reduce((a, b) => a + b, 0) - s.net;
  s.gross /= 100; s.net /= 100;
  for (const k in s.cat) s.cat[k] /= 100;
  for (const k in s.days) s.days[k] /= 100;
}
console.log(JSON.stringify(Object.values(out), null, 1));
