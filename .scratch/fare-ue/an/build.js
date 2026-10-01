const ExcelJS=require('exceljs');const {S}=require('./summary');const {rows}=require('./periods');const {L,r2,g1111}=require('./model');const ue=require('./ue.json');const M=require('./map');
const OUT="C:/Users/trici/OCRA/TML's Files - General/Downloads/FARE UberEats Analysis 12.29.25 to 9.27.26.xlsx";
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
const stores=S.filter(s=>s.loc!=='FARE Holding LLC');
const f2=n=>n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});

// Summary
let ws=wb.addWorksheet('Summary',{views:[{state:'frozen',xSplit:1,ySplit:4}]});
title(ws,'FARE Uber Eats vs R365 GL: Summary by Location','Uber payouts 1/5/26 to 9/21/26 (sales weeks 12/29/25 to 9/20/26) vs GL 12/29/25 to 9/27/26, account 1111 Uber Eats Deposit Clearing. The 12/29/25 payouts cover December activity booked in QB and are excluded.');
let r=table(ws,4,[['Location','loc','t',30],['Orders','orders','i',9],['Uber Gross Sales (incl tax)','ueInc'],['GL DSS Sales (same periods)','glPaid'],['Sales Variance (GL - Uber)','B'],['  Pre-2026 sales in catch-up payouts','preWin'],['  Operating Sales Variance','Bops'],['Uber Deductions (fees, mktg, refunds, taxes)','ded'],['GL Fees Booked (Jan-Aug JEs)','fees'],['Fee Variance (Uber - GL)','C'],['  Sept deductions not yet booked','sept'],['  Other Fee Variance','Cops'],['Uber Payouts','pay'],['Deposits Recorded in R365','dep'],['Payouts Not Deposited / Deposit Var','D'],['GL DSS After Last Payout (unpaid)','A'],['Corrected 1111 Balance 9/27','corrected'],['1111 Balance As Posted 9/27','posted'],['Location Posting Difference','postDiff']],S.map(s=>({...s,loc:short(s.loc)})));
note(ws,r+1,'Corrected balance = Sales Variance + GL DSS unpaid + Fee Variance + Payouts Not Deposited, with every deposit assigned to the store whose payout it was. Holding carries the 12/31/25 QB opening balance of 92,465.91.');
note(ws,r+2,'Location Posting Difference comes from Jan-Jun Uber deposits booked to FARE Holding LLC and the 8/31/26 UberEats AJE, whose amounts do not match the deposits by store.');

