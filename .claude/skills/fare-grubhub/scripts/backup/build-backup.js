#!/usr/bin/env node
// One entry's backup page: the entry as posted, each deposit's fields mapped to the entry's GLs, then the deposit captures.
// usage: node build-backup.js <plan.json> <out.html>
// plan: {entryDate, store, location, status, start, end, lines:[[account,debit,credit,comment]],
//        deposits:[full deposit records from read-week.js], pngs:[one capture per deposit, same order], noDepositPngs:[list, picker] for a zero store}
// prints "ties" or "DOES NOT TIE"
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const f2 = x => x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const n = s => parseFloat(String(s).replace(/,/g, '')) || 0;
const img = f => `<img class="pg" src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}">`;

// same mapping as build-lines.js, in cents, debit positive
const ROWS = [
  ['7350', 'Delivery Commissions + Order Processing Fees', T => -(T.grubhub_delivery_fee_total + T.processing_fee)],
  ['7570', 'Commissions + account adjustments (Ad Spend, credits)', T => -(T.commission_total + T.gh_plus_commission_total + T.account_adj)],
  ['4905', 'Restaurant funded promotions + rewards', T => -(T.restaurant_funded_promo_total + T.restaurant_funded_reward_total)],
  ['7535', 'Refunds', (T, ref) => -ref],
  ['2270', 'Withheld Sales Tax', T => -T.withheld_sales_tax],
];
const cols = p.deposits.map(d => {
  const tx = d.associated_transactions || [];
  const sum = t => tx.filter(x => x.transaction_type === t).reduce((a, x) => a + x.prepaid_amount, 0);
  const ref = sum('PCI_SINGLE_REFUND');
  return { sid: d.short_distribution_id, paid: d.created_date.slice(0, 10), orders: sum('PCI_SINGLE_ONLINE'), ref, net: d.total, rows: ROWS.map(r => r[2](d.totals, ref)) };
});
const tot = k => cols.reduce((a, c) => a + c[k], 0);
const rowTot = i => cols.reduce((a, c) => a + c.rows[i], 0);
const posted = gl => p.lines.filter(l => l[0].startsWith(gl)).reduce((a, l) => a + Math.round((n(l[1]) - n(l[2])) * 100), 0);

const checks = ROWS.map((r, i) => posted(r[0]) === rowTot(i));
const kept = tot('orders') - tot('net'), dr = ROWS.reduce((a, r, i) => a + rowTot(i), 0);
checks.push(kept === dr, posted('1103') === -dr);
const ok = checks.every(Boolean);
const mark = b => `<span class="${b ? 'ok' : 'bad'}">${b ? 'ties' : 'DOES NOT TIE'}</span>`;
const c2 = v => f2(v / 100 + 0);

const md = v => +v.slice(5, 7) + '/' + +v.slice(8, 10);
const title = `GrubHub ${p.store} ${p.entryDate}`;
const head = `<th>Grubhub</th>${cols.map(c => `<th>${c.sid}<br>paid ${c.paid}</th>`).join('')}<th>Total</th><th>GL</th><th>Entry</th><th></th>`;
const body = ROWS.map((r, i) => `<tr><td>${r[1]}</td>${cols.map(c => `<td>${c2(c.rows[i])}</td>`).join('')}<td>${c2(rowTot(i))}</td><td>${r[0]}</td><td>${c2(posted(r[0]))}</td><td>${mark(checks[i])}</td></tr>`).join('');

fs.writeFileSync(process.argv[3], `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
body{font-family:Arial,sans-serif;font-size:11px;color:#111;margin:24px}h1{font-size:16px;margin:0 0 4px}h2{font-size:13px;margin:18px 0 6px}
table{border-collapse:collapse;margin-bottom:6px}td,th{border:1px solid #bbb;padding:3px 8px;text-align:right}th{background:#eee}td:first-child,th:first-child{text-align:left}
.ok{color:#060;font-weight:bold}.bad{color:#b00;font-weight:bold}.pg{page-break-before:always;width:100%;display:block}p{margin:4px 0}</style></head><body>
<h1>${title}: Grubhub deposit backup</h1>
<p>R365 journal entry GrubHub dated ${p.entryDate}, location ${p.location}, ${p.status}. Grubhub orders ${md(p.start)} to ${md(p.end)} (New York order date).</p>
<h2>Entry as posted</h2><table><tr><th>Account</th><th>Debit</th><th>Credit</th><th>Comment</th></tr>${p.lines.map(l => `<tr><td>${l[0]}</td><td>${l[1]}</td><td>${l[2]}</td><td style="text-align:left">${l[3] || ''}</td></tr>`).join('')}</table>
${cols.length ? `<h2>Grubhub deposits to the entry</h2><table><tr>${head}</tr>${body}
<tr><td><b>Total kept by Grubhub</b></td>${cols.map(c => `<td>${c2(ROWS.reduce((a, r, i) => a + c.rows[i], 0))}</td>`).join('')}<td><b>${c2(dr)}</b></td><td>1103</td><td>${c2(-posted('1103'))}</td><td>${mark(checks[6])}</td></tr></table>
<h2>Check</h2><table>
<tr><td>Prepaid orders (DSS booked to 1103)</td>${cols.map(c => `<td>${c2(c.orders)}</td>`).join('')}<td>${c2(tot('orders'))}</td></tr>
<tr><td>Less Deposit Total</td>${cols.map(c => `<td>${c2(c.net)}</td>`).join('')}<td>${c2(tot('net'))}</td></tr>
<tr><td>Kept by Grubhub</td>${cols.map(c => `<td>${c2(c.orders - c.net)}</td>`).join('')}<td>${c2(kept)} ${mark(checks[5])}</td></tr></table>
<p>Refunds are the prepaid amount of each refund row, which Grubhub nets inside Prepaid Orders on its page. Pages after this one are Grubhub's own deposit pages from Financials &gt; Deposit history, in the order of the columns above; their order times show in the capture browser's time zone.</p>`
  : `<p><b>No sales this week.</b> Grubhub paid no deposit holding orders from ${md(p.start)} to ${md(p.end)} for this store. ${p.noDepositPngs.length ? 'Next pages: the store\'s Grubhub deposit history over the week such a deposit would be paid, then the location picker showing the store selected.' : ''}</p>`}
${cols.length ? p.pngs.map(img).join('') : p.noDepositPngs.map(img).join('')}</body></html>`);
console.log([p.store, p.entryDate, cols.map(c => c.sid).join('+') || 'no deposit', c2(dr), ok ? 'ties' : 'DOES NOT TIE'].join(' | '));
