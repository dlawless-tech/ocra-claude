const fs=require('fs');const {r2}=require('./model');const {S,stores,oak,FK,GK}=require('./build');
const t=g=>r2(S.reduce((a,s)=>a+g(s),0));const by=re=>S.find(s=>re.test(s.loc));
const f=(n,i)=>n==null?'':(n=Math.abs(n)<0.005?0:n,i?n.toLocaleString('en-US'):n<0?'('+Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+')':n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}));
const sh=l=>l.replace(/^FARE /,'');
const tbl=(cols,data,total=true)=>`<table><tr>${cols.map(c=>`<th>${c[0]}</th>`).join('')}</tr>${data.map(d=>`<tr>${cols.map((c,j)=>`<td class="${j?'n':''}">${j?f(c[1](d),c[0]==='Orders'):c[1](d)}</td>`).join('')}</tr>`).join('')}${total?`<tr class="t">${cols.map((c,j)=>`<td class="${j?'n':''}">${j?f(r2(data.reduce((a,d)=>a+(c[1](d)||0),0)),c[0]==='Orders'):'Total'}</td>`).join('')}</tr>`:''}</table>`;
const H='FARE Holding LLC';const lg=by(/Logan/),op=by(/Oak Park/);const pc=s=>((s.feesEx+s.refEx)/s.salesEx*100).toFixed(1)+'%';
const html=`<!doctype html><html><head><meta charset="utf-8"><title>FARE Grubhub Findings</title><style>
*{-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Calibri,Arial,sans-serif;font-size:10.5pt;color:#222;margin:0}h1{font-size:18pt;color:#1F4E78;margin:0 0 4px}h2{font-size:13pt;color:#1F4E78;border-bottom:1px solid #1F4E78;padding-bottom:2px;margin:18px 0 6px}
.sub{color:#555;font-style:italic;margin-bottom:10px}table{border-collapse:collapse;width:100%;font-size:8.5pt;margin:6px 0}th{background:#1F4E78;color:#fff;padding:4px;text-align:center}td{padding:3px 4px;border-bottom:1px solid #ddd}td.n{text-align:right;white-space:nowrap}tr.t td{font-weight:bold;border-top:1px solid #000;border-bottom:3px double #000}
.box{background:#F2F6FA;border-left:4px solid #1F4E78;padding:8px 12px;margin:8px 0}ol li{margin-bottom:6px}.pb{page-break-before:always}</style></head><body>
<h1>FARE Grubhub vs R365 GL: Findings</h1>
<div class="sub">Grubhub transaction detail 12/30/25 to 9/21/26 (payouts 1/2/26 to 9/25/26) compared to R365 GL through 9/30/26, with weekly fee entries through 9/27. Sales tax is not analyzed: all sales, refunds, fees and balances exclude it. Prepared 9/30/26. Supporting numbers: FARE Grubhub Analysis 12.30.25 to 9.27.26.xlsx.</div>
<div class="box"><b>Bottom line.</b> Excluding sales tax, 1103 Grubhub Deposit Clearing holds ${f(t(s=>s.endEx))} at 9/30. Only ${f(t(s=>s.Aex))} of that is legitimate: the unpaid week of 9/22-9/30, net of the 9/27 fee entries. The September weekly fee entries tie to Grubhub. The rest is ${f(t(s=>s.Cex))} of Jan-Aug Grubhub fees never booked and ${f(-t(s=>s.Bex))} of net sales variances (mostly tips), less a 469.85 deposit with no payout. Separately, the 8/31 AJE moved 28,283.94 out of the stores into FARE Holding; that nets to zero in total but misstates every store. Every location ties to the penny.</div>
<h2>Grubhub Activity by Location</h2>
${tbl([['Location',d=>sh(d.loc)],['Orders',d=>d.orders],['Sales',d=>d.salesEx],['Refunds',d=>d.refEx],['Fees, Marketing, Promos',d=>d.feesEx],['Net Payouts',d=>d.net]],stores.filter(s=>s.salesEx))}
<p>Grubhub sales were ${f(t(s=>s.salesEx))}. Grubhub kept ${f(t(s=>s.feesEx))} in fees, marketing and promotions, and ${f(t(s=>s.refEx))} went back to customers in refunds: together ${(t(s=>s.feesEx+s.refEx)/t(s=>s.salesEx)*100).toFixed(1)}% of sales. Oak Park (${pc(op)}) and Logan Square (${pc(lg)}) are the outliers, driven by marketing commission, ad spend and promotions.</p>
<h2>Reconciliation of the 9/30 1103 Balance</h2>
${tbl([['Location',d=>sh(d.loc)],['Sales Var (DSS - GH)',d=>d.Bex],['Fees Not Booked',d=>d.Cex],['8/31 AJE Excess Credit',d=>-d.ajeX],['Deposit No Payout',d=>-d.udHere],['Unpaid Week 9/22-9/30',d=>d.Aex],['Holding',d=>d.hold],['1103 9/30',d=>d.endEx]],S)}
<p class="sub">Fees are compared through the 9/20 weekly entries; the 9/27 entries (orders 9/22-9/28) are netted in the unpaid week. DSS tax is removed at each store's Grubhub tax rate for that day.</p>
<h2 class="pb">Findings</h2><ol>
<li><b>Jan-Aug Grubhub fees under-booked by ${f(t(s=>s.Cex))}.</b> Fees, marketing, promotions and refunds were ${f(t(s=>s.feesEx+s.refEx))}; the Grubhub fee entries booked ${f(t(s=>s.feesGLex))}. September ties, so the whole gap is in the Jan-Aug monthly entries. Oak Park had none (${f(op.Cex)}). Loop (${f(by(/Loop/).Cex)}) and Northwestern (${f(by(/Northwestern/).Cex)}) are short mainly on their catering stores (Loop GO, Northwestern catering). Every other store is within about 125, apart from Lakeview's August entry with no Grubhub behind it (finding 5).</li>
<li><b>The 8/31 GrubHub AJE is not a deposit reclass.</b> Jan-Jul Grubhub deposits posted to FARE Holding. The AJE credited each store about its full 8/31 balance (133,785.29 total), which pushed unbooked fees into Holding. Holding 1103 carries 28,283.94 that belongs to no deposit; ${f(oak.ajeX)} of it came from the Oak Park credit.</li>
<li><b>September weekly fee entries tie.</b> Entries are booked for every store from 9/6 through 9/27, and for 9/1-9/21 they match Grubhub within 29.38 in total (tax on refunds booked in 7535).</li>
<li><b>Tips are left out of the DSS clearing debit.</b> Grubhub paid ${f(t(s=>s.tip))} of tips in the payouts, but the DSS debits 1103 without them, so deposits over-clear the account. Mostly Loop (2,786.02) and Northwestern (1,979.40) catering and self-delivery orders.</li>
<li><b>Lakeview shows Grubhub sales with no Grubhub store.</b> DSS posted ${f(by(/Lakeview/).dssEx)} of Grubhub sales to Lakeview from 8/1 to 9/21, but Lakeview is not in the Grubhub download and has no Grubhub deposits. A 463.86 fee entry was booked in August with no statement behind it.</li>
<li><b>Logan Square 3/4 DSS spike.</b> DSS posted about 2,250.66 to 1103 on 3/4 against 140.80 of Grubhub sales. No Grubhub order matches it on any date.</li>
<li><b>Old Town DSS runs about 20% below Grubhub.</b> Every day since August the DSS amount is about 20% under the Grubhub sales (${f(by(/Old Town/).Bex)} net), which suggests the Toast in-store price is posting where the Grubhub price is higher.</li>
<li><b>Deposits.</b> Every Grubhub payout through 9/25 now ties exactly to an R365 bank deposit. Deposit BD002858 (469.85, Northwestern, 7/17) matches no Grubhub payout.</li>
<li><b>Catering timing.</b> Catering orders post to DSS on the event date while Grubhub dates them when placed, so Loop and Northwestern swing day to day. These net out over the period and need no entry.</li></ol>
<h2 class="pb">Proposed Corrections by Location</h2>
${tbl([['Location',d=>sh(d.loc)],...FK.map(([k,fn],i)=>[k.replace(' (excl. tax)',''),d=>r2(fn(d.h)-(d.feeA[GK[i]]||0))]),['Fee JE (Cr 1103)',d=>d.Cex],['AJE Fix Dr / (Cr) 1103',d=>d.loc===H?-28283.94:d.ajeX]],S)}
<p>The AJE fix column nets to zero: it moves the 28,283.94 out of Holding and back to the stores, Oak Park the largest at ${f(oak.ajeX)}.</p>
<h2>Next Steps</h2><ol>
<li>Post the Jan-Aug fee catch-up JE by location and account (Oak Park, Loop and Northwestern carry almost all of it).</li>
<li>Post the AJE fix so FARE Holding 1103 goes to zero.</li>
<li>Fix the Toast/DSS mapping for Grubhub tips, and check the Old Town Grubhub pricing.</li>
<li>Confirm whether Lakeview has its own Grubhub account, and trace the Logan 3/4 amount and deposit BD002858.</li></ol>
<p class="sub">Method: Grubhub rows grouped by store and payout; payouts matched to 1103 bank deposits on exact amount within 14 days. Fee mapping checked against the May Logan Square entry, which ties exactly. GL pulled from R365 GL Account Detail on 9/30 for 1103, 4105, 4206, 7340, 7350, 7560, 7570, 4905, 7535 and 2270.</p>
</body></html>`;
fs.writeFileSync('report.html',html);console.log('ok');
