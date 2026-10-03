const fs=require("fs");
const deps=JSON.parse(JSON.parse(fs.readFileSync("deps.json","utf8")));
const c=fs.readFileSync("cells2.txt","utf8").split(/\r?\n/);
const num=s=>/^-?[\d,]+\.\d\d$/.test(s), n=s=>parseFloat(s.replace(/,/g,""));
const iso=d=>{const[m,dd,y]=d.split("/");return y+"-"+m.padStart(2,"0")+"-"+dd.padStart(2,"0")};
const rows=[];
for(let i=0;i<c.length;i++){ if(!/^\d+\/\d+\/2026$/.test(c[i]))continue; let j=i+1,t=[];
  while(j<c.length&&!(num(c[j])&&num(c[j+1])&&num(c[j+2]))){t.push(c[j]);j++;}
  rows.push({date:iso(c[i]),type:t[0],loc:t[1],txt:t.slice(2).join(" "),dr:n(c[j]),cr:n(c[j+1])}); i=j+2; }
const stores={Cookshop:{gh:"Cookshop",suf:"bgfiIl4",gl:"Cookshop"},Rosie:{gh:"Rosie's",suf:"eOnrAHE",gl:"Rosie’s"},Shuka:{gh:"Shuka",suf:"jo_F6pj",gl:"Shuka"},Vic:{gh:"Vic's",suf:"UWCSZNz",gl:"Vic’s"}};
const per={"2026-08-31":["26090401","2026-08-25","2026-08-31"],"2026-09-06":["26091109","2026-09-01","2026-09-07"],"2026-09-13":["26091816","2026-09-08","2026-09-14"],"2026-09-20":["26092523","2026-09-15","2026-09-21"],"2026-09-27":["26100230","2026-09-22","2026-09-28"],"2026-09-30":["26100201","2026-09-29","2026-09-30"]};
const notes={
 "2026-08-31 Vic":"Corrected 10/3/2026 from 234.10 to 127.40. The original credit was figured from an A/R balance that already held Vic's 9/2 sale of 106.70.",
 "2026-08-31 Cookshop":"August entries carry one plug line to 632-02 for the fees and any difference.","2026-08-31 Rosie":"August entries carry one plug line to 632-02 for the fees and any difference.","2026-08-31 Shuka":"August entries carry one plug line to 632-02 for the fees and any difference.",
 "2026-09-30 Shuka":"R365 booked 647.80 to Grubhub on 9/29 against Grubhub's 725.24. The 77.43 matches pickup order O-477834852462208 (45.86) plus one 31.57 order (O-146934855490925 or O-015434859294551) missing from the 9/29 sales. Unconfirmed against the POS.",
 "2026-09-30 Cookshop":"Month-end entry: Grubhub split the 9/29-10/5 period at month end and paid 9/29-9/30 as its own deposit.","2026-09-30 Rosie":"Month-end entry: Grubhub split the 9/29-10/5 period at month end and paid 9/29-9/30 as its own deposit.","2026-09-30 Vic":"Month-end entry: Grubhub split the 9/29-10/5 period at month end and paid 9/29-9/30 as its own deposit."};
