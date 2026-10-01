const ExcelJS=require('exceljs');const {S:SA,L,r2,pays,depOf,ud,up,glF,g1103,dtM,dayR}=require('./model');const {rows:RA}=require('./gh');const M=require('./map');
const OUT="C:/Users/trici/OCRA/TML's Files - General/Downloads/FARE Third Party Analysis/FARE Grubhub Analysis 12.30.25 to 9.27.26.xlsx";
const wb=new ExcelJS.Workbook();const money='#,##0.00;[Red](#,##0.00);-';const pct='0.0%';
const short=l=>(l||'').replace(/^FARE /,'');
const hdr=(ws,r)=>{const row=ws.getRow(r);row.font={bold:true,color:{argb:'FFFFFFFF'}};row.alignment={wrapText:true,vertical:'middle',horizontal:'center'};row.eachCell(c=>c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1F4E78'}});row.height=48};
const tot=(ws,r)=>{const row=ws.getRow(r);row.font={bold:true};row.eachCell(c=>{c.border={top:{style:'thin'},bottom:{style:'double'}}})};
const title=(ws,t,sub)=>{ws.getCell('A1').value=t;ws.getCell('A1').font={bold:true,size:14};if(sub){ws.getCell('A2').value=sub;ws.getCell('A2').font={italic:true,color:{argb:'FF555555'}}}};
const note=(ws,r,t)=>{ws.getRow(r).getCell(1).value=t;ws.getRow(r).font={italic:true}};
// cols: [header, key|fn, fmt(t text,i int,p pct,x no total,default money), width]
const table=(ws,start,cols,data,{total=true}={})=>{ws.getRow(start).values=cols.map(c=>c[0]);hdr(ws,start);
 data.forEach((d,i)=>{ws.getRow(start+1+i).values=cols.map(c=>typeof c[1]==='function'?c[1](d):d[c[1]])});
 if(total&&data.length){const r=start+1+data.length;const row=ws.getRow(r);row.getCell(1).value='Total';cols.forEach((c,j)=>{if(j===0||['t','p','x'].includes(c[2]))return;const col=ws.getColumn(j+1).letter;row.getCell(j+1).value={formula:`SUBTOTAL(9,${col}${start+1}:${col}${r-1})`}});tot(ws,r)}
 cols.forEach((c,j)=>{const col=ws.getColumn(j+1);col.width=c[3]||(j===0?30:14);if(j===0||c[2]==='t')return;col.numFmt=c[2]==='p'?pct:c[2]==='i'?'#,##0':money});
 return start+1+data.length+(total?1:0)};
const f2=n=>n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});

// Oak Park left out: no Grubhub fee entries in R365
const OAK='(none)';const OAKL='FARE Oak Park';const oak=SA.find(s=>s.loc===OAKL);
const S=SA.filter(s=>s.loc!==OAK);const stores=S.filter(s=>s.loc!=='FARE Holding LLC');
const rows=RA.filter(q=>M[q.grubhub_store_id]!==OAK);
const OAKNOTE=`Weekly fee entries are booked from 9/1 on and tie to Grubhub. The Jan-Aug monthly entries are still short: Oak Park had none, and Loop and Northwestern are short on their catering stores.`;
const FK=[['7350/7340 Delivery comm + processing',h=>-(h.dcom+h.proc)],['7570 Marketing comm + ads - credits',h=>-(h.com+h.misc+h.cred)],['4905 Promotions',h=>-(h.promo+h.loy)],['7535 Refunds (excl. tax)',h=>-(h.adj+h.cx)-h.rtax]];
const GK=['7350/7340 Delivery comm + processing','7570 Marketing comm + ads - credits','4905 Promotions','7535 Refunds'];
const glM=(s,mo)=>GK.reduce((a,k)=>a+((s.G.feeM[mo]||{})[k]||0),0);

