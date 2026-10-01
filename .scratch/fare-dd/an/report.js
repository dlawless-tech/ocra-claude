const fs=require('fs');const b=require('./build');const {L,LOCS,r2}=require('./model');
const f=n=>n==null||n===''?'':(Math.abs(n)<0.005?'-':(n<0?'(':'')+Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+(n<0?')':''));
const short=l=>l.replace(/^FARE /,'');const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const stores=LOCS.filter(l=>l!=='FARE Holding LLC');
const T=k=>r2(b.S.reduce((a,s)=>a+s[k],0));
const row=(c,cls='')=>`<tr class="${cls}">${c.map((x,i)=>`<td${i&&typeof x==='number'?' class="n"':''}>${typeof x==='number'?f(x):esc(x)}</td>`).join('')}</tr>`;
const sumCols=[['Location','loc'],['Orders','orders'],['DD Sales','sub'],['GL DD Sales (pre-tax)','dssPre'],['Sales Var','B'],['DD Deductions','ded'],['GL Fees Booked','fees'],['Wk 9/21 Fees Unbooked','Csep'],['Net Not Deposited','D'],['Tax Left in 1102','T'],['Correct 1102','correct'],['Posted 1102','posted'],['Posting Diff','postDiff']];
const sumRows=b.S.map(s=>row(sumCols.map(([,k])=>k==='orders'?String(s[k]):s[k]))).join('')+row(sumCols.map(([,k],i)=>i===0?'Total':k==='orders'?String(T(k)):T(k)),'tot');
const fr=b.F.map(x=>`<tr><td class="p ${x[0]}">${x[0]}</td><td><b>${esc(x[2])}</b><br><span class="loc">${esc(x[1])}</span></td><td class="n">${x[3]?f(x[3]):''}</td><td>${esc(x[4])}</td><td>${esc(x[5])}</td></tr>`).join('');
const je2=stores.map(l=>[short(l),r2(L[l].T-L[l].ddSep.tax)]).filter(x=>x[1]);
const H=L['FARE Holding LLC'];
const totDed=T('ded'),totSub=r2(stores.reduce((a,l)=>a+L[l].dd.sub,0));
const html=`<!doctype html><html><head><meta charset="utf-8"><title>FARE DoorDash Analysis</title><style>
@page{size:letter landscape;margin:0.5in}
body{font-family:Segoe UI,Arial,sans-serif;font-size:9.5pt;color:#1a1a1a}
h1{font-size:17pt;margin:0 0 2px;color:#C8102E}h2{font-size:12pt;margin:18px 0 6px;border-bottom:2px solid #C8102E;padding-bottom:2px}
.sub{color:#555;margin-bottom:10px}
table{border-collapse:collapse;width:100%;margin-bottom:6px}th{background:#C8102E;color:#fff;font-weight:600;padding:4px 5px;text-align:center;font-size:8.5pt}
td{padding:3px 5px;border-bottom:1px solid #ddd;vertical-align:top}td.n{text-align:right;white-space:nowrap}tr.tot td{font-weight:700;border-top:1.5px solid #333;border-bottom:3px double #333}
.kpi{display:flex;gap:10px;margin:8px 0 4px}.k{flex:1;border:1px solid #ddd;border-left:4px solid #C8102E;padding:6px 8px}.k b{display:block;font-size:13pt}.k span{color:#555;font-size:8.5pt}
.p{font-weight:700;white-space:nowrap}.High{color:#b00020}.Medium{color:#b86e00}.Low{color:#555}.Info{color:#1f4e78}.loc{color:#666;font-size:8.5pt}
.small td,.small th{font-size:8pt}.brk{page-break-before:always}ul{margin:4px 0 0 18px;padding:0}li{margin-bottom:3px}
</style></head><body>
<h1>FARE DoorDash vs R365: Sales, Fees, Refunds and Discrepancies by Location</h1>
<div class="sub">DoorDash Marketplace activity 12/29/25 to 9/27/26 (financial detail, payout summary, error charges, sales by order) against R365 GL 1102 DoorDash Deposit Clearing, 4104, 4207, 7310, 7540, 4905, 7535 and 7250. All sales, fees and refunds are before sales tax. Prepared 9/30/26. Nothing has been posted.</div>
<div class="kpi">
<div class="k"><b>${f(totSub)}</b><span>DoorDash subtotal, 1/1-9/27, ${T('orders').toLocaleString()} orders</span></div>
<div class="k"><b>${f(totDed)}</b><span>DoorDash deductions (${(totDed/totSub*100).toFixed(1)}% of subtotal)</span></div>
<div class="k"><b>${f(T('dep'))}</b><span>DoorDash payouts deposited in R365 (${require("./match").m.length} of 283 matched exactly)</span></div>
<div class="k"><b>${f(T('posted'))}</b><span>1102 balance at 9/27, fully explained by location</span></div>
</div>
<h2>What the 1102 balance is made of</h2>
<ul>
<li><b>${f(T('D'))}</b> DoorDash money not yet in 1102 deposits: 9/21-9/27 activity DoorDash pays on 10/1 (${f(T('unpaid'))}), the NMH 7/16 payout deposited to Grubhub clearing (${f(T('undep'))}), less the 12/29-12/31 portion of the 1/8 payouts whose sales are in QB (${f(-T('dec'))}).</li>
<li><b>${f(b.totSep)}</b> fees for the week of 9/21-9/27, not due until the 10/1 payout, plus <b>${f(r2(T('Cother')))}</b> of other fee differences.</li>
<li><b>${f(T('B'))}</b> net pre-tax sales variance, driven by Lakeview (+${f(L['FARE Lakeview (W Diversey)'].B)}) and Old Town (${f(L['FARE Old Town'].B)}).</li>
<li><b>${f(b.totT)}</b> sales tax the DSS includes in its DoorDash debit to 1102. DoorDash remits that tax itself, so it is never paid to FARE and nothing clears it. This is the only tax figure in the analysis.</li>
<li><b>${f(H.correct)}</b> left from the QB opening at Holding. Holding actually shows ${f(H.gl.end)} because the 8/31 DoorDash AJ moved ${f(H.postDiff)} too much out of the stores.</li>
</ul>
<h2>Findings</h2>
<table><tr><th style="width:6%">Priority</th><th style="width:19%">Issue</th><th style="width:9%">Amount</th><th style="width:40%">Detail</th><th>Action</th></tr>${fr}</table>
<h2 class="brk">1102 DoorDash Deposit Clearing by Location, 1/1/26 to 9/27/26</h2>
<table class="small"><tr>${sumCols.map(c=>`<th>${c[0]}</th>`).join('')}</tr>${sumRows}</table>
<div class="sub">Correct 1102 = Sales Var + (DD Deductions - GL Fees) + Net Not Deposited + Tax Left in 1102. GL DD Sales (pre-tax) = DSS debit to 1102 less the tax on those orders. Each deposit is assigned to the store whose payout it was. Posting Diff is the 8/31 DoorDash AJ excess. Refunds and adjustments by reason are on the Refunds &amp; Adjustments tab of the workbook.</div>
<h2>Fees and refunds by location (DoorDash, 1/1-9/27)</h2>
<table class="small"><tr><th>Location</th><th>Subtotal</th><th>Commission</th><th>Marketing / Ads</th><th>Promotions (FARE funded)</th><th>Refunds</th><th>Adjustments</th><th>DD-funded net</th><th>Total Deductions</th><th>% of Subtotal</th><th>GL Booked</th><th>Unbooked (mostly wk of 9/21)</th></tr>
${b.FL.map(x=>row([x.loc,x.sub,x.comm,x.mkt,x.disc,x.err,x.adj,x.ddf,x.ded,(x.dp*100).toFixed(1)+'%',x.gt,x.v])).join('')}
${row(['Total',...['sub','comm','mkt','disc','err','adj','ddf','ded'].map(k=>r2(b.FL.reduce((a,x)=>a+x[k],0))),(totDed/totSub*100).toFixed(1)+'%',r2(b.FL.reduce((a,x)=>a+x.gt,0)),r2(b.FL.reduce((a,x)=>a+x.v,0))],'tot')}</table>
<h2>Proposed entries</h2>
<table class="small"><tr><th style="width:22%">Entry</th><th>Lines</th><th style="width:10%">Amount</th></tr>
<tr><td><b>JE 1</b> Reclass 8/31 DoorDash AJ excess (8/31/26)</td><td>Dr 1102 at ${b.je1.filter(x=>x.dr).map(x=>`${x.loc} ${f(x.dr)}`).join(', ')}; Cr 1102 Holding LLC</td><td class="n">${f(H.postDiff)}</td></tr>
<tr><td><b>JE 2</b> Recode BD002858 (7/17/26)</td><td>Dr 1103 Grubhub Deposit Clearing / Cr 1102 DoorDash Deposit Clearing, Northwestern Memorial Hospital</td><td class="n">${f(469.85)}</td></tr>
</table>
<h2>Method</h2>
<ul>
<li>DoorDash stores mapped by Store ID (store names changed several times during the year). Sales use the local transaction date; weeks run Monday to Sunday; payouts land Thursday for the prior week.</li>
<li>DoorDash sales = subtotal, before tax. GL DoorDash sales = the DSS debit to 1102 less the tax on those orders, since the DSS records the DoorDash tender with tax included. GL 4104 alone is not comparable: the DSS splits the DoorDash price between 4104 (in-store price) and 4500 Third Party Service Fee Income (the DoorDash markup). Deductions = subtotal - net payout.</li>
<li>Every R365 1102 deposit matched a DoorDash payout at the exact amount within 10 days. The 1/2/26 payouts (week of 12/22) are set against the QB opening at Holding.</li>
<li>DoorDash Drive orders (FARE online orders delivered by DoorDash) are not in payouts; their fees are compared to Door Dash Inc AP invoices in 7250 on the Drive Fees tab.</li>
<li>Workbook: FARE DoorDash Analysis 12.29.25 to 9.27.26.xlsx, same folder. Tabs: Summary, Findings, Proposed JEs, Fees by Location, Monthly Fees, Weekly Sales, Payouts &amp; Deposits, Refunds &amp; Adjustments, Drive Fees, GL 1102 Detail.</li>
</ul>
</body></html>`;
fs.writeFileSync('report.html',html);console.log('ok',html.length);
