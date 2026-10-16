// One entry's backup page: the entry as posted, the week's payouts closing to their nets, the 10130 tie-out, R365 DoorDash sales by day.
// usage: node build-backup.js <plan.json> <store> <pay.json> <gl.json> <readback.json> <out.html>
// plan from plan.js, pay from dd-payouts.sh, gl from gl-parse.js, readback from read-entry.sh. Prints "ties" or "DOES NOT TIE".
const fs = require('fs');
const [pf, store, payf, glf, rbf, out] = process.argv.slice(2);
const J = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const p = J(pf).find(x => x.store === store); if (!p) { console.log('DOES NOT TIE: no plan for ' + store); process.exit(1); }
const pays = J(payf).filter(x => p.payouts.includes(x.id)).sort((a, b) => a.start < b.start ? -1 : 1);
const rb = J(rbf), lines = rb.rows;
const f2 = x => (+x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ct = t => new Date(t).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const gd = s => { const [M, D, Y] = s.split('/'); return Y + '-' + M.padStart(2, '0') + '-' + D.padStart(2, '0'); };
const [m, d, y] = p.entryDate.split('/').map(Number), sun = new Date(y, m - 1, d), mon = new Date(y, m - 1, d - 6);
const ymd = x => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
const A = ymd(mon), B = ymd(sun);
const days = {}; for (const x of J(glf)) if (x.loc.endsWith(' - ' + store) && x.type === 'Journal Entry' && x.cm === 'Third Party Delivery' && gd(x.d) >= A && gd(x.d) <= B) days[x.d] = (days[x.d] || 0) + x.dr;
const D = +Object.values(days).reduce((a, b) => a + b, 0).toFixed(2);
const sum = k => +pays.reduce((a, x) => a + x[k], 0).toFixed(2);
const S = sum('sales'), F = sum('fees'), M = sum('mkt'), AM = sum('amd'), N = sum('net');
const idOk = pays.every(x => Math.abs(x.sales + x.fees + x.mkt + x.amd - x.net) < 0.005);
const acct = a => lines.find(l => (l[3] || '').startsWith(a)) || ['', 0, 0, ''];
const ar = acct('10130'), arExp = +(D - N).toFixed(2), arPosted = +(ar[2] - ar[1]).toFixed(2);
const two = lines.length === 2;
const di = two ? null : acct('42060'), diExp = +(D - S).toFixed(2), diPosted = two ? 0 : +(di[1] - di[2]).toFixed(2);
const dr = lines.reduce((a, l) => a + l[1], 0), cr = lines.reduce((a, l) => a + l[2], 0);
const arOk = Math.abs(arPosted - arExp) < 0.005, diOk = two || Math.abs(diPosted - diExp) < 0.005;
const ok = idOk && arOk && diOk && Math.abs(dr - cr) < 0.005 && Math.abs(D - p.D) < 0.005;
const tick = b => `<span class="${b ? 'ok' : 'bad'}">${b ? 'ties' : 'DOES NOT TIE'}</span>`;
const dc = v => v > 0.004 ? 'debit' : v < -0.004 ? 'credit' : '';
const title = `DoorDash ${store} ${p.entryDate}`;
fs.mkdirSync(require('path').dirname(out), { recursive: true });
fs.writeFileSync(out, `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
body{font-family:Arial,sans-serif;font-size:11px;color:#111;margin:24px}h1{font-size:16px;margin:0 0 4px}h2{font-size:13px;margin:16px 0 6px}
table{border-collapse:collapse;margin-bottom:6px}td,th{border:1px solid #bbb;padding:3px 8px;text-align:right}th{background:#eee}td.l,th.l{text-align:left}
.ok{color:#060;font-weight:bold}.bad{color:#b00;font-weight:bold}p{margin:4px 0}</style></head><body>
<h1>${title}: DoorDash payout backup</h1>
<p>R365 journal entry ${rb.num} dated ${rb.date}, Snarf's ${store}, ${rb.approved ? 'Approved' : 'Unapproved'}. Week ${mon.toLocaleDateString('en-US')} to ${p.entryDate}: the ${pays.length} DoorDash payouts whose covered window starts in the week.</p>
<h2>Entry as posted</h2><table><tr><th class="l">Account</th><th>Debit</th><th>Credit</th><th class="l">Comment</th></tr>${lines.map(l => `<tr><td class="l">${l[3]}</td><td>${f2(l[1])}</td><td>${f2(l[2])}</td><td class="l">${l[0]}</td></tr>`).join('')}
<tr><th class="l">Total</th><th>${f2(dr)}</th><th>${f2(cr)}</th><th></th></tr></table>
<h2>DoorDash payouts</h2><table><tr><th class="l">Payout</th><th class="l">Paid</th><th class="l">Covers (Central time)</th><th>Sales</th><th>Commission &amp; fees</th><th>Marketing spend</th><th>Amendments</th><th>Net payout</th></tr>
${pays.map(x => `<tr><td class="l">${x.id}</td><td class="l">${x.date}</td><td class="l">${ct(x.start)} to ${ct(x.end)}</td><td>${f2(x.sales)}</td><td>${f2(x.fees)}</td><td>${f2(x.mkt)}</td><td>${f2(x.amd)}</td><td>${f2(x.net)}</td></tr>`).join('')}
<tr><th class="l">Total</th><th></th><th class="l">${tick(idOk)}</th><th>${f2(S)}</th><th>${f2(F)}</th><th>${f2(M)}</th><th>${f2(AM)}</th><th>${f2(N)}</th></tr></table>
<h2>Tie-out</h2><table>
<tr><td class="l">R365 DoorDash sales debited to 10130 in the week (D)</td><td>${f2(D)}</td></tr>
<tr><td class="l">Less DoorDash net payouts</td><td>${f2(N)}</td></tr>
<tr><td class="l">10130 ${arExp < 0 ? 'debit' : 'credit'} expected (D less net)</td><td>${f2(Math.abs(arExp))}</td></tr>
<tr><td class="l">10130 posted</td><td>${f2(Math.abs(arPosted))} ${dc(-arPosted)} ${tick(arOk)}</td></tr>
${two ? `<tr><td class="l">70400 DoorDash Fees, the same amount: fees, marketing, amendments and D less DoorDash sales (${f2(diExp)})</td><td>${f2(Math.abs(arExp))}</td></tr>` :
`<tr><td class="l">Discrepancy expected (D less DoorDash sales)</td><td>${f2(Math.abs(diExp))} ${dc(diExp)}</td></tr>
<tr><td class="l">Discrepancy posted, ${di[3]}</td><td>${f2(Math.abs(diPosted))} ${dc(diPosted)} ${tick(diOk)}</td></tr>`}</table>
<h2>R365 DoorDash sales by day</h2><table><tr><th class="l">Day</th><th>Third Party Delivery</th></tr>
${Object.keys(days).sort((a, b) => gd(a) < gd(b) ? -1 : 1).map(k => `<tr><td class="l">${k}</td><td>${f2(days[k])}</td></tr>`).join('')}<tr><th class="l">Total (D)</th><th>${f2(D)}</th></tr></table>
</body></html>`);
console.log([store, p.entryDate, f2(dr), ok ? 'ties' : 'DOES NOT TIE'].join(' | '));