// Summary
let ws=wb.addWorksheet('Summary',{views:[{state:'frozen',xSplit:1,ySplit:4}]});
title(ws,'FARE Grubhub vs R365 GL: Summary by Location (excl. sales tax)','Grubhub transactions 12/30/25 to 9/21/26 (payouts 1/2/26 to 9/25/26) vs R365 GL through 9/30/26, account 1103 Grubhub Deposit Clearing. All sales, refunds and fees exclude sales tax.');
let r=table(ws,4,[['Location','loc','t',30],['Orders','orders','i',9],['Food Subtotal','sub'],['Delivery Charge','dlv'],['Tips','tip'],['Grubhub Sales excl. Tax','salesEx'],['Refunds excl. Tax','refEx'],['Grubhub Fees, Marketing & Promos','feesEx'],['Grubhub Net Payouts','net'],['Fees + Refunds % of Sales','pct','p'],['GL Sales 4105 + 4206 (same dates)','glSales'],['GL DSS to 1103 excl. Tax (same dates)','dssEx'],['Sales Variance (GL DSS - Grubhub)','Bex'],['GL Fee JEs excl. 2270','feesGLex'],['Fee Variance (Grubhub - GL)','Cex'],['AJE Over / (Under) Reclass','ajeX'],['Payouts Not Yet Deposited','undep'],['Deposit With No Payout','udHere'],['Unpaid Week 9/22-9/30 (DSS less 9/27 fee JE)','Aex'],['Left at FARE Holding','hold'],['1103 Balance excl. Sales Tax 9/30','endEx']],S.map(s=>({...s,hold:s.loc==='FARE Holding LLC'?s.end:0,loc:short(s.loc),pct:s.salesEx?(s.feesEx+s.refEx)/s.salesEx:null})));
note(ws,r+1,'Net payout = Sales excl. tax - Refunds excl. tax - Fees, exactly, for every store.');
note(ws,r+2,'1103 excl. sales tax = Sales Variance + Fee Variance - AJE Over Reclass + Payouts Not Deposited - Deposit With No Payout + Unpaid Week + Left at Holding. Every location ties to the penny. Fees are compared through the 9/20 weekly entries (Grubhub file ends 9/21); the 9/27 entries net against the unpaid week.');
note(ws,r+3,OAKNOTE);
note(ws,r+5,'Sales tax is not analyzed. The posted 1103 balance of '+f2(SA.reduce((a,x)=>a+x.end,0))+' includes '+f2(SA.reduce((a,x)=>a+x.taxAll,0))+' of sales tax that the DSS posts into 1103 with each sale; it is removed here.');
note(ws,r+4,'GL DSS excl. tax: the DSS posts tax into 1103 with the sale, so its tax is removed at that day\'s Grubhub tax rate for the store (store average on days with no Grubhub orders). GL 4105/4206 is shown for reference only; it is booked at Toast menu prices.');

// Fees by category
ws=wb.addWorksheet('Fees by Category',{views:[{state:'frozen',xSplit:1,ySplit:4}]});
title(ws,'Grubhub Fees vs GL Fee Entries by Category (excl. sales tax)','Grubhub side 12/30/25-9/21/26 by transaction date. GL side = every JE with Grubhub in the number through the 9/20 weekly entries, excluding the 8/31 AJE and the 2270 sales tax lines.');
const fc=[['Location','loc','t',26]];FK.forEach(([k,fn],i)=>{fc.push(['GH '+k,d=>r2(fn(d.h))]);fc.push(['GL '+GK[i],d=>r2(d.feeA[GK[i]]||0)]);fc.push(['Var '+k.split(' ')[0],d=>r2(fn(d.h)-(d.feeA[GK[i]]||0))])});
fc.push(['GH Total',d=>r2(d.feesEx+d.refEx)],['GL Total','feesGLex'],['Total Var','Cex']);
r=table(ws,4,fc,stores.map(s=>({...s,loc:short(s.loc)})));
note(ws,r+1,'Mapping (ties exactly for Logan Square May): 7350 = delivery commission + processing fee (7340 when coded as catering); 7570 = marketing commission + Miscellaneous ad charges - GH credits; 4905 = merchant funded promotions + loyalty; 7535 = order adjustments + cancellations.');
note(ws,r+2,'GL 7535 is booked at the full refund, so the 7535 variance absorbs the small tax on refunds where it was booked.');
note(ws,r+3,OAKNOTE);

