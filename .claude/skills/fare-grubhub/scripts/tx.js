// Shared by build-lines.js and the backup: read week.raw and total each store's transactions by GL, in cents, debit positive.
const fs = require('fs');
const STORES = require('./stores.json');
const GL = {
  clear: '1103 - Grubhub Deposit Clearing',
  rows: [
    { key: 'fees', gl: '7350 - Grubhub Third Party Fees', comment: 'delivery + order processing', label: 'Delivery Commissions + Order Processing Fees' },
    { key: 'mkt', gl: '7570 - Grubhub Marketing', comment: 'marketing + ad spend', label: 'Commissions + account adjustments (Ad Spend, credits)' },
    { key: 'promo', gl: '4905 - Third Party App Marketing Comps', comment: 'restaurant promotions', label: 'Restaurant funded promotions + rewards' },
    { key: 'ref', gl: '7535 - Third Party Refunds', comment: 'cancellations + order adjustments', label: 'Refunds' },
    { key: 'tax', gl: '2270 - Sales Tax Payable', comment: 'sales tax withheld', label: 'Withheld Sales Tax' },
  ],
};
const FIELDS = ['prepaid_amount', 'advertising_fee', 'gh_plus_fee', 'grubhub_delivery_fee', 'processing_fee', 'withheld_sales_tax', 'restaurant_funded_promo', 'restaurant_funded_reward', 'commission_fee_tax'];
const ny = t => new Date(t).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

function readWeek(file) {
  let s = fs.readFileSync(file, 'utf8');
  if (s.includes('"STOP')) throw new Error(s);
  s = s.slice(s.indexOf('"{'), s.lastIndexOf('}"') + 2);
  return JSON.parse(JSON.parse(s));
}

// one record per R365 store, GO stores rolled into their parent; zero stores included
function perStore(w, stop) {
  const acc = {};
  for (const [, [name, loc]] of Object.entries(STORES)) acc[name] = acc[name] || { store: name, loc, tx: [], gross: 0, net: 0, fees: 0, mkt: 0, promo: 0, ref: 0, tax: 0 };
  for (const t of w.transactions) {
    const day = ny(t.transaction_time);
    if (day < w.start || day > w.end) continue;
    const st = STORES[t.restaurant_id]; if (!st) stop(`unknown Grubhub restaurant ${t.restaurant_id}`);
    const a = acc[st[0]], v = f => t[f] || 0, id = `${t.transaction_type} ${t.order_number || t.billing_id}`;
    if (v('commission_fee_tax')) stop(`${id}: unmodeled commission_fee_tax ${v('commission_fee_tax')}`);
    if (FIELDS.reduce((x, f) => x + v(f), 0) !== v('net_amount')) stop(`${id}: fields do not add to net ${v('net_amount')}`);
    const type = t.transaction_type;
    if (type === 'PCI_SINGLE_ONLINE') a.gross += v('prepaid_amount');
    else if (type === 'PCI_SINGLE_REFUND') a.ref -= v('prepaid_amount');
    // account adjustments: daily Ad Spend charges and Grubhub credits, no order behind them
    else if (type === 'MISC_CHARGE' || type === 'CS_CREDIT') a.mkt -= v('prepaid_amount');
    else stop(`${id}: unmodeled row "${t.transaction_type_description}"`);
    a.fees -= v('grubhub_delivery_fee') + v('processing_fee');
    a.mkt -= v('advertising_fee') + v('gh_plus_fee');
    a.promo -= v('restaurant_funded_promo') + v('restaurant_funded_reward');
    a.tax -= v('withheld_sales_tax');
    a.net += v('net_amount');
    a.tx.push(t);
  }
  return Object.values(acc);
}
module.exports = { readWeek, perStore, GL, ny };
