// One entry's backup page: the entry as posted, the A/R tie-out, R365 vs Grubhub by day, then Grubhub's orders.
// usage: node build-backup.js <plan.json> <out.html>
// plan: {entryDate, store, location, status, window:[from,to], lines:[[account,debit,credit,comment]],
//        glDays:{day:debit}, orders:<one store's record from transactions.js>, note?}
const fs=require("fs");
const p=JSON.parse(fs.readFileSync(process.argv[2],"utf8")), dep=p.orders;
const f2=x=>x.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}), n=s=>parseFloat(String(s).replace(/,/g,""))||0;
const [from,to]=p.window;
const gl={}; for(const[k,v]of Object.entries(p.glDays))if(k>=from&&k<=to)gl[k]=v;
const gh={}; for(const[k,v]of Object.entries(dep.days))if(k>=from&&k<=to)gh[k]=v/100;
const days=[...new Set([...Object.keys(gl),...Object.keys(gh)])].sort();
const D=Object.values(gl).reduce((a,b)=>a+b,0), net=dep.total/100, gross=dep.T.prepaid_total/100;
const fees=[-dep.T.commission_total,-dep.T.grubhub_delivery_fee_total,-dep.T.processing_fee].map(x=>x/100);
const cr=D-net, diff=cr-fees.reduce((a,b)=>a+b,0);
const ar=p.lines.find(l=>/^104-06/.test(l[0])), posted=ar?n(ar[2]):NaN, ok=Math.abs(posted-cr)<0.005;
const title=`GrubHub ${p.store} ${p.entryDate.slice(5).replace("-","/")}`;
fs.writeFileSync(process.argv[3],`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
body{font-family:Arial,sans-serif;font-size:11px;color:#111;margin:24px}h1{font-size:16px;margin:0 0 4px}h2{font-size:13px;margin:18px 0 6px}
table{border-collapse:collapse;margin-bottom:6px}td,th{border:1px solid #bbb;padding:3px 8px;text-align:right}th{background:#eee}td:first-child,th:first-child,th:last-child{text-align:left}
.ok{color:#060;font-weight:bold}.bad{color:#b00;font-weight:bold}.pg{page-break-before:always}p{margin:4px 0}</style></head><body>
<h1>${title}: Grubhub fees backup</h1>
<p>R365 journal entry GrubHub dated ${p.entryDate}, location ${p.location}, ${p.status}. Grubhub orders for the sales window ${from} to ${to}, from Financials &gt; Transactions; Grubhub deposits this net the Wednesday after the period.</p>
<h2>Entry as posted</h2><table><tr><th>Account</th><th>Debit</th><th>Credit</th><th>Comment</th></tr>${p.lines.map(l=>`<tr><td>${l[0]}</td><td>${l[1]}</td><td>${l[2]}</td><td style="text-align:left">${l[3]||""}</td></tr>`).join("")}</table>
<h2>Tie-out</h2><table>
<tr><td>R365 Grubhub sales booked to 104-06 in the window (D)</td><td>${f2(D)}</td></tr>
<tr><td>Less Grubhub net (the coming deposit)</td><td>${f2(net)}</td></tr>
<tr><td>A/R credit expected (D less net)</td><td>${f2(cr)}</td></tr>
<tr><td>A/R credit posted</td><td>${f2(posted)} <span class="${ok?"ok":"bad"}">${ok?"ties":"DOES NOT TIE"}</span></td></tr>
<tr><td>Grubhub gross (prepaid orders)</td><td>${f2(gross)}</td></tr>
<tr><td>Commissions / delivery commissions / processing fees</td><td>${fees.map(f2).join(" / ")}</td></tr>
<tr><td>Difference (A/R credit less the three fees)</td><td>${f2(diff)} ${diff>0.004?"debit":diff<-0.004?"credit":""}</td></tr></table>
<h2>R365 sales vs Grubhub by day</h2><table><tr><th>Day</th><th>R365 to 104-06</th><th>Grubhub orders</th><th>R365 less Grubhub</th></tr>
${days.map(k=>`<tr><td>${k}</td><td>${f2(gl[k]||0)}</td><td>${f2(gh[k]||0)}</td><td>${f2((gl[k]||0)-(gh[k]||0))}</td></tr>`).join("")}</table>
${dep.odd.length?`<p>Refunds and adjustments in the window (type, day, amount in cents, order): ${dep.odd.map(o=>o.replace("PCI_SINGLE_","")).join("; ")}</p>`:""}
${p.note?`<p><b>Note.</b> ${p.note}</p>`:""}
<p>Grubhub day buckets use the order time in New York.</p>
<h2 class="pg">Grubhub orders, ${from} to ${to}</h2><table><tr><th>Order</th><th>New York time</th><th>Type</th><th>Gross</th><th>Commission</th><th>Delivery commission</th><th>Processing fee</th><th>Net</th></tr>
${dep.orders.map(o=>`<tr><td>${o[0]}</td><td>${o[1]}</td><td style="text-align:left">${o[2]}</td>${o.slice(3).map(c=>`<td>${f2((c||0)/100)}</td>`).join("")}</tr>`).join("")}
<tr><th>Total</th><th></th><th></th><th>${f2(gross+dep.T.account_adj/100)}</th>${[dep.T.commission_total,dep.T.grubhub_delivery_fee_total,dep.T.processing_fee,dep.total].map(c=>`<th style="text-align:right">${f2(c/100)}</th>`).join("")}</tr></table></body></html>`);
console.log([p.store,p.entryDate,f2(net),f2(posted),ok?"ties":"DOES NOT TIE",f2(diff)].join(" | "));