// Discrepancies
const P=rows.filter(x=>x.loc!=='FARE Holding LLC');
const undep=P.filter(x=>!x.depNum);const undepT=r2(undep.reduce((a,b)=>a+b.payout,0));
const las=P.find(x=>x.depNum==='BD002517');
const g=l=>S.find(s=>s.loc===l);
const sept=r2(stores.reduce((a,s)=>a+s.sept,0));
const moved=r2(S.reduce((a,s)=>a+Math.abs(s.postDiff),0)/2);
const bwLV=g('FARE Lakeview (W Diversey)').bw,bwOT=g('FARE Old Town').bw,bwLS=g('FARE Logan Square').bw;
const opVar=P.filter(x=>!/Lakeview|Logan/.test(x.loc)&&!(x.start==='2025-12-29'&&!/Old Town/.test(x.loc))&&Math.abs(x.salesVar)>100).map(x=>`${short(x.loc)} ${x.pdate} payout: ${f2(x.salesVar)}`).join('; ');
const D=[
 ['High','Lake + LaSalle','Deposit does not match payout',las.depVar,`Deposit ${las.depNum} on ${las.depDate} is ${f2(las.depAmt)}; Uber's 7/13 payout (ref ${las.ref}) is ${f2(las.payout)}.`,'Pull the 7/14 bank line. If the bank shows 21,200.43, correct the deposit. If it shows 23,698.74, find the second Uber payment inside it.'],
 ['High','Logan Square, Oak Park, Lake + LaSalle, Sterling','Payouts with no deposit in R365',undepT,undep.map(x=>`${short(x.loc)} ${x.pdate} ${f2(x.payout)}`).join('; '),'Record the 9/15 and 9/22 Uber deposits for these four stores. Their other payouts deposit normally, so check the bank feed for the account they land in.'],
 ['High','Holding + all stores','Uber deposits booked to Holding',moved,'Jan-Jun Uber deposits (342,860.57) posted to FARE Holding LLC. The 8/31 UberEats AJE moved 263,750.90 but not at the per-store deposit amounts, leaving Holding at 6,361.53 and store balances off (see Summary, Location Posting Difference).','Post the Proposed Reclass JE after review.'],
 ['High','Lakeview','DSS Uber sales run about 25% above Uber',g('FARE Lakeview (W Diversey)').Bops,'Every Lakeview week since opening: GL DSS Third Party Delivery is 23-25% above Uber Sales (incl tax), e.g. week of 9/14 GL 4,986.21 vs Uber 3,990.32.','Check the Lakeview POS payment mapping to 1111. Another delivery channel, tips, or a marked-up menu may be posting as Uber. Sales are likely overstated by this amount.'],
 ['Medium','Lakeview, Old Town, Logan Square','Backup withholding (24%) taken by Uber',r2(-(bwLV+bwOT+bwLS)),`Lakeview ${f2(-bwLV)} and Old Town ${f2(-bwOT)} are withheld on every payout; Logan Square ${f2(-bwLS)} on the 2/2 catch-up only. August booked it to 2270 Sales Tax Payable.`,'Uber withholds 24% when it lacks a valid W-9/TIN. Submit W-9s for Lakeview and Old Town. Backup withholding is federal income tax credit, so 2270 is the wrong account; decide the account before booking more.'],
 ['Medium','All stores','September fees not booked',sept,'No UberEats Fees entries after 8/31. Deductions on the 9/8, 9/14 and 9/21 payouts sit in 1111.','Post the September fee entries.'],
 ['Medium','Logan Square','DSS runs about 0.8% above Uber',g('FARE Logan Square').Bops,'Logan Square GL DSS exceeds Uber Sales (incl tax) by 60-160 per week, every week.','Compare one week of Toast Uber orders to Uber order detail; likely tips or an item price difference.'],
 ['Medium','Logan Square, Lake + LaSalle, Riverside, Franklin, NW, Oak Park','Pre-2026 sales in 2026 payouts',r2(stores.reduce((a,s)=>a+s.preWin,0)),'Logan Square 2/2 (244,420.21 gross, 5,725 orders) and Lake + LaSalle 7/13 (42,183.85 gross, 1,080 orders) were catch-up payouts that include sales before GL DSS starts. The 1/5 payouts include 12/29-12/31 sales not in R365.','These collections relieve the 92,465.91 QB opening receivable sitting at Holding. Tie it to the QB 12/31 detail by store, then move it to the stores (estimate on the Reclass tab).'],
 ['Low','Other stores','Individual payout sales variances',null,opVar,'Review on the Payout Periods tab (Flag column).'],
 ['Low','Riverside / Logan Square','Feb fee JE cross-location',21.68,'The 2/28 UberEats Fees JE credits 1111 Riverside 21.68 less, and Logan Square 21.68 more, than the expense lines by location.','Move 21.68 of the 1111 credit from Logan Square to Riverside.'],
 ['Low','Old Town, Sterling','Uber payouts above listed components',52.13,'Old Town 8/10 payout exceeds its listed components by 48.13; Sterling 7/27 by 4.00 (likely tips or a misc adjustment Uber does not break out).','Informational.'],
 ['Info','Riverside','Store closed',null,'Last Uber payout 7/27/26 and no DSS after 7/26. 1111 Riverside is at 0.00 as posted; the corrected balance is -702.31 because the AJE moved 702.31 more than its deposits.','Covered by the Reclass JE.'],
];
ws=wb.addWorksheet('Discrepancies',{views:[{state:'frozen',ySplit:4}]});
title(ws,'Discrepancies and Actions','Ranked by priority. Amounts in dollars.');
table(ws,4,[['Priority','p','t',9],['Location','l','t',26],['Issue','i','t',32],['Amount','a','',14],['Detail','d','t',80],['Action','x','t',70]],D.map(d=>({p:d[0],l:d[1],i:d[2],a:d[3],d:d[4],x:d[5]})),{total:false});
ws.getColumn(4).numFmt=money;for(let i=5;i<=5+D.length;i++){ws.getRow(i).alignment={wrapText:true,vertical:'top'}}

