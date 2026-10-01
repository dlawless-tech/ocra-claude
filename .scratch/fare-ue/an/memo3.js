const fs=require('fs');const j=JSON.parse(fs.readFileSync('xl.json','utf8').replace(/^﻿/,''));
const f=n=>n==null||n===''?'':(n<-0.004?'(':'')+Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+(n<-0.004?')':'');
const f0=n=>{const r=Math.round(n||0);return (r<0?'(':'')+Math.abs(r).toLocaleString('en-US')+(r<0?')':'')};
const S=j['Summary'];const H=S[4].map(h=>String(h).trim());const col=n=>{const i=H.indexOf(n);if(i<0)throw new Error('no col '+n);return i};
const locs=S.slice(5).filter(r=>r[0]&&r[0]!=='Total'&&!String(r[0]).startsWith('Check')&&typeof r[2]==='number');const tot=S.find(r=>r[0]==='Total');
const g=(r,n)=>r[col(n)];const by=re=>locs.find(r=>re.test(r[0]));
const K={sales:'Uber Sales (excl tax)',gl:'GL DSS Sales excl tax (same periods)',op:'Operating Sales Variance',pre:'Pre-2026 sales in catch-up payouts',ded:'Uber Deductions excl tax (fees, mktg, refunds)',fees:'GL Fees Booked excl tax (through cutoff)',fv:'Fee Variance (Uber - GL)',pred:'Pre-2026 deductions (catch-ups, est)',ofv:'Other Fee Variance',D:'Payouts Not Deposited / Deposit Var',A:'GL DSS After Last Paid Period (excl tax)',Af:'GL Fees Booked After Cutoff (excl tax)',tax:'Sales Tax & Withholding Net (excluded tab)',corr:'Corrected 1111 Balance',post:'1111 Balance As Posted',pd:'Location Posting Difference'};
const cols=['sales','gl','op','ded','fees','ofv','corr','post','pd'];
const locRows=locs.map(r=>`<tr><td>${r[0]}</td>${cols.map(k=>`<td>${f0(g(r,K[k]))}</td>`).join('')}</tr>`).join('');
const totRow=`<tr class="tot"><td>Total</td>${cols.map(k=>`<td>${f0(g(tot,K[k]))}</td>`).join('')}</tr>`;
const qb=g(by(/Holding/),K.corr);
const bridge=[['Operating sales variance (GL DSS vs Uber)',g(tot,K.op)],['Pre-2026 sales in 2026 catch-up payouts',g(tot,K.pre)],['Pre-2026 deductions in those payouts (est)',g(tot,K.pred)],['Other fee variance',g(tot,K.ofv)],['LaSalle 7/14 deposit above payout',g(tot,K.D)],['Week 9/21-9/27 (paid 9/28): GL DSS less fees booked',g(tot,K.A)-g(tot,K.Af)],['QB opening balance 12/31/25 (at Holding)',qb]];
const sub=bridge.reduce((a,b)=>a+b[1],0);
const Dm={};for(const r of j['Discrepancies'].slice(4))Dm[r[2]]=r[3];
const FT=j['Fees & Refunds'].find(r=>r[0]==='Total');
const lv=by(/Lakeview/),lg=by(/Logan/);
const html=`<!doctype html><html><head><meta charset="utf-8"><title>FARE Uber Eats Findings</title><style>
@page{size:letter;margin:0.6in 0.55in}body{font-family:Segoe UI,Arial,sans-serif;font-size:10pt;color:#1a1a1a;line-height:1.35}
h1{font-size:17pt;margin:0 0 2px;color:#1F4E78}h2{font-size:12pt;color:#1F4E78;border-bottom:1.5px solid #1F4E78;padding-bottom:2px;margin:16px 0 6px;break-after:avoid}
.sub{color:#555;margin-bottom:10px}table{border-collapse:collapse;width:100%;margin:4px 0 6px;font-size:8.6pt;break-inside:avoid}th{background:#1F4E78;color:#fff;padding:4px 5px;text-align:right;font-weight:600}th:first-child,td:first-child{text-align:left}
td{padding:3px 5px;border-bottom:1px solid #ddd;text-align:right}tr.tot td{font-weight:700;border-top:1.5px solid #333;border-bottom:2px double #333}tr.sub td{font-weight:600;border-top:1px solid #333}tr.ex td{color:#555;font-style:italic}
td.l{text-align:left}.box{background:#EEF4FA;border-left:4px solid #1F4E78;padding:7px 10px;margin:6px 0;break-inside:avoid}.box ul{margin:4px 0;padding-left:18px}.box li{margin:2px 0}
ol.find>li{margin:0 0 8px;break-inside:avoid}.amt{font-weight:700}.pri{display:inline-block;font-size:7.5pt;font-weight:700;padding:1px 5px;border-radius:3px;color:#fff;margin-right:4px}.High{background:#C00000}.Medium{background:#C55A11}.Low{background:#7F7F7F}.Resolved{background:#548235}
.why{color:#444;margin-top:2px}.note{font-size:8.5pt;color:#555;break-inside:avoid}
</style></head><body>
<h1>FARE Uber Eats Reconciliation: Findings</h1>
<div class="sub">Uber payouts 12/29/25 to 9/21/26 vs R365 GL through 9/27/26 &nbsp;|&nbsp; All sales, fees and refunds exclude sales tax &nbsp;|&nbsp; Rerun 10/1/26 with September fee entries posted &nbsp;|&nbsp; Workbook: FARE UberEats Review 12.29.25 to 9.27.26.xlsx</div>
<div class="box"><b>Bottom line</b><ul>
<li>With September's fee entries and deposits posted, ex-tax fees tie to Uber within <b>${f(-g(tot,K.ofv))}</b> once pre-2026 catch-up fees are set aside. Every store except Logan Square is within 150.</li>
<li>Sales tie within 1% at every store except <b>Lakeview</b> (GL about 25% high, ${f(g(lv,K.op))}) and <b>Logan Square</b> (GL about 0.8% high, ${f(g(lg,K.op))}).</li>
<li>Still open: reclass the Holding deposits (<b>${f(Dm['Uber deposits booked to Holding'])}</b>), correct the LaSalle 7/14 deposit (<b>${f(Dm['Deposit does not match payout'])}</b>), fix the Lakeview POS mapping, and tie the 92,465.91 QB opening balance.</li>
<li>The 1111 balance fell from 64,528.32 to <b>${f(g(tot,K.post))}</b> and is fully explained by location.</li></ul></div>

<h2>Sources and method</h2>
<table><tr><th>Source</th><th style="text-align:left">Detail</th></tr>
<tr><td>Uber Eats payout exports</td><td class="l">FARE UberEats 12.29 to 6.30.26.csv and 7.1 to 9.27.26.csv: 230 payouts, 10 stores</td></tr>
<tr><td>R365 GL Account Detail</td><td class="l">Pulled 10/1/26: 1111 Uber Eats Deposit Clearing, plus 7380, 7630, 4905 and 7535 (UberEats Fees JE lines), 12/1/25 to 9/30/26, all locations, unapproved included</td></tr>
<tr><td>Sales tax</td><td class="l">Excluded. Uber sales, refunds and offers are taken before tax. The GL books Uber sales to 1111 with tax, so GL DSS is restated before tax at each payout's Uber tax rate. Tax, MF tax, backup withholding and 2270 sit on the workbook's Sales Tax (excluded) tab only so 1111 ties.</td></tr>
<tr><td>Fee cutoff</td><td class="l">Fee JEs through 9/20 vs payouts through 9/21. The 9/27 fee JE covers the week Uber pays 9/28, which is not in the export, so it nets against that week's DSS.</td></tr>
<tr><td>Matching</td><td class="l">Each payout compared to GL DSS for the weeks it covers. Deposits matched to payouts by exact amount and date: 224 of 225 in 2026. The 12/29/25 payouts cover December, booked in QB, and are excluded.</td></tr></table>

<h2>Results by location (excl. sales tax)</h2>
<table><tr><th>Location</th><th>Uber sales</th><th>GL DSS sales</th><th>Operating sales var</th><th>Uber deductions</th><th>GL fees booked</th><th>Other fee var</th><th>1111 corrected</th><th>1111 as posted</th><th>Posting diff</th></tr>${locRows}${totRow}</table>
<div class="note">Operating sales var excludes pre-2026 sales inside catch-up payouts. Other fee var excludes their estimated pre-2026 deductions. The 1111 balance columns are as booked, so they still carry sales tax and the backup withholding reimbursement; the bridge below separates them.</div>

<h2>What makes up the 1111 balance</h2>
<table><tr><th>Component</th><th>Amount</th></tr>${bridge.map(b=>`<tr><td>${b[0]}</td><td>${f(b[1])}</td></tr>`).join('')}
<tr class="sub"><td>Subtotal excl. sales tax</td><td>${f(sub)}</td></tr>
<tr class="ex"><td>Sales tax and backup withholding carried in 1111 (excluded; see Sales Tax tab)</td><td>${f(g(tot,K.tax))}</td></tr>
<tr class="tot"><td>1111 balance 9/27/26</td><td>${f(sub+g(tot,K.tax))}</td></tr></table>
<div class="note">The excluded line is mostly the backup withholding Uber is reimbursing to Lakeview and Old Town (6,511.34). The 9/27 fee JE booked it, and the cash arrives with the 9/28 payout.</div>

<h2>Findings and actions</h2>
<ol class="find">
<li><span class="pri High">HIGH</span><b>Uber deposits booked to Holding</b>: <span class="amt">${f(Dm['Uber deposits booked to Holding'])}</span> reclass
<div>Jan-Jun Uber deposits (342,860.57) posted to FARE Holding LLC. The 8/31 UberEats AJE moved 263,750.90 to the stores, but not at the per-store deposit amounts. Holding sits at 6,361.53; Logan Square is overstated 81,433.36 and LaSalle 6,994.71.</div>
<div class="why">Action: review and post the Proposed Reclass JE (workbook tab). Each line is the store's posting difference, so after posting every store equals its corrected balance.</div></li>
<li><span class="pri High">HIGH</span><b>LaSalle deposit does not match payout</b>: <span class="amt">${f(Dm['Deposit does not match payout'])}</span>
<div>Deposit BD002517 on 7/14 is 23,698.74. Uber's 7/13 catch-up payout (ref 449EDNBXFGU2BKT) is 21,200.43.</div>
<div class="why">Action: pull the 7/14 bank line. If it shows 21,200.43, correct the deposit. If it shows 23,698.74, a second Uber payment is inside it and needs its own source.</div></li>
<li><span class="pri High">HIGH</span><b>Lakeview DSS about 25% above Uber</b>: <span class="amt">${f(g(lv,K.op))}</span> excl tax
<div>Every week since opening, GL DSS Third Party Delivery runs 23-25% above Uber sales. Lakeview's fees now tie to Uber exactly, so the whole gap is on the sales side.</div>
<div class="why">Action: check the Lakeview POS payment mapping to 1111. Another delivery channel, tips, or marked-up menu prices may be posting as Uber. If so, Lakeview sales are overstated by this amount and 1111 will never clear.</div></li>
<li><span class="pri Medium">MEDIUM</span><b>Logan Square DSS about 0.8% above Uber</b>: <span class="amt">${f(g(lg,K.op))}</span> excl tax
<div>GL DSS exceeds Uber sales every week.</div>
<div class="why">Action: compare one week of Toast Uber orders to Uber order detail. Likely tips or an item price difference.</div></li>
<li><span class="pri Medium">MEDIUM</span><b>Logan Square fee JEs above Uber</b>: <span class="amt">${f(g(lg,K.ofv))}</span>
<div>After setting aside the estimated pre-2026 deductions in the 2/2 catch-up, Logan Square's fee JEs run above Uber's deductions.</div>
<div class="why">Action: the pre-2026 split is prorated, so part of this is estimate noise. Compare the Jan and Feb fee JEs to Uber's monthly statements before adjusting.</div></li>
<li><span class="pri Medium">MEDIUM</span><b>QB opening balance at Holding</b>: <span class="amt">${f(qb)}</span>
<div>Uber paid ${f(-g(tot,K.pre))} of pre-2026 sales (excl tax) in 2026: Logan Square 2/2 (5,725 orders), Lake + LaSalle 7/13 (1,080 orders), and 12/29-12/31 stubs in the 1/5 payouts. Estimated net cash from them is 88,667.25, leaving about 3,798.66 of the opening balance unexplained.</div>
<div class="why">Action: tie to the QB 12/31/25 Uber receivable by store, then move it from Holding to the stores. The estimate is prorated, so use it as a guide, not a posting figure.</div></li>
<li><span class="pri Medium">MEDIUM</span><b>Backup withholding reimbursed, confirm the cash</b>: <span class="amt">${f(Dm['Backup withholding reimbursed, confirm cash'])}</span>
<div>The 9/27 fee JE books Uber's reimbursement of Lakeview 2,793.40 and Old Town 3,717.94 to 2270, so it sits in 1111 until the 9/28 payout lands. Logan Square's 4,082.33 from the 2/2 catch-up shows no reimbursement.</div>
<div class="why">Action: confirm both reimbursements in the 9/28 payouts (deposited 9/29). Ask Uber about Logan Square's 4,082.33.</div></li>
<li><span class="pri Low">LOW</span><b>Smaller items</b>
<div>Feb fee JE credits 1111 Riverside 21.68 short and Logan Square 21.68 over. Single-payout sales variances: Northwestern 7/20, Oak Park 1/12 and 1/19 (offset by 1/5), Riverside 7/27, Old Town first week. Two payouts exceed Uber's listed components (Old Town 8/10 48.13, Sterling 7/27 4.00).</div></li>
<li><span class="pri Resolved">RESOLVED</span><b>Since the 9/30 run</b>
<div>September deposits recorded: the 9/14 and 9/21 payouts for Logan Square, Oak Park, LaSalle and Sterling (10,641.76). September fees booked: weekly entries 9/6 to 9/27 (${f(Dm['September fees booked'])} excl tax).</div></li>
</ol>

<h2>Fees, marketing and refunds (excl. sales tax; payouts 1/5 to 9/21 vs fee JEs through 9/20)</h2>
<table><tr><th>Category</th><th>Uber</th><th>GL</th><th>GL account</th><th>Variance</th></tr>
<tr><td>Marketplace fees</td><td>${f(FT[1])}</td><td>${f(FT[2])}</td><td>7380</td><td>${f(FT[3])}</td></tr>
<tr><td>Marketing and promotions (offers, offer fees, ads)</td><td>${f(FT[4])}</td><td>${f(FT[5]+FT[6])}</td><td>7630 + 4905</td><td>${f(FT[7])}</td></tr>
<tr><td>Refunds / chargebacks</td><td>${f(FT[8])}</td><td>${f(FT[9])}</td><td>7535</td><td>${f(FT[10])}</td></tr>
<tr><td>Unlisted items</td><td>${f(FT[11])}</td><td></td><td></td><td>${f(FT[11])}</td></tr>
<tr class="tot"><td>Total</td><td>${f(FT[12])}</td><td>${f(FT[13])}</td><td></td><td>${f(FT[14])}</td></tr>
<tr><td>&nbsp;&nbsp;Pre-2026 deductions in catch-up payouts (est)</td><td></td><td></td><td></td><td>${f(g(tot,K.pred))}</td></tr>
<tr class="sub"><td>Other fee variance</td><td></td><td></td><td></td><td>${f(g(tot,K.ofv))}</td></tr></table>
<div class="note">Per-store detail is on the Fees &amp; Refunds tab. The 9/27 fee JE (${f(FT[18])}) is shown there separately, against the week Uber pays 9/28.</div>

<h2>Not verified</h2><ul>
<li>Bank statements: deposits were matched to the GL, not to the bank.</li>
<li>QB 12/31/25 Uber receivable detail by store.</li>
<li>Uber monthly statements: fee JEs compared in total, not statement by statement.</li>
<li>GL DSS before tax and the pre-2026 deduction split are estimates.</li>
<li>9/28 payout (sales 9/21-9/27): not in the export.</li></ul>
</body></html>`;
fs.writeFileSync('memo3.html',html);console.log('bridge',(sub+g(tot,K.tax)).toFixed(2),'posted',g(tot,K.post).toFixed(2),'sub',sub.toFixed(2));