// Grubhub fee detail by field
ws=wb.addWorksheet('Grubhub Fee Detail',{views:[{state:'frozen',xSplit:1,ySplit:4}]});
title(ws,'Grubhub Fees by Field and Location (excl. sales tax)','Signs flipped so fees show positive. GH credits show negative.');
table(ws,4,[['Location','loc','t',26],['Sales excl. Tax','sales'],['Marketing Commission','com'],['Delivery Commission','dcom'],['Processing Fee','proc'],['Ads / Misc Charges','misc'],['GH Credits','cred'],['Merchant Promotions','promo'],['Loyalty','loy'],['Refunds excl. Tax','ref'],['Total','tot'],['% of Sales','pct','p']],stores.filter(s=>s.salesEx).map(s=>{const h=s.h;const o={loc:short(s.loc),com:-h.com,dcom:-h.dcom,proc:-h.proc,misc:-h.misc,cred:-h.cred,promo:-h.promo,loy:-h.loy,ref:s.refEx};for(const k in o)if(k!=='loc')o[k]=r2(o[k]);o.tot=r2(Object.entries(o).filter(([k])=>k!=='loc').reduce((a,[,v])=>a+v,0));o.sales=s.salesEx;o.pct=o.tot/s.salesEx;return o}));

// Monthly
ws=wb.addWorksheet('Monthly by Location',{views:[{state:'frozen',xSplit:2,ySplit:4}]});
title(ws,'Monthly Sales and Fees by Location (excl. sales tax)','Grubhub by transaction month vs GL DSS by date and GL fee JEs by JE month. Monthly fee variances that reverse the next month are timing; the running total is what matters.');
const mos=['2025-12','2026-01','2026-02','2026-03','2026-04','2026-05','2026-06','2026-07','2026-08','2026-09'];
const dssM={};for(const x of g1103)if(x.num.startsWith('NJ')&&x.date>='2025-12-30'&&x.date<='2026-09-21'){const k=x.loc+'|'+x.date.slice(0,7);dssM[k]=(dssM[k]||0)+x.dr-x.cr}
const mr=[];for(const s of stores){let cum=0;for(const mo of mos){const h=s.x.ghM[mo];const gross=h?h.mt-h.adj-h.cx:0;const sales=h?gross-h.tax:0;const fees=h?gross-h.net+h.wt-h.rtax:0;const fee=glM(s,mo);const k=s.loc+'|'+mo;const dss=(dssM[k]||0)-(dtM[k]||0);cum+=fees-fee;
 if(!gross&&!dss&&!fee)continue;mr.push({loc:short(s.loc),mo,orders:h?h.orders:0,sales:r2(sales),dss:r2(dss),sv:r2(dss-sales),ded:r2(fees),fee:r2(fee),fv:r2(fees-fee),cum:r2(cum),net:r2(h?h.net:0)})}}
table(ws,4,[['Location','loc','t',26],['Month','mo','t',10],['Orders','orders','i',9],['GH Sales excl. Tax','sales'],['GL DSS excl. Tax','dss'],['Sales Var','sv'],['GH Fees + Refunds excl. Tax','ded'],['GL Fees Booked excl. 2270','fee'],['Fee Var','fv'],['Cumulative Fee Var','cum','x'],['GH Net Payout','net']],mr);