// Fees & Refunds
const cat=(l,from,to)=>{const o={mf:0,mkt:0,cb:0,mft:0,bw:0,ded:0};for(const p of ue){if(M[p['Store Name']]!==l||p.date<from||p.date>to)continue;const v=k=>p[k]||0;o.mf+=v('Marketplace Fee')+v('Tax on Marketplace Fee')+v('Delivery Network Fee')+v('Tax on Delivery Network Fee')+v('Order Processing Fee')+v('Bag Fee');o.mkt+=v('Offers on items (incl. tax)')+v('Delivery Offer Redemptions (incl. tax)')+v('Offer Redemption Fee')+v('Marketing Adjustment')+v('Other payments')+v('Capital payments')+v('Container Deposit Fee');o.cb+=v('Chargeback Amount (incl. tax)')+v('Price Adjustments (incl. tax)');o.mft+=v('Marketplace Facilitator Tax')+v('Marketplace Facilitator Tax Adjustment');o.bw+=v('Backup Withholding Tax')+v('Garnishment');o.ded+=v('Sales (incl. tax)')-v('Total payout')}for(const k in o)o[k]=k==='ded'?r2(o[k]):r2(-o[k]);o.unl=r2(o.ded-o.mf-o.mkt-o.cb-o.mft-o.bw);return o};
ws=wb.addWorksheet('Fees & Refunds',{views:[{state:'frozen',xSplit:1,ySplit:4}]});
title(ws,'Uber Deductions vs GL Fee Accounts by Location','Uber side: payouts 1/5/26 to 8/31/26 (the months the Jan-Aug UberEats Fees JEs cover), shown as positive expense. GL side: UberEats Fees JE lines only. Sept columns are payouts 9/8 to 9/21, not yet booked.');
const FR=stores.map(s=>{const a=cat(s.loc,'2026-01-05','2026-08-31'),b=cat(s.loc,'2026-09-01','2026-09-30'),gv=k=>r2(s.fee[k]||0);return{loc:short(s.loc),mf:a.mf,g7380:gv('7380'),v1:r2(a.mf-gv('7380')),mkt:a.mkt,g7630:gv('7630'),g4905:gv('4905'),v2:r2(a.mkt-gv('7630')-gv('4905')),cb:a.cb,g7535:gv('7535'),v3:r2(a.cb-gv('7535')),mft:a.mft,bw:a.bw,g2270:gv('2270'),v4:r2(a.mft+a.bw-gv('2270')),unl:a.unl,tot:a.ded,gtot:s.fees,vt:r2(a.ded-s.fees),smf:b.mf,smkt:b.mkt,scb:b.cb,stax:r2(b.mft+b.bw),stot:b.ded}});
r=table(ws,4,[['Location','loc','t',26],['Uber Marketplace Fees','mf'],['GL 7380 Uber Eats Third Party Fees','g7380'],['Var','v1',,11],['Uber Marketing & Promotions (offers, offer fees, mktg adj, ads)','mkt'],['GL 7630 Uber Eats Marketing','g7630'],['GL 4905 Third Party App Marketing Comps','g4905'],['Var','v2',,11],['Uber Refunds / Chargebacks','cb'],['GL 7535 Third Party Refunds','g7535'],['Var','v3',,11],['Uber Marketplace Facilitator Tax','mft'],['Uber Backup Withholding','bw'],['GL 2270 Sales Tax Payable','g2270'],['Var','v4',,11],['Uber Unlisted Items','unl',,11],['Uber Total Deductions','tot'],['GL Total Fees Booked','gtot'],['Total Var','vt',,11],['Sept: Marketplace Fees','smf'],['Sept: Marketing','smkt'],['Sept: Refunds','scb'],['Sept: MF Tax + Backup W/H','stax'],['Sept: Total Not Booked','stot']],FR);
note(ws,r+1,'Catch-up payouts (Logan Square 2/2, Lake + LaSalle 7/13, Riverside 2/2) carry deductions on pre-2026 sales, so their Uber columns run above the GL. Other variances are timing: the JEs follow Uber monthly statements (order date), the payouts run by week.');

