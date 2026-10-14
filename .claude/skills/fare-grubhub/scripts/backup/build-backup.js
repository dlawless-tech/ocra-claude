#!/usr/bin/env node
// One entry's backup page: the entry as posted, the period's Grubhub transactions mapped to the entry's GLs, then every transaction.
// usage: node build-backup.js <plan.json> <out.html>
// plan: {entryDate, store, location, status, start, end, lines:[[account,debit,credit,comment]], totals: one perStore record from ../tx.js}
// prints "ties" or "DOES NOT TIE"
const fs = require('fs');
const { GL, ny } = require('../tx.js');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const a = p.totals;
const n = s => parseFloat(String(s).replace(/,/g, '')) || 0;
const c2 = v => (v / 100 + 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const posted = gl => p.lines.filter(l => l[0].startsWith(gl)).reduce((x, l) => x + Math.round((n(l[1]) - n(l[2])) * 100), 0);

const dr = GL.rows.reduce((x, r) => x + a[r.key], 0), kept = a.gross - a.net;
const checks = GL.rows.map(r => posted(r.gl.slice(0, 4)) === a[r.key]);
checks.push(kept === dr, posted('1103') === -dr);
const ok = checks.every(Boolean);
const mark = b => `<span class="${b ? 'ok' : 'bad'}">${b ? 'ties' : 'DOES NOT TIE'}</span>`;
const md = v => +v.slice(5, 7) + '/' + +v.slice(8, 10);
const nyt = t => new Date(t).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const title = `GrubHub ${p.store} ${p.entryDate}`;
const F = ['prepaid_amount', 'advertising_fee', 'grubhub_delivery_fee', 'processing_fee', 'restaurant_funded_promo', 'withheld_sales_tax', 'net_amount'];
const tx = [...a.tx].sort((x, y) => x.transaction_time.localeCompare(y.transaction_time));
const sumF = f => tx.reduce((x, t) => x + (t[f] || 0) + (f === 'restaurant_funded_promo' ? t.restaurant_funded_reward || 0 : 0) + (f === 'advertising_fee' ? t.gh_plus_fee || 0 : 0), 0);
const cell = (t, f) => c2((t[f] || 0) + (f === 'restaurant_funded_promo' ? t.restaurant_funded_reward || 0 : 0) + (f === 'advertising_fee' ? t.gh_plus_fee || 0 : 0));

fs.writeFileSync(process.argv[3], `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
body{font-family:Arial,sans-serif;font-size:11px;color:#111;margin:24px}h1{font-size:16px;margin:0 0 4px}h2{font-size:13px;margin:18px 0 6px}
table{border-collapse:collapse;margin-bottom:6px}td,th{border:1px solid #bbb;padding:3px 8px;text-align:right}th{background:#eee}td:first-child,th:first-child{text-align:left}
.ok{color:#060;font-weight:bold}.bad{color:#b00;font-weight:bold}.brk{page-break-before:always}p{margin:4px 0}td.l{text-align:left}</style></head><body>
<h1>${title}: Grubhub backup</h1>
<p>R365 journal entry GrubHub dated ${p.entryDate}, location ${p.location}, ${p.status}. Grubhub transactions ${md(p.start)} to ${md(p.end)} by New York date, from Financials &gt; Transactions.</p>
<h2>Entry as posted</h2><table><tr><th>Account</th><th>Debit</th><th>Credit</th><th>Comment</th></tr>${p.lines.map(l => `<tr><td>${l[0]}</td><td>${l[1]}</td><td>${l[2]}</td><td class="l">${l[3] || ''}</td></tr>`).join('')}</table>
${tx.length ? `<h2>Grubhub to the entry</h2><table><tr><th>Grubhub</th><th>Amount</th><th>GL</th><th>Entry</th><th></th></tr>
${GL.rows.map((r, i) => `<tr><td>${r.label}</td><td>${c2(a[r.key])}</td><td>${r.gl.slice(0, 4)}</td><td>${c2(posted(r.gl.slice(0, 4)))}</td><td>${mark(checks[i])}</td></tr>`).join('')}
<tr><td><b>Total kept by Grubhub</b></td><td><b>${c2(dr)}</b></td><td>1103</td><td>${c2(-posted('1103'))}</td><td>${mark(checks[6])}</td></tr></table>
<h2>Check</h2><table>
<tr><td>Prepaid orders (DSS booked to 1103)</td><td>${c2(a.gross)}</td></tr>
<tr><td>Less Grubhub net, paid in a later deposit</td><td>${c2(a.net)}</td></tr>
<tr><td>Kept by Grubhub</td><td>${c2(kept)} ${mark(checks[5])}</td></tr></table>
<p>Refunds are the prepaid amount of each refund row. Account adjustments are Grubhub Ad Spend charges and credits with no order behind them. The net matches the deposit Grubhub pays for these days; an order Grubhub adjusts later settles in a later deposit.</p>
<h2 class="brk">Grubhub transactions, ${md(p.start)} to ${md(p.end)}</h2>
<table><tr><th>Order</th><th>New York time</th><th>Type</th><th>Prepaid</th><th>Commission</th><th>Delivery</th><th>Processing</th><th>Promo</th><th>Withheld tax</th><th>Net</th></tr>
${tx.map(t => `<tr><td>${t.order_number || ''}</td><td class="l">${nyt(t.transaction_time)}</td><td class="l">${t.transaction_type_description || t.transaction_type}${t.note ? ': ' + t.note : ''}</td>${F.map(f => `<td>${cell(t, f)}</td>`).join('')}</tr>`).join('')}
<tr><td><b>Total</b></td><td></td><td class="l">${tx.length} rows</td>${F.map(f => `<td><b>${c2(sumF(f))}</b></td>`).join('')}</tr></table>`
  : `<p><b>No sales this week.</b> Grubhub shows no transactions for this store from ${md(p.start)} to ${md(p.end)}.</p>`}
</body></html>`);
console.log([p.store, p.entryDate, `${tx.length} rows`, c2(dr), ok ? 'ties' : 'DOES NOT TIE'].join(' | '));