const f2=x=>x.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const out=[];
for(const ln of fs.readFileSync("lines.txt","utf8").trim().split(/\r?\n/)){
  const [D,L,ID,...rest]=ln.split(" "); const r=rest.join(" ").replace(/^"|"$/g,"").split("^");
  const st=stores[L], p=per[D], sid=p[0]+st.suf, dep=deps.find(x=>x.sid===sid);
  const lines=r.slice(2).map(x=>x.split("~"));
  const days={}; for(const g of rows.filter(g=>g.loc===st.gl&&g.type==="Journal Entry"&&g.dr>0&&g.date>=p[1]&&g.date<=p[2]))days[g.date]=(days[g.date]||0)+g.dr;
  const ghd={}; for(const[k,v]of Object.entries(dep.days))if(k>=p[1]&&k<=p[2])ghd[k]=v/100;
  const allD=[...new Set([...Object.keys(days),...Object.keys(ghd)])].sort();
  const Dt=Object.values(days).reduce((a,b)=>a+b,0), net=dep.total/100, gross=dep.T.prepaid_total/100;
  const fees=[-dep.T.commission_total,-dep.T.grubhub_delivery_fee_total,-dep.T.processing_fee].map(x=>x/100);
  const cr=Dt-net, diff=cr-fees.reduce((a,b)=>a+b,0);
  const ar=lines.find(l=>/^104-06/.test(l[0])); const arcr=n(ar[2]);
  const ok=Math.abs(arcr-cr)<0.005;
  const png=fs.readFileSync("shots/"+sid+".png").toString("base64");
  const title=`GrubHub ${L} ${D.slice(5).replace("-","/")}`;
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
body{font-family:Arial,sans-serif;font-size:11px;color:#111;margin:24px}h1{font-size:16px;margin:0 0 4px}h2{font-size:13px;margin:18px 0 6px}
table{border-collapse:collapse;margin-bottom:6px}td,th{border:1px solid #bbb;padding:3px 8px;text-align:right}th{background:#eee}td:first-child,th:first-child{text-align:left}
.ok{color:#060;font-weight:bold}.bad{color:#b00;font-weight:bold}.pg{page-break-before:always}img{width:100%;display:block}th:last-child{text-align:left}p{margin:4px 0}</style></head><body>
<h1>${title}: Grubhub deposit backup</h1>
<p>R365 journal entry GrubHub dated ${D}, location ${st.gl}, ${r[0]}. Grubhub deposit ${sid}, paid ${dep.created.slice(0,10)}, effective ${dep.eff.slice(0,10)}. Sales window ${p[1]} to ${p[2]}.</p>
<h2>Entry as posted</h2><table><tr><th>Account</th><th>Debit</th><th>Credit</th><th>Comment</th></tr>${lines.map(l=>`<tr><td>${l[0]}</td><td>${l[1]}</td><td>${l[2]}</td><td style="text-align:left">${l[3]||""}</td></tr>`).join("")}</table>
<h2>Tie-out</h2><table>
<tr><td>R365 Grubhub sales booked to 104-06 in the window (D)</td><td>${f2(Dt)}</td></tr>
<tr><td>Less Grubhub net deposit</td><td>${f2(net)}</td></tr>
<tr><td>A/R credit expected (D less net)</td><td>${f2(cr)}</td></tr>
<tr><td>A/R credit posted</td><td>${f2(arcr)} <span class="${ok?"ok":"bad"}">${ok?"ties":"DOES NOT TIE"}</span></td></tr>
<tr><td>Grubhub gross (prepaid orders)</td><td>${f2(gross)}</td></tr>
<tr><td>Commissions / delivery commissions / processing fees</td><td>${fees.map(f2).join(" / ")}</td></tr>
<tr><td>Difference (A/R credit less the three fees)</td><td>${f2(diff)} ${diff>0.004?"debit":diff<-0.004?"credit":""}</td></tr></table>
<h2>R365 sales vs Grubhub by day</h2><table><tr><th>Day</th><th>R365 to 104-06</th><th>Grubhub orders</th><th>R365 less Grubhub</th></tr>
${allD.map(k=>`<tr><td>${k}</td><td>${f2(days[k]||0)}</td><td>${f2(ghd[k]||0)}</td><td>${f2((days[k]||0)-(ghd[k]||0))}</td></tr>`).join("")}</table>
${dep.odd.length?`<p>Refunds and adjustments in this deposit (type, day, amount in cents, order): ${dep.odd.map(o=>o.replace("PCI_SINGLE_","")).join("; ")}</p>`:""}
${notes[D+" "+L]?`<p><b>Note.</b> ${notes[D+" "+L]}</p>`:""}
<p>Grubhub day buckets use the order time in New York.</p>
<p>Next page: Grubhub deposit ${sid}, from Financials &gt; Deposit history, captured ${new Date().toISOString().slice(0,10)}. Its order times show in the capture browser, two hours behind New York.</p><img class="pg" src="data:image/png;base64,${png}"></body></html>`;
  const dir=`att/${ID}`; fs.mkdirSync(dir,{recursive:true}); fs.writeFileSync(`html/${ID}.html`,html,{flag:"w"});
  out.push([D,L,ID,sid,f2(arcr),f2(cr),ok?"ties":"NO",f2(diff)].join(" | "));
}
console.log(out.join("\n"));