// Uber detail
ws=wb.addWorksheet('Uber Detail by Location',{views:[{state:'frozen',xSplit:1,ySplit:4}]});
title(ws,'Uber Eats Payout Detail by Location','All payouts 1/5/26 to 9/21/26 as reported by Uber. Deductions negative.');
const UD=stores.map(s=>{const u=L[s.loc].ue;return{loc:short(s.loc),n:u.n,orders:u.orders,exc:u.exc,tax:u.tax,inc:u.inc,cb:u.cb,offers:u.offers,orf:u.orf,madj:u.madj,mf:u.mf,other:u.other,mft:u.mft,bw:u.bw,unl:r2(u.payout-u.inc-u.cb-u.offers-u.orf-u.madj-u.mf-u.other-u.mft-u.bw),pay:u.payout,mfp:-u.mf/u.exc,tk:u.payout/u.inc}});
table(ws,4,[['Location','loc','t',26],['Payouts','n','i',9],['Orders','orders','i',9],['Sales (excl tax)','exc'],['Tax on Sales','tax'],['Sales (incl tax)','inc'],['Refunds / Chargebacks','cb'],['Offers on Items','offers'],['Offer Redemption Fee','orf'],['Marketing Adjustment','madj'],['Marketplace Fee','mf'],['Other Payments (ads)','other'],['Marketplace Facilitator Tax','mft'],['Backup Withholding','bw'],['Unlisted Items','unl'],['Total Payout','pay'],['Marketplace Fee % of Sales excl tax','mfp','p',11],['Payout % of Gross','tk','p',11]],UD);

// Payout periods
ws=wb.addWorksheet('Payout Periods',{views:[{state:'frozen',xSplit:2,ySplit:4}]});
title(ws,'Uber Payout Periods vs GL DSS and Deposits','Each payout covers the Mon-Sun weeks since the prior payout (the 7/13 payout covers two weeks). GL DSS = 1111 Third Party Delivery lines in that range.');
const PR=P.map(x=>({...x,loc:short(x.loc),pct:x.ueInc?x.salesVar/x.ueInc:0,depLoc:short(x.depLoc),flag:[Math.abs(x.salesVar)>25&&Math.abs(x.salesVar/(x.ueInc||1))>0.02?'Sales var':'',!x.depNum?'No deposit':x.depVar?'Deposit var':'',x.depLoc&&x.depLoc!==x.loc?'Deposit at '+short(x.depLoc):''].filter(Boolean).join('; ')}));
table(ws,4,[['Location','loc','t',24],['Payout Date','pdate','t',11],['Period Start','start','t',11],['Period End','end','t',11],['Orders','orders','i',8],['Uber Sales (incl tax)','ueInc'],['GL DSS','glDss'],['Sales Var (GL - Uber)','salesVar'],['Var %','pct','p',8],['Uber Deductions','ded'],['Uber Payout','payout'],['Deposit #','depNum','t',11],['Deposit Date','depDate','t',11],['Deposit Amount','depAmt'],['Deposit Var','depVar'],['Deposit Posted To','depLoc','t',24],['Payout Ref','ref','t',18],['Flag','flag','t',34]],PR);
ws.autoFilter={from:'A4',to:'R4'};