// Daily sales variances
ws=wb.addWorksheet('Daily Sales Variances',{views:[{state:'frozen',ySplit:4}]});
title(ws,'Days Where GL DSS Differs From Grubhub by More Than $25 (excl. tax, after tips)','Grubhub sales excl. tax (subtotal + delivery + tip, before refunds) by transaction date vs the DSS debit to 1103 that day less its tax.');
const D={};const k2=(l,d)=>l+'|'+d;const nd=()=>({dss:0,gh:0,tip:0,n:0,big:0});
for(const x of g1103)if(x.num.startsWith('NJ')&&x.date>='2025-12-30'&&x.date<='2026-09-21'&&x.loc!==OAK){const k=k2(x.loc,x.date);D[k]=D[k]||nd();D[k].dss+=(x.dr-x.cr)*(1-dayR(x.loc,x.date))}
for(const q of rows)if(q.transaction_type==='Prepaid Order'){const k=k2(M[q.grubhub_store_id],q.transaction_date);D[k]=D[k]||nd();const ex=q.subtotal+q.self_delivery_charge+q.tip;D[k].gh+=ex;D[k].tip+=q.tip;D[k].n++;D[k].big=Math.max(D[k].big,ex)}
const dv=Object.entries(D).map(([k,v])=>{const [l,d]=k.split('|');return{loc:short(l),date:d,n:v.n,gh:r2(v.gh),tip:r2(v.tip),dss:r2(v.dss),v:r2(v.dss-v.gh),vx:r2(v.dss-v.gh+v.tip),big:r2(v.big)}}).filter(x=>Math.abs(x.vx)>25).sort((a,b)=>a.loc<b.loc?-1:a.loc>b.loc?1:a.date<b.date?-1:1);
table(ws,4,[['Location','loc','t',26],['Date','date','t',12],['GH Orders','n','i',9],['GH Sales excl. Tax','gh'],['GH Tips','tip'],['GL DSS excl. Tax','dss'],['Variance','v'],['Variance Excl Tips','vx'],['Largest GH Order','big','x']],dv);

// Refunds
ws=wb.addWorksheet('Refunds',{views:[{state:'frozen',ySplit:4}]});
title(ws,'Grubhub Order Adjustments and Cancellations (excl. sales tax)','Every refund row in the Grubhub file. These should hit 7535 Third Party Refunds.');
const rf=rows.filter(q=>/Adjust|Cancel/.test(q.transaction_type)).map(q=>({loc:short(M[q.grubhub_store_id]),store:q.store_name.trim(),date:q.transaction_date,pdate:q.payout_date,type:q.transaction_type,order:q.order_number,amt:r2(-(q.subtotal+q.self_delivery_charge+q.tip))})).sort((a,b)=>a.loc<b.loc?-1:a.loc>b.loc?1:a.date<b.date?-1:1);
table(ws,4,[['Location','loc','t',26],['Grubhub Store','store','t',30],['Trans Date','date','t',12],['Payout Date','pdate','t',12],['Type','type','t',16],['Order #','order','t',18],['Refund excl. Tax','amt']],rf);

// Payouts
ws=wb.addWorksheet('Payouts vs Deposits',{views:[{state:'frozen',ySplit:4}]});
title(ws,'Every Grubhub Payout and Its R365 Bank Deposit','Matched on exact amount within 14 days. Deposit Location shows where R365 recorded it.');
const pr=pays.filter(p=>p.store!==OAK).sort((a,b)=>a.store<b.store?-1:a.store>b.store?1:a.date<b.date?-1:1).map(p=>{const t=depOf[p.i];return{loc:short(p.store),store:p.name,gh:p.gh,date:p.date,ptype:p.ptype,from:p.min,to:p.max,amt:p.amt,dnum:t?t.d.num:'',ddate:t?t.d.date:'',dloc:t?short(t.d.loc):'NOT DEPOSITED',damt:t?t.d.amt:0,flag:!t?'Not deposited':t.d.loc!==p.store?'Posted to '+short(t.d.loc):''}});
table(ws,4,[['Location','loc','t',26],['Grubhub Store','store','t',30],['GH Store ID','gh','t',11],['Payout Date','date','t',12],['Payout Type','ptype','t',11],['Trans From','from','t',12],['Trans To','to','t',12],['Payout','amt'],['Deposit #','dnum','t',11],['Deposit Date','ddate','t',12],['Deposit Location','dloc','t',22],['Deposit Amount','damt'],['Flag','flag','t',22]],pr);
r=pr.length+8;ws.getRow(r).getCell(1).value='Deposits in 1103 with no matching Grubhub payout';ws.getRow(r).font={bold:true};
table(ws,r+1,[['Location','loc','t'],['Deposit #','num','t'],['Date','date','t'],['Comment','comment','t'],['Amount','amt']],ud.map(d=>({...d,loc:short(d.loc)})));

