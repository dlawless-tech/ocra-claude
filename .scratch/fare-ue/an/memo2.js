const fs=require('fs');const j=JSON.parse(fs.readFileSync('xl.json','utf8').replace(/^﻿/,''));
const f=n=>n==null||n===''?'':(n<-0.004?'(':'')+Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+(n<-0.004?')':'');
const f0=n=>{const r=Math.round(n||0);return (r<0?'(':'')+Math.abs(r).toLocaleString('en-US')+(r<0?')':'')};
const S=j['Summary'];const H=S[4];const col=n=>H.indexOf(n);
const locs=S.slice(5).filter(r=>r[0]&&r[0]!=='Total'&&!String(r[0]).startsWith('Check')&&typeof r[2]==='number');const tot=S.find(r=>r[0]==='Total');
const g=(r,n)=>r[col(n)];const by=re=>locs.find(r=>re.test(r[0]));
const K={sales:'Uber Sales (excl tax)',gl:'GL DSS Sales excl tax (same periods)',op:'Operating Sales Variance',pre:'Pre-2026 sales in catch-up payouts',ded:'Uber Deductions excl tax (fees, mktg, refunds)',fees:'GL Fees Booked excl tax',sept:'Sept deductions not yet booked',ofv:'Other Fee Variance',D:'Payouts Not Deposited / Deposit Var',A:'GL DSS After Last Paid Period (excl tax)',tax:'Sales Tax & Withholding Net (excluded tab)',corr:'Corrected 1111 Balance',post:'1111 Balance As Posted',pd:'Location Posting Difference'};
const locRows=locs.map(r=>`<tr><td>${r[0]}</td>${['sales','gl','op','ded','fees','corr','post','pd'].map(k=>`<td>${f0(g(r,K[k]))}</td>`).join('')}</tr>`).join('');
const totRow=`<tr class="tot"><td>Total</td>${['sales','gl','op','ded','fees','corr','post','pd'].map(k=>`<td>${f0(g(tot,K[k]))}</td>`).join('')}</tr>`;
const qb=g(by(/Holding/),K.corr);
const bridge=[['Operating sales variance (GL DSS vs Uber)',g(tot,K.op)],['Pre-2026 sales in 2026 catch-up payouts',g(tot,K.pre)],['September Uber deductions not yet booked',g(tot,K.sept)],['Other fee variance (mostly pre-2026 deductions in catch-ups)',g(tot,K.ofv)],['Uber payouts not deposited / deposit variance',g(tot,K.D)],['GL DSS after last paid period (9/21-9/27, paid 9/28)',g(tot,K.A)],['QB opening balance 12/31/25 (at Holding)',qb]];
const sub=bridge.reduce((a,b)=>a+b[1],0);
const Dm={};for(const r of j['Discrepancies'].slice(4))Dm[r[2]]=r[3];
const FT=j['Fees & Refunds'].find(r=>r[0]==='Total');
const lv=by(/Lakeview/),lg=by(/Logan/);
const html=`<!doctype html><html><head><meta charset="utf-8"><title>FARE Uber Eats Findings</title><style>
@page{size:letter;margin:0.6in 0.55in}body{font-family:Segoe UI,Arial,sans-serif;font-size:10pt;color:#1a1a1a;line-height:1.35}
h1{font-size:17pt;margin:0 0 2px;color:#1F4E78}h2{font-size:12pt;color:#1F4E78;border-bottom:1.5px solid #1F4E78;padding-bottom:2px;margin:16px 0 6px;break-after:avoid}
.sub{color:#555;margin-bottom:10px}table{border-collapse:collapse;width:100%;margin:4px 0 6px;font-size:8.8pt;break-inside:avoid}th{background:#1F4E78;color:#fff;padding:4px 5px;text-align:right;font-weight:600}th:first-child,td:first-child{text-align:left}
td{padding:3px 5px;border-bottom:1px solid #ddd;text-align:right}tr.tot td{font-weight:700;border-top:1.5px solid #333;border-bottom:2px double #333}tr.sub td{font-weight:600;border-top:1px solid #333}tr.ex td{color:#555;font-style:italic}
td.l{text-align:left}.box{background:#EEF4FA;border-left:4px solid #1F4E78;padding:7px 10px;margin:6px 0;break-inside:avoid}.box ul{margin:4px 0;padding-left:18px}.box li{margin:2px 0}
ol.find>li{margin:0 0 8px;break-inside:avoid}.amt{font-weight:700}.pri{display:inline-block;font-size:7.5pt;font-weight:700;padding:1px 5px;border-radius:3px;color:#fff;margin-right:4px}.High{background:#C00000}.Medium{background:#C55A11}.Low{background:#7F7F7F}
.why{color:#444;margin-top:2px}.note{font-size:8.5pt;color:#555;break-inside:avoid}
</style></head><body>
<h1>FARE Uber Eats Reconciliation: Findings</h1>
<div class="sub">Uber payouts 12/29/25 to 9/21/26 vs R365 GL through 9/27/26 &nbsp;|&nbsp; All sales, fees and refunds exclude sales tax &nbsp;|&nbsp; Prepared 9/30/26 &nbsp;|&nbsp; Workbook: FARE UberEats Review 12.29.25 to 9.27.26.xlsx</div>
<div class="box"><b>Bottom line</b><ul>
<li>Ex-tax Uber sales were <b>${f(g(tot,K.sales))}</b>. Every store ties to the GL within 1% except <b>Lakeview</b> (GL about 25% high, ${f(g(lv,K.op))}) and <b>Logan Square</b> (GL about 0.8% high, ${f(g(lg,K.op))}).</li>
<li>Four fixes before September close: reclass the Holding deposits (<b>${f(Dm['Uber deposits booked to Holding'])}</b>), correct the LaSalle 7/14 deposit (<b>${f(Dm['Deposit does not match payout'])}</b>), record <b>${f(Dm['Payouts with no deposit in R365'])}</b> of September deposits, and book September fees (<b>${f(g(tot,K.sept))}</b> excl tax).</li>
<li>The 1111 Uber Eats Deposit Clearing balance of <b>${f(g(tot,K.post))}</b> is fully explained by location.</li>
<li>Uber is taking 24% backup withholding from Lakeview and Old Town, which points to a missing W-9.</li></ul></div>

<h2>Sources and method</h2>
<table><tr><th>Source</th><th style="text-align:left">Detail</th></tr>
<tr><td>Uber Eats payout exports</td><td class="l">FARE UberEats 12.29 to 6.30.26.csv and 7.1 to 9.27.26.csv: 230 payouts, 10 stores</td></tr>
<tr><td>R365 GL Account Detail</td><td class="l">1111 Uber Eats Deposit Clearing, plus 7380, 7630, 4905 and 7535 (UberEats Fees JE lines), 12/1/25 to 9/30/26, all locations, unapproved included</td></tr>
<tr><td>Sales tax</td><td class="l">Excluded. Uber sales, refunds and offers are taken before tax. The GL books Uber sales to 1111 with tax, so GL DSS is restated before tax at each payout's Uber tax rate. Tax, MF tax and 2270 sit on the workbook's Sales Tax (excluded) tab only so 1111 ties.</td></tr>
<tr><td>Matching</td><td class="l">Each payout compared to GL DSS for the weeks it covers. Deposits matched to payouts by exact amount and date (216 of 229). The 12/29/25 payouts cover December activity booked in QB and are excluded.</td></tr></table>

<h2>Results by location (excl. sales tax)</h2>
<table><tr><th>Location</th><th>Uber sales</th><th>GL DSS sales</th><th>Operating sales var</th><th>Uber deductions</th><th>GL fees booked</th><th>1111 corrected</th><th>1111 as posted</th><th>Posting diff</th></tr>${locRows}${totRow}</table>
<div class="note">Operating sales var excludes pre-2026 sales inside catch-up payouts. Deductions are fees, marketing and refunds. The 1111 balance columns are as booked, so they still carry sales tax; the bridge below separates it. Posting diff is what the proposed reclass moves.</div>

<h2>What makes up the 1111 balance</h2>
<table><tr><th>Component</th><th>Amount</th></tr>${bridge.map(b=>`<tr><td>${b[0]}</td><td>${f(b[1])}</td></tr>`).join('')}
<tr class="sub"><td>Subtotal excl. sales tax</td><td>${f(sub)}</td></tr>
<tr class="ex"><td>Sales tax and backup withholding carried in 1111 (excluded; see Sales Tax tab)</td><td>${f(g(tot,K.tax))}</td></tr>
<tr class="tot"><td>1111 balance 9/27/26</td><td>${f(sub+g(tot,K.tax))}</td></tr></table>
<div class="note">Uber paid ${f(-g(tot,K.pre))} of pre-2026 sales (excl tax) in 2026: Logan Square 2/2 (5,725 orders), Lake + LaSalle 7/13 (1,080 orders), and 12/29-12/31 stubs in the 1/5 payouts. Net of their deductions, those collections relieve the QB opening balance.</div>

<h2>Findings and actions</h2>
<ol class="find">
<li><span class="pri High">HIGH</span><b>Uber deposits booked to Holding</b>: <span class="amt">${f(Dm['Uber deposits booked to Holding'])}</span> reclass
<div>Jan-Jun Uber deposits (342,860.57) posted to FARE Holding LLC. The 8/31 UberEats AJE moved 263,750.90 to the stores, but not at the per-store deposit amounts. Holding sits at 6,361.53; Logan Square is overstated 81,433.36 and LaSalle 6,994.71.</div>
<div class="why">Action: review and post the Proposed Reclass JE (workbook tab). Each line is the store's posting difference, so after posting every store equals its corrected balance.</div></li>
<li><span class="pri High">HIGH</span><b>LaSalle deposit does not match payout</b>: <span class="amt">${f(Dm['Deposit does not match payout'])}</span>
<div>Deposit BD002517 on 7/14 is 23,698.74. Uber's 7/13 catch-up payout (ref 449EDNBXFGU2BKT) is 21,200.43.</div>
<div class="why">Action: pull the 7/14 bank line. If it shows 21,200.43, correct the deposit. If it shows 23,698.74, a second Uber payment is inside it and needs its own source.</div></li>
<li><span class="pri High">HIGH</span><b>September payouts with no deposit in R365</b>: <span class="amt">${f(Dm['Payouts with no deposit in R365'])}</span>
<div>9/14 and 9/21 payouts: Logan Square 3,457.26 + 4,062.27; Oak Park 1,131.18 + 783.69; Lake + LaSalle 586.47 + 454.82; Sterling 144.59 + 21.48.</div>
<div class="why">Action: record the 9/15 and 9/22 Uber deposits. The other stores deposited those weeks, so check the bank feed these four land in.</div></li>
<li><span class="pri High">HIGH</span><b>Lakeview DSS about 25% above Uber</b>: <span class="amt">${f(g(lv,K.op))}</span> excl tax
<div>Every week since opening, GL DSS Third Party Delivery runs 23-25% above Uber sales, before and after tax.</div>
<div class="why">Action: check the Lakeview POS payment mapping to 1111. Another delivery channel, tips, or marked-up menu prices may be posting as Uber. If so, Lakeview sales are overstated by this amount and 1111 will never clear.</div></li>
<li><span class="pri Medium">MEDIUM</span><b>September fees not booked</b>: <span class="amt">${f(g(tot,K.sept))}</span> excl tax
<div>No UberEats Fees entries after 8/31. Fee, marketing and refund deductions on the 9/8, 9/14 and 9/21 payouts sit in 1111: marketplace fees ${f(FT[15])}, marketing ${f(FT[16])}, refunds ${f(FT[17])}.</div>
<div class="why">Action: post the September fee entries.</div></li>
<li><span class="pri Medium">MEDIUM</span><b>Logan Square DSS about 0.8% above Uber</b>: <span class="amt">${f(g(lg,K.op))}</span> excl tax
<div>GL DSS exceeds Uber sales every week.</div>
<div class="why">Action: compare one week of Toast Uber orders to Uber order detail. Likely tips or an item price difference.</div></li>
<li><span class="pri Medium">MEDIUM</span><b>QB opening balance at Holding</b>: <span class="amt">${f(qb)}</span>
<div>Estimated pre-2026 net collected in 2026 is 88,667.25 (Logan Square 83,001.26, LaSalle 4,439.92, small stubs), leaving about 3,798.66 unexplained.</div>
<div class="why">Action: tie to the QB 12/31/25 Uber receivable by store, then move it from Holding to the stores. The estimate prorates each catch-up payout by its pre-2026 share of sales, so use it as a guide, not a posting figure.</div></li>
<li><span class="pri Medium">MEDIUM</span><b>Backup withholding taken by Uber</b>: <span class="amt">${f(Dm['Backup withholding (24%) taken by Uber'])}</span>
<div>Lakeview 2,793.40 and Old Town 3,717.94, withheld at 24% on every payout. It books to 2270 with the sales tax, so it sits outside the ex-tax figures above. Logan Square also had 4,082.33 withheld on the 2/2 catch-up.</div>
<div class="why">Action: submit W-9s to Uber for Lakeview and Old Town to stop the withholding.</div></li>
<li><span class="pri Low">LOW</span><b>Smaller items</b>
<div>Feb fee JE credits 1111 Riverside 21.68 short and Logan Square 21.68 over. Single-payout sales variances: Northwestern 7/20, Oak Park 1/12 and 1/19 (offset by 1/5), Riverside 7/27, Old Town first week. Two payouts exceed Uber's listed components (Old Town 8/10 48.13, Sterling 7/27 4.00).</div></li>
</ol>

<h2>Fees, marketing and refunds (excl. sales tax; payouts 1/5 to 8/31 vs Jan-Aug fee JEs)</h2>
<table><tr><th>Category</th><th>Uber</th><th>GL</th><th>GL account</th><th>Variance</th></tr>
<tr><td>Marketplace fees</td><td>${f(FT[1])}</td><td>${f(FT[2])}</td><td>7380</td><td>${f(FT[3])}</td></tr>
<tr><td>Marketing and promotions (offers, offer fees, ads)</td><td>${f(FT[4])}</td><td>${f(FT[5]+FT[6])}</td><td>7630 + 4905</td><td>${f(FT[7])}</td></tr>
<tr><td>Refunds / chargebacks</td><td>${f(FT[8])}</td><td>${f(FT[9])}</td><td>7535</td><td>${f(FT[10])}</td></tr>
<tr><td>Unlisted items</td><td>${f(FT[11])}</td><td></td><td></td><td>${f(FT[11])}</td></tr>
<tr class="tot"><td>Total</td><td>${f(FT[12])}</td><td>${f(FT[13])}</td><td></td><td>${f(FT[14])}</td></tr></table>
<div class="note">Most of the variance is deductions on pre-2026 sales inside the Logan Square and LaSalle catch-up payouts, which the 2026 JEs correctly leave out. The rest is timing: the JEs follow Uber's monthly statements by order date, payouts run by week. Per-store detail is on the Fees &amp; Refunds tab.</div>

<h2>Not verified</h2><ul>
<li>Bank statements: deposits were matched to the GL, not to the bank.</li>
<li>QB 12/31/25 Uber receivable detail by store.</li>
<li>Uber monthly statements: fee JEs compared in total, not statement by statement.</li>
<li>GL DSS before tax is an estimate: 1111 books Uber sales with tax and does not split it.</li>
<li>9/28 payout (sales 9/21-9/27): not in the export yet.</li></ul>
</body></html>`;
fs.writeFileSync('memo2.html',html);console.log('bridge',(sub+g(tot,K.tax)).toFixed(2),'posted',g(tot,K.post).toFixed(2));