// Rollforward
ws=wb.addWorksheet('1111 Rollforward',{views:[{state:'frozen',xSplit:1,ySplit:4}]});
title(ws,'1111 Uber Eats Deposit Clearing Rollforward, as Posted','GL 12/1/25 to 9/27/26. Every location opens at 0.00 before the 12/31/25 QB conversion entry.');
table(ws,4,[['Location','loc','t',30],['QB Opening 12/31/25','open'],['DSS Uber Sales','glDssAll'],['UberEats Fees JEs','f'],['Bank Deposits','dd'],['8/31 UberEats AJE','aje'],['Balance 9/27/26','posted']],S.map(s=>({...s,loc:short(s.loc),f:-s.fees,dd:-s.glDepPosted})));

// Reclass
ws=wb.addWorksheet('Proposed Reclass JE');
title(ws,'Proposed 1111 Location Reclass (for review)','Moves each location to its corrected balance by assigning the Jan-Jun Holding deposits to the store whose payout they were, net of the 8/31 AJE. Nets to zero.');
const RJ=S.filter(s=>Math.abs(s.postDiff)>0.004).map(s=>({acct:'1111 - Uber Eats Deposit Clearing',loc:short(s.loc),dr:s.postDiff<0?-s.postDiff:0,cr:s.postDiff>0?s.postDiff:0,c:'reclass Uber deposits to payout store'}));
r=table(ws,4,[['Account','acct','t',34],['Location','loc','t',30],['Debit','dr'],['Credit','cr'],['Comment','c','t',40]],RJ);
ws.getRow(r+2).getCell(1).value='After this reclass Holding holds the 92,465.91 QB opening balance. Estimated pre-2026 net Uber cash collected in 2026 (payout x pre-2026 share of gross):';ws.getRow(r+2).font={bold:true};
const est=P.filter(x=>x.start==='2025-12-29'&&x.salesVar<-1&&!/Lakeview|Old Town/.test(x.loc)).map(x=>({loc:short(x.loc),pd:x.pdate,pre:-x.salesVar,share:-x.salesVar/x.ueInc,net:r2(x.payout*(-x.salesVar/x.ueInc))}));
const r3=table(ws,r+3,[['Location','loc','t',30],['Payout Date','pd','t',12],['Pre-2026 Gross Sales','pre'],['Share of Payout','share','p'],['Est. Pre-2026 Net','net']],est);
ws.getColumn(4).numFmt=money;est.forEach((e,i)=>ws.getRow(r+4+i).getCell(4).numFmt=pct);
note(ws,r3+1,'Tie this to the QB 12/31/25 Uber receivable by store before clearing Holding. The estimate leaves '+f2(92465.91-est.reduce((a,b)=>a+b.net,0))+' of the opening balance unexplained.');

// raw
ws=wb.addWorksheet('Uber Payouts (raw)');const keys=Object.keys(ue[0]).filter(k=>!['file','date'].includes(k));ws.addRow(['R365 Location',...keys]);hdr(ws,1);ue.forEach(o=>ws.addRow([short(M[o['Store Name']]),...keys.map(k=>o[k])]));ws.columns.forEach((c,i)=>c.width=i<2?30:13);ws.autoFilter={from:'A1',to:{row:1,column:keys.length+1}};
ws=wb.addWorksheet('GL 1111 Detail');ws.addRow(['Location','Date','Type','Number','Comment','Debit','Credit']);hdr(ws,1);g1111.forEach(x=>ws.addRow([short(x.loc),x.date,x.type,x.num,x.comment,x.dr,x.cr]));ws.columns.forEach((c,i)=>c.width=[30,11,14,14,40,12,12][i]);[6,7].forEach(i=>ws.getColumn(i).numFmt=money);ws.autoFilter='A1:G1';

wb.xlsx.writeFile(OUT).then(()=>{console.log('wrote',OUT);console.log(JSON.stringify({undepT,las:las.depVar,sept,moved,bw:[bwLV,bwOT,bwLS],opVar,est,estSum:r2(est.reduce((a,b)=>a+b.net,0))},null,1))});
