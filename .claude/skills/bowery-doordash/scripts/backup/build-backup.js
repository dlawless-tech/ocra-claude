// One entry's backup page: the entry as posted, the A/R tie-out, R365 debits by day, then the payout capture.
// usage: node build-backup.js <plan.json> <out.html>
// plan: {entryDate, store, location, status, lines:[[account,debit,credit,comment]], glDays:{day:debit},
//        payout:{id, date, window, sales, commission, marketing, amendments, net}, png, note?}
// payout figures carry DoorDash's displayed signs: commission and marketing negative, amendments either sign
const fs=require("fs");
const p=JSON.parse(fs.readFileSync(process.argv[2],"utf8")), po=p.payout;
const f2=x=>x.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}), n=s=>parseFloat(String(s).replace(/,/g,""))||0;
const days=Object.keys(p.glDays).sort();
const D=+Object.values(p.glDays).reduce((a,b)=>a+b,0).toFixed(2);
const cr=+(D-po.net).toFixed(2), diff=+(D-po.sales).toFixed(2);
const idOk=Math.abs(po.sales+po.commission+po.marketing+po.amendments-po.net)<0.005;
const line=c=>p.lines.find(l=>(l[3]||"").trim()===c)||[,"0","0"];
const ar=line("a/r debit from prior week less total payout"), posted=n(ar[2]);
const dl=line("difference"), postedDiff=n(dl[1])-n(dl[2]);
const dr=p.lines.reduce((a,l)=>a+n(l[1]),0), crs=p.lines.reduce((a,l)=>a+n(l[2]),0);
const ok=idOk&&Math.abs(posted-cr)<0.005&&Math.abs(postedDiff-diff)<0.005&&Math.abs(dr-crs)<0.005;
const png=fs.readFileSync(p.png).toString("base64");
const md=p.entryDate.slice(5).replace("-","/");
const title=`DoorDash ${p.store} ${md}`;
const tick=b=>`<span class="${b?"ok":"bad"}">${b?"ties":"DOES NOT TIE"}</span>`;
fs.writeFileSync(process.argv[3],`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
body{font-family:Arial,sans-serif;font-size:11px;color:#111;margin:24px}h1{font-size:16px;margin:0 0 4px}h2{font-size:13px;margin:18px 0 6px}
table{border-collapse:collapse;margin-bottom:6px}td,th{border:1px solid #bbb;padding:3px 8px;text-align:right}th{background:#eee}td:first-child,th:first-child,th:last-child{text-align:left}
.ok{color:#060;font-weight:bold}.bad{color:#b00;font-weight:bold}.pg{page-break-before:always}img{width:100%;display:block}p{margin:4px 0}</style></head><body>
<h1>${title}: DoorDash payout backup</h1>
<p>R365 journal entry DoorDash dated ${p.entryDate}, location ${p.location}, ${p.status}. DoorDash payout #${po.id}, paid ${po.date}, ${po.window}.</p>
<h2>Entry as posted</h2><table><tr><th>Account</th><th>Debit</th><th>Credit</th><th>Comment</th></tr>${p.lines.map(l=>`<tr><td>${l[0]}</td><td>${l[1]}</td><td>${l[2]}</td><td style="text-align:left">${l[3]||""}</td></tr>`).join("")}
<tr><th>Total</th><th>${f2(dr)}</th><th>${f2(crs)}</th><th></th></tr></table>
<h2>DoorDash payout</h2><table>
<tr><td>Sales</td><td>${f2(po.sales)}</td></tr>
<tr><td>Commission &amp; fees</td><td>${f2(po.commission)}</td></tr>
<tr><td>Marketing spend</td><td>${f2(po.marketing)}</td></tr>
<tr><td>Amendments</td><td>${f2(po.amendments)}</td></tr>
<tr><td>Net payout</td><td>${f2(po.net)} ${tick(idOk)}</td></tr></table>
<h2>Tie-out</h2><table>
<tr><td>R365 DoorDash sales debited to 104-05 in the period (D)</td><td>${f2(D)}</td></tr>
<tr><td>Less DoorDash net payout</td><td>${f2(po.net)}</td></tr>
<tr><td>A/R credit expected (D less net)</td><td>${f2(cr)}</td></tr>
<tr><td>A/R credit posted</td><td>${f2(posted)} ${tick(Math.abs(posted-cr)<0.005)}</td></tr>
<tr><td>Difference expected (D less DoorDash sales)</td><td>${f2(diff)} ${diff>0.004?"debit":diff<-0.004?"credit":""}</td></tr>
<tr><td>Difference posted</td><td>${f2(Math.abs(postedDiff))} ${postedDiff>0.004?"debit":postedDiff<-0.004?"credit":""} ${tick(Math.abs(postedDiff-diff)<0.005)}</td></tr>
<tr><td>104-05 balance left for this location (the net payout awaiting deposit)</td><td>${f2(D-posted)}</td></tr></table>
<h2>R365 debits to 104-05 by day</h2><table><tr><th>Day</th><th>R365 to 104-05</th></tr>
${days.map(k=>`<tr><td>${k}</td><td>${f2(p.glDays[k])}</td></tr>`).join("")}<tr><th>Total (D)</th><th>${f2(D)}</th></tr></table>
${p.note?`<p><b>Note.</b> ${p.note}</p>`:""}
<p>Next page: DoorDash payout #${po.id}, from Payouts in the DoorDash merchant portal.</p>
<img class="pg" src="data:image/png;base64,${png}"></body></html>`);
console.log([p.store,p.entryDate,po.id,f2(posted),ok?"ties":"DOES NOT TIE",f2(diff)].join(" | "));