// AJE
ws=wb.addWorksheet('8.31 AJE vs Holding Deps');
title(ws,'8/31 GrubHub AJE vs Grubhub Deposits Actually Posted to FARE Holding','The AJE cleared each store close to its 8/31 balance instead of moving the deposits that belonged to it, so unbooked fees landed in Holding.');
const bal831=l=>g1103.filter(x=>x.loc===l&&x.date<='2026-08-31'&&x.num!=='GrubHub AJE').reduce((s,x)=>s+x.dr-x.cr,0);
r=table(ws,4,[['Location','loc','t',26],['Store 1103 Balance 8/31 Before AJE','b'],['AJE Credit to Store','aje'],['Store Deposits Posted to Holding','dh'],['AJE Over / (Under) Reclass','x']],stores.filter(s=>s.aje||s.depHolding).map(s=>({loc:short(s.loc),b:r2(bal831(s.loc)),aje:s.aje,dh:s.depHolding,x:s.ajeX})));
note(ws,r+1,`Oak Park is the largest piece: AJE credit ${f2(oak.aje)} vs Oak Park deposits at Holding ${f2(oak.depHolding)}, because its fees were never booked.`);

// Sept weekly JEs
ws=wb.addWorksheet('Sept Weekly Fee JEs');
title(ws,'September Weekly Grubhub Fee Entries (excl. 2270 sales tax lines)','One entry per store per Grubhub week, 9/6 through 9/27. 9/1-9/21 ties to Grubhub within 29.38 in total (tax on refunds booked in 7535). The 9/27 entries cover 9/22-9/28, past the end of the Grubhub file.');
{const {load}=require('./glparse');const sl=[];for(const a of ['7350','7340','7570','7560','4905','7535'])for(const x of load('gl'+a+'.csv'))if(/grub/i.test(x.num)&&x.date>='2026-09-01')sl.push({date:x.date,loc:short(x.loc),a,comment:x.comment,amt:r2(x.dr-x.cr)});sl.sort((p,q)=>p.date<q.date?-1:p.date>q.date?1:p.loc<q.loc?-1:1);
table(ws,4,[['JE Date','date','t',12],['Location','loc','t',22],['Account','a','t',9],['Comment','comment','t',44],['Amount','amt']],sl);}

// Stores
ws=wb.addWorksheet('Store Mapping');title(ws,'Grubhub Stores Mapped to R365 Locations','');
const sm={};for(const q of rows){const k=q.grubhub_store_id;sm[k]=sm[k]||{gh:k,name:q.store_name.trim(),addr:q.street_address.trim(),loc:short(M[k]),n:0,sales:0,net:0,first:'9',last:'0'};const o=sm[k];o.n++;if(q.transaction_type==='Prepaid Order')o.sales+=q.subtotal+q.self_delivery_charge+q.tip;o.net+=q.merchant_net_total;o.first=q.transaction_date<o.first?q.transaction_date:o.first;o.last=q.transaction_date>o.last?q.transaction_date:o.last}
table(ws,4,[['GH Store ID','gh','t',11],['Grubhub Name','name','t',32],['Address','addr','t',28],['R365 Location','loc','t',26],['Rows','n','i',8],['Sales excl. Tax','sales'],['Net Payouts','net'],['First Trans','first','t',12],['Last Trans','last','t',12]],Object.values(sm).map(o=>({...o,sales:r2(o.sales),net:r2(o.net)})));

module.exports={wb,OUT,short,f2,stores,dv,S,table,title,note,oak,OAKNOTE,FK,GK};
if(require.main===module){require('./disc.js')}
