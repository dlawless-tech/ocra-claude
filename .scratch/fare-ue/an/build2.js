const ExcelJS=require('exceljs');const {S}=require('./summary');const {rows}=require('./periods');const {g1111,r2}=require('./model');const {load}=require('./glparse');const ue=require('./ue.json');const M=require('./map');
const OUT="C:/Users/trici/OCRA/TML's Files - General/Downloads/FARE UberEats Review 12.29.25 to 9.27.26.xlsx";
const wb=new ExcelJS.Workbook();wb.calcProperties.fullCalcOnLoad=true;
const money='#,##0.00;[Red](#,##0.00);-',pct='0.0%',dfmt='m/d/yy';
const short=l=>(l||'').replace(/^FARE /,'');
const D=s=>{if(!s)return null;const [y,m,d]=s.split('-').map(Number);return new Date(Date.UTC(y,m-1,d))};
const hdr=(ws,r,h=48)=>{const row=ws.getRow(r);row.font={bold:true,color:{argb:'FFFFFFFF'}};row.alignment={wrapText:true,vertical:'middle',horizontal:'center'};row.eachCell(c=>c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1F4E78'}});row.height=h};
const totRow=(ws,r)=>{const row=ws.getRow(r);row.font={bold:true};row.eachCell(c=>c.border={top:{style:'thin'},bottom:{style:'double'}})};
const title=(ws,t,sub)=>{ws.getCell('A1').value=t;ws.getCell('A1').font={bold:true,size:14};if(sub){ws.getCell('A2').value=sub;ws.getCell('A2').font={italic:true,color:{argb:'FF555555'}}}};
const note=(ws,r,t)=>{ws.getRow(r).getCell(1).value=t;ws.getRow(r).font={italic:true}};
const fmtCols=(ws,spec)=>spec.forEach(([w,f],i)=>{const c=ws.getColumn(i+1);c.width=w;if(f)c.numFmt=f});
const inputFill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFF2CC'}};
const ORDER=['Summary','Discrepancies','Fees & Refunds','Uber Detail by Location','Payout Periods','1111 Rollforward','Proposed Reclass JE','Uber Payouts','GL 1111 Detail','GL Fee JE Lines'];ORDER.forEach(n=>wb.addWorksheet(n));const sh=(n,o)=>{const w=wb.getWorksheet(n);if(o&&o.views)w.views=o.views;return w};
const LOCS=S.map(s=>short(s.loc));
const sumTotals=(ws,r,first,last,cols)=>{ws.getRow(r).getCell(1).value='Total';for(const c of cols){const L=ws.getColumn(c).letter;ws.getRow(r).getCell(c).value={formula:`SUM(${L}${first}:${L}${last})`}}totRow(ws,r)};

// ---------- data tabs ----------
// Uber Payouts (grouped)
const U=sh('Uber Payouts',{views:[{state:'frozen',ySplit:1}]});
U.addRow(['Location','Payout Date','Uber Store Name','Payout Ref','Orders','Sales (excl tax)','Tax on Sales','Sales (incl tax)','Refunds / Chargebacks','Offers on Items','Offer Redemption Fee','Marketing Adjustment','Marketplace Fee','Other Payments (ads)','MF Tax','Backup Withholding','Unlisted Items','Total Payout','In Window']);hdr(U,1);
const v=(o,ks)=>ks.reduce((s,k)=>s+(o[k]||0),0);
ue.slice().sort((a,b)=>short(M[a['Store Name']]).localeCompare(short(M[b['Store Name']]))||(a.date<b.date?-1:1)).forEach((o,i)=>{const r=i+2;U.addRow([short(M[o['Store Name']]),D(o.date),o['Store Name'],o['Payout reference ID'],o['Order Count'],o['Sales (excl. tax)'],o['Tax on Sales'],o['Sales (incl. tax)'],r2(v(o,['Chargeback Amount (incl. tax)','Price Adjustments (incl. tax)'])),r2(v(o,['Offers on items (incl. tax)','Delivery Offer Redemptions (incl. tax)'])),o['Offer Redemption Fee'],o['Marketing Adjustment'],r2(v(o,['Marketplace Fee','Tax on Marketplace Fee','Delivery Network Fee','Tax on Delivery Network Fee','Order Processing Fee','Bag Fee'])),r2(v(o,['Other payments','Capital payments','Container Deposit Fee'])),r2(v(o,['Marketplace Facilitator Tax','Marketplace Facilitator Tax Adjustment'])),r2(v(o,['Backup Withholding Tax','Garnishment'])),{formula:`ROUND(R${r}-SUM(H${r}:P${r}),2)`},o['Total payout'],{formula:`B${r}>=DATE(2026,1,5)`}])});
fmtCols(U,[[26],[11,dfmt],[34],[18],[8,'#,##0'],...Array(13).fill([13,money]),[9]]);U.autoFilter='A1:S1';
const UN=ue.length+1;const ur=c=>`'Uber Payouts'!$${c}$2:$${c}$${UN}`;

// GL 1111 Detail
const G=sh('GL 1111 Detail',{views:[{state:'frozen',ySplit:1}]});
G.addRow(['Location','Date','Type','Number','Comment','Debit','Credit','Net (Dr - Cr)','Category']);hdr(G,1,32);
const catOf=x=>x.num.startsWith('NJ')?'DSS':x.num==='UberEats Fees'?'Fees JE':x.num==='UberEats AJE'?'AJE':x.type==='Bank Deposit'?'Bank Deposit':x.num==='Balance Sheet'?'QB Opening':'Other';
g1111.forEach((x,i)=>{const r=i+2;G.addRow([short(x.loc),D(x.date),x.type,x.num,x.comment,x.dr,x.cr,{formula:`F${r}-G${r}`},catOf(x)])});
fmtCols(G,[[30],[11,dfmt],[14],[14],[40],[12,money],[12,money],[13,money],[13]]);G.autoFilter='A1:I1';
const GN=g1111.length+1;const gr=c=>`'GL 1111 Detail'!$${c}$2:$${c}$${GN}`;

// GL Fee Lines
const F=sh('GL Fee JE Lines',{views:[{state:'frozen',ySplit:1}]});
F.addRow(['Account','Location','Date','Number','Comment','Debit','Credit','Net (Dr - Cr)']);hdr(F,1,32);
let fr=2;for(const [a,f] of [['7380 - Uber Eats Third Party Fees','gl7380.csv'],['7630 - Uber Eats Marketing','gl7630.csv'],['4905 - Third Party App Marketing Comps','gl4905.csv'],['7535 - Third Party Refunds','gl7535.csv'],['2270 - Sales Tax Payable','gl2270.csv']])for(const x of load(f))if(x.num==='UberEats Fees'&&x.date<='2026-09-27'){F.addRow([a,short(x.loc),D(x.date),x.num,x.comment,x.dr,x.cr,{formula:`F${fr}-G${fr}`}]);fr++}
fmtCols(F,[[36],[30],[11,dfmt],[14],[24],[12,money],[12,money],[13,money]]);F.autoFilter='A1:H1';
const fN=fr-1;const flr=c=>`'GL Fee JE Lines'!$${c}$2:$${c}$${fN}`;

// Payout Periods
const P=sh('Payout Periods',{views:[{state:'frozen',xSplit:2,ySplit:4}]});
title(P,'Uber Payout Periods vs GL DSS and Deposits','Each payout covers the Mon-Sun weeks since the prior payout (7/13 covers two weeks). GL DSS sums the DSS lines on GL 1111 Detail for the period. Yellow cells are judgment calls.');
P.getRow(4).values=['Location','Payout Date','Period Start','Period End','Orders','Uber Sales (incl tax)','GL DSS','Sales Var (GL - Uber)','Var %','Pre-2026 Sales?','Pre-2026 Portion','Uber Deductions','Uber Payout','Deposit #','Deposit Date','Deposit Amount','Deposit Posted To','Deposit Var','Payout Ref','Flag'];hdr(P,4);
const PR=rows.filter(x=>x.loc!=='FARE Holding LLC');const prRow={};
PR.forEach((x,i)=>{const r=i+5;prRow[x.ref]=r;const pre=x.start==='2025-12-29'&&x.salesVar<-1&&!/Lakeview|Old Town/.test(x.loc);
 const flag=[Math.abs(x.salesVar)>25&&Math.abs(x.salesVar/(x.ueInc||1))>0.02?'Sales var':'',!x.depNum?'No deposit':x.depVar?'Deposit var':'',x.depLoc&&x.depLoc!==x.loc?'Deposit at '+short(x.depLoc):''].filter(Boolean).join('; ');
 P.getRow(r).values=[short(x.loc),D(x.pdate),D(x.start),D(x.end),x.orders,x.ueInc,{formula:`SUMIFS(${gr('H')},${gr('A')},A${r},${gr('I')},"DSS",${gr('B')},">="&C${r},${gr('B')},"<="&D${r})`,result:x.glDss},{formula:`G${r}-F${r}`},{formula:`IF(F${r}=0,0,H${r}/F${r})`},pre?'Y':'N',{formula:`IF(J${r}="Y",H${r},0)`},{formula:`F${r}-M${r}`},x.payout,x.depNum,D(x.depDate),x.depAmt,short(x.depLoc),{formula:`P${r}-M${r}`},x.ref,flag];
 if(pre)P.getRow(r).getCell(10).fill=inputFill;});
const PN=PR.length+4;sumTotals(P,PN+1,5,PN,[5,6,7,8,11,12,13,16,18]);
fmtCols(P,[[24],[10,dfmt],[10,dfmt],[10,dfmt],[8,'#,##0'],[13,money],[13,money],[13,money],[8,pct],[9],[13,money],[13,money],[13,money],[11],[10,dfmt],[13,money],[22],[12,money],[18],[30]]);
P.autoFilter={from:'A4',to:'T4'};
const pr=c=>`'Payout Periods'!$${c}$5:$${c}$${PN}`;

// ---------- Summary ----------
const Sm=sh('Summary',{views:[{state:'frozen',xSplit:1,ySplit:5}]});
title(Sm,'FARE Uber Eats vs R365 GL: Summary by Location','Uber payouts 1/5/26 to 9/21/26 (sales weeks 12/29/25 to 9/20/26) vs GL account 1111 Uber Eats Deposit Clearing. The 12/29/25 payouts cover December activity booked in QB and are excluded.');
Sm.getCell('A3').value='GL through';Sm.getCell('B3').value=D('2026-09-27');Sm.getCell('B3').numFmt=dfmt;Sm.getCell('B3').fill=inputFill;Sm.getCell('C3').value='Fees booked through';Sm.getCell('D3').value=D('2026-08-31');Sm.getCell('D3').numFmt=dfmt;Sm.getCell('D3').fill=inputFill;
Sm.getRow(5).values=['Location','Orders','Uber Gross Sales (incl tax)','GL DSS Sales (same periods)','Sales Variance (GL - Uber)','Pre-2026 sales in catch-up payouts','Operating Sales Variance','Uber Deductions (fees, mktg, refunds, taxes)','GL Fees Booked (UberEats Fees JEs)','Fee Variance (Uber - GL)','Sept deductions not yet booked','Other Fee Variance','Uber Payouts','Deposits Recorded in R365','Payouts Not Deposited / Deposit Var','Last Paid Period End','GL DSS After Last Paid Period','Corrected 1111 Balance','1111 Balance As Posted','Location Posting Difference'];hdr(Sm,5,60);
const smRow={};
S.forEach((s,i)=>{const r=i+6;const l=short(s.loc);smRow[l]=r;Sm.getRow(r).values=[l,
 {formula:`SUMIFS(${ur('E')},${ur('A')},A${r},${ur('S')},TRUE)`,result:s.orders},
 {formula:`SUMIFS(${pr('F')},${pr('A')},A${r})`,result:s.ueInc},
 {formula:`SUMIFS(${pr('G')},${pr('A')},A${r})`,result:s.glPaid},
 {formula:`D${r}-C${r}`,result:s.B},
 {formula:`SUMIFS(${pr('K')},${pr('A')},A${r})`,result:s.preWin},
 {formula:`E${r}-F${r}`,result:s.Bops},
 {formula:`SUMIFS(${pr('L')},${pr('A')},A${r})`,result:s.ded},
 {formula:`-SUMIFS(${gr('H')},${gr('A')},A${r},${gr('I')},"Fees JE",${gr('B')},"<="&$B$3)`,result:s.fees},
 {formula:`H${r}-I${r}`,result:s.C},
 {formula:`SUMIFS(${pr('L')},${pr('A')},A${r},${pr('B')},">"&$D$3)`,result:s.sept},
 {formula:`J${r}-K${r}`,result:s.Cops},
 {formula:`SUMIFS(${pr('M')},${pr('A')},A${r})`,result:s.pay},
 {formula:`SUMIFS(${pr('P')},${pr('A')},A${r})`,result:s.dep},
 {formula:`M${r}-N${r}`,result:s.D},
 {formula:`IF(COUNTIF(${pr('A')},A${r})=0,"",_xlfn.MAXIFS(${pr('D')},${pr('A')},A${r}))`},
 {formula:`IF(P${r}="",0,SUMIFS(${gr('H')},${gr('A')},A${r},${gr('I')},"DSS",${gr('B')},">"&P${r},${gr('B')},"<="&$B$3))`,result:s.A},
 {formula:`E${r}+Q${r}+J${r}+O${r}+SUMIFS(${gr('H')},${gr('A')},A${r},${gr('I')},"QB Opening")`,result:s.corrected},
 {formula:`SUMIFS(${gr('H')},${gr('A')},A${r},${gr('B')},"<="&$B$3)`,result:s.posted},
 {formula:`S${r}-R${r}`,result:s.postDiff}]});
const SN=S.length+5;sumTotals(Sm,SN+1,6,SN,[2,3,4,5,6,7,8,9,10,11,12,13,14,15,17,18,19,20]);
fmtCols(Sm,[[30],[9,'#,##0'],...Array(13).fill([13,money]),[11,dfmt],[13,money],[13,money],[13,money],[13,money]]);Sm.getColumn(2).numFmt='#,##0';
Sm.getRow(SN+2).getCell(1).value='Check: corrected total less posted total (should be 0.00)';Sm.getRow(SN+2).getCell(18).value={formula:`R${SN+1}-S${SN+1}`};Sm.getRow(SN+2).getCell(18).numFmt=money;Sm.getRow(SN+2).font={bold:true,color:{argb:'FF006100'}};
note(Sm,SN+4,'Corrected balance = Sales Variance + GL DSS after last paid period + Fee Variance + Payouts Not Deposited, with each deposit assigned to the store whose payout it was (Payout Periods tab). Holding carries the 12/31/25 QB opening balance.');
note(Sm,SN+5,'Location Posting Difference: Jan-Jun Uber deposits were booked to FARE Holding LLC, and the 8/31/26 UberEats AJE did not move them at the per-store deposit amounts.');

// ---------- Fees & Refunds ----------
const FRs=sh('Fees & Refunds',{views:[{state:'frozen',xSplit:1,ySplit:5}]});
title(FRs,'Uber Deductions vs GL Fee Accounts by Location','Uber: payouts 1/5/26 through the fees-booked date on Summary, as positive expense. GL: UberEats Fees JE lines (GL Fee JE Lines tab). Sept columns: later payouts, not yet booked.');
FRs.getRow(5).values=['Location','Uber Marketplace Fees','GL 7380 Uber Eats Third Party Fees','Var','Uber Marketing & Promotions (offers, offer fees, mktg adj, ads)','GL 7630 Uber Eats Marketing','GL 4905 Third Party App Marketing Comps','Var','Uber Refunds / Chargebacks','GL 7535 Third Party Refunds','Var','Uber MF Tax','Uber Backup Withholding','GL 2270 Sales Tax Payable','Var','Uber Unlisted Items','Uber Total Deductions','GL Total Fees Booked','Total Var','Sept: Marketplace Fees','Sept: Marketing','Sept: Refunds','Sept: MF Tax + Backup W/H','Sept: Total Not Booked'];hdr(FRs,5,60);
const stores=LOCS.filter(l=>l!=='Holding LLC');
stores.forEach((l,i)=>{const r=i+6;const win=`${ur('A')},$A${r},${ur('B')},">="&DATE(2026,1,5),${ur('B')},"<="&Summary!$D$3`;const sep=`${ur('A')},$A${r},${ur('B')},">"&Summary!$D$3`;
 const us=(c,w)=>`-SUMIFS(${ur(c)},${w})`;const gl=a=>`SUMIFS(${flr('H')},${flr('B')},$A${r},${flr('A')},"${a}*")`;
 FRs.getRow(r).values=[l,{formula:us('M',win)},{formula:gl('7380')},{formula:`B${r}-C${r}`},{formula:`${us('J',win)}${us('K',win)}${us('L',win)}${us('N',win)}`},{formula:gl('7630')},{formula:gl('4905')},{formula:`E${r}-F${r}-G${r}`},{formula:us('I',win)},{formula:gl('7535')},{formula:`I${r}-J${r}`},{formula:us('O',win)},{formula:us('P',win)},{formula:gl('2270')},{formula:`L${r}+M${r}-N${r}`},{formula:us('Q',win)},{formula:`B${r}+E${r}+I${r}+L${r}+M${r}+P${r}`},{formula:`Summary!I${smRow[l]}`},{formula:`Q${r}-R${r}`},{formula:us('M',sep)},{formula:`${us('J',sep)}${us('K',sep)}${us('L',sep)}${us('N',sep)}`},{formula:us('I',sep)},{formula:`${us('O',sep)}${us('P',sep)}`},{formula:`T${r}+U${r}+V${r}+W${r}`}]});
const FN=stores.length+5;sumTotals(FRs,FN+1,6,FN,Array.from({length:23},(_,i)=>i+2));
fmtCols(FRs,[[26],...Array(23).fill([13,money])]);
note(FRs,FN+3,'Catch-up payouts (Logan Square 2/2, Lake + LaSalle 7/13, Riverside 2/2) carry deductions on pre-2026 sales, so their Uber columns run above the GL. Other variances are timing: the JEs follow Uber monthly statements (order date), payouts run by week.');
note(FRs,FN+4,'Total Var here ties to Summary Fee Variance less Sept deductions. Unlisted Items: Uber payout above its listed components (Old Town 8/10 48.13, Sterling 7/27 4.00).');

// ---------- Uber Detail ----------
const UDs=sh('Uber Detail by Location',{views:[{state:'frozen',xSplit:1,ySplit:5}]});
title(UDs,'Uber Eats Payout Detail by Location','All payouts 1/5/26 to 9/21/26 as reported by Uber (Uber Payouts tab). Deductions negative.');
UDs.getRow(5).values=['Location','Payouts','Orders','Sales (excl tax)','Tax on Sales','Sales (incl tax)','Refunds / Chargebacks','Offers on Items','Offer Redemption Fee','Marketing Adjustment','Marketplace Fee','Other Payments (ads)','MF Tax','Backup Withholding','Unlisted Items','Total Payout','Marketplace Fee % of Sales excl tax','Payout % of Gross'];hdr(UDs,5,60);
stores.forEach((l,i)=>{const r=i+6;const w=`${ur('A')},$A${r},${ur('S')},TRUE`;const cols=['E','F','G','H','I','J','K','L','M','N','O','P','Q','R'];
 UDs.getRow(r).values=[l,{formula:`COUNTIFS(${w})`},...cols.map(c=>({formula:`SUMIFS(${ur(c)},${w})`})),{formula:`IF(D${r}=0,0,-K${r}/D${r})`},{formula:`IF(F${r}=0,0,P${r}/F${r})`}]});
const UDN=stores.length+5;sumTotals(UDs,UDN+1,6,UDN,Array.from({length:15},(_,i)=>i+2));UDs.getRow(UDN+1).getCell(17).value={formula:`-K${UDN+1}/D${UDN+1}`};UDs.getRow(UDN+1).getCell(18).value={formula:`P${UDN+1}/F${UDN+1}`};
fmtCols(UDs,[[26],[8,'#,##0'],[9,'#,##0'],...Array(13).fill([13,money]),[11,pct],[11,pct]]);

// ---------- Rollforward ----------
const RF=sh('1111 Rollforward',{views:[{state:'frozen',xSplit:1,ySplit:5}]});
title(RF,'1111 Uber Eats Deposit Clearing Rollforward, as Posted','GL 12/1/25 through the GL-through date. Every location opens at 0.00 before the 12/31/25 QB conversion entry.');
const cats=['QB Opening','DSS','Fees JE','Bank Deposit','AJE'];RF.getRow(5).values=['Location','QB Opening 12/31/25','DSS Uber Sales','UberEats Fees JEs','Bank Deposits','8/31 UberEats AJE','Balance'];hdr(RF,5,36);
LOCS.forEach((l,i)=>{const r=i+6;RF.getRow(r).values=[l,...cats.map(c=>({formula:`SUMIFS(${gr('H')},${gr('A')},$A${r},${gr('I')},"${c}",${gr('B')},"<="&Summary!$B$3)`})),{formula:`SUM(B${r}:F${r})`}]});
const RN=LOCS.length+5;sumTotals(RF,RN+1,6,RN,[2,3,4,5,6,7]);fmtCols(RF,[[30],...Array(6).fill([14,money])]);

// ---------- Reclass ----------
const RJ=sh('Proposed Reclass JE');
title(RJ,'Proposed 1111 Location Reclass (for review, not posted)','Moves each location to its corrected balance (Summary, Location Posting Difference). Nets to zero.');
fmtCols(RJ,[[34],[30],[14,money],[14,money],[40]]);RJ.getRow(4).values=['Account','Location','Debit','Credit','Comment'];hdr(RJ,4,30);
const rjl=S.filter(s=>Math.abs(s.postDiff)>0.004);
rjl.forEach((s,i)=>{const r=i+5;const l=short(s.loc);RJ.getRow(r).values=['1111 - Uber Eats Deposit Clearing',l,{formula:`MAX(-Summary!T${smRow[l]},0)`},{formula:`MAX(Summary!T${smRow[l]},0)`},'reclass Uber deposits to payout store']});
let rN=rjl.length+4;sumTotals(RJ,rN+1,5,rN,[3,4]);
let r0=rN+4;RJ.getRow(r0).getCell(1).value='After the reclass Holding keeps the 92,465.91 QB opening balance. Estimated pre-2026 net Uber cash collected in 2026:';RJ.getRow(r0).font={bold:true};
RJ.getRow(r0+1).values=['Location','Payout Date','Pre-2026 Gross Sales','Share of Payout','Est. Pre-2026 Net'];hdr(RJ,r0+1,30);
const est=PR.filter(x=>x.start==='2025-12-29'&&x.salesVar<-1&&!/Lakeview|Old Town/.test(x.loc));
est.forEach((x,i)=>{const r=r0+2+i,p=prRow[x.ref];RJ.getRow(r).values=[short(x.loc),D(x.pdate),{formula:`-'Payout Periods'!K${p}`},{formula:`C${r}/'Payout Periods'!F${p}`},{formula:`ROUND('Payout Periods'!M${p}*D${r},2)`}];RJ.getRow(r).getCell(2).numFmt=dfmt;RJ.getRow(r).getCell(4).numFmt=pct;RJ.getRow(r).getCell(5).numFmt=money});
const eN=r0+1+est.length;sumTotals(RJ,eN+1,r0+2,eN,[3,5]);
RJ.getRow(eN+2).values=['QB opening balance at Holding',null,null,null,{formula:`Summary!R${smRow['Holding LLC']}`}];RJ.getRow(eN+3).values=['Unexplained (tie to QB 12/31 detail)',null,null,null,{formula:`E${eN+2}-E${eN+1}`}];RJ.getRow(eN+3).font={bold:true};[eN+1,eN+2,eN+3].forEach(q=>RJ.getRow(q).getCell(5).numFmt=money);


// ---------- Discrepancies ----------
const Ds=sh('Discrepancies',{views:[{state:'frozen',ySplit:4}]});
title(Ds,'Discrepancies and Actions','Ranked by priority. Amounts link to the tab named in Source.');
Ds.getRow(4).values=['Priority','Location','Issue','Amount','Source','Detail','Action'];hdr(Ds,4,30);
const las=PR.find(x=>x.depNum==='BD002517');const ok=l=>smRow[l];
const lvU=`SUMIFS(${ur('P')},${ur('A')},"Lakeview (W Diversey)")`,otU=`SUMIFS(${ur('P')},${ur('A')},"Old Town")`,lsU=`SUMIFS(${ur('P')},${ur('A')},"Logan Square")`;
const DI=[
 ['High','Lake + LaSalle','Deposit does not match payout',{formula:`'Payout Periods'!R${prRow[las.ref]}`},'Payout Periods',`Deposit BD002517 on 7/14 is 23,698.74. Uber's 7/13 payout (ref ${las.ref}) is 21,200.43.`,'Pull the 7/14 bank line. If it shows 21,200.43, correct the deposit. If 23,698.74, find the second Uber payment inside it.'],
 ['High','Logan Square, Oak Park, Lake + LaSalle, Sterling','Payouts with no deposit in R365',{formula:`SUMIFS(${pr('M')},${pr('N')},"")`},'Payout Periods (Flag: No deposit)','9/14 and 9/21 payouts: Logan Square 3,457.26 + 4,062.27; Oak Park 1,131.18 + 783.69; Lake + LaSalle 586.47 + 454.82; Sterling 144.59 + 21.48.','Record the 9/15 and 9/22 Uber deposits. The other stores deposited those weeks, so check the bank feed these four land in.'],
 ['High','Holding + all stores','Uber deposits booked to Holding',{formula:`'Proposed Reclass JE'!C${rN+1}`},'Proposed Reclass JE','Jan-Jun Uber deposits (342,860.57) posted to FARE Holding LLC. The 8/31 UberEats AJE moved 263,750.90, but not at the per-store deposit amounts. Holding sits at 6,361.53 and each store is off by its Location Posting Difference.','Review and post the Proposed Reclass JE.'],
 ['High','Lakeview','DSS Uber sales run about 25% above Uber',{formula:`Summary!G${ok('Lakeview (W Diversey)')}`},'Summary / Payout Periods','Every week since opening, GL DSS is 23-25% above Uber Sales (incl tax). Week of 9/14: GL 4,986.21 vs Uber 3,990.32.','Check the Lakeview POS payment mapping to 1111. Another delivery channel, tips, or marked-up menu prices may be posting as Uber. Sales likely overstated by this amount.'],
 ['Medium','Lakeview, Old Town, Logan Square','Backup withholding (24%) taken by Uber',{formula:`-(${lvU}+${otU}+${lsU})`},'Uber Payouts','Lakeview 2,793.40 and Old Town 3,717.94 withheld on every payout. Logan Square 4,082.33 on the 2/2 catch-up only. August booked it to 2270 Sales Tax Payable.','Uber withholds 24% without a valid W-9/TIN: submit W-9s for Lakeview and Old Town. It is a federal income tax credit, so 2270 is likely the wrong account. Decide the account before booking more.'],
 ['Medium','All stores','September fees not booked',{formula:`Summary!K${SN+1}`},'Summary','No UberEats Fees entries after 8/31. Deductions on the 9/8, 9/14 and 9/21 payouts sit in 1111.','Post the September fee entries.'],
 ['Medium','Logan Square','DSS runs about 0.8% above Uber',{formula:`Summary!G${ok('Logan Square')}`},'Summary / Payout Periods','GL DSS exceeds Uber Sales (incl tax) by 60-160 every week.','Compare one week of Toast Uber orders to Uber order detail. Likely tips or an item price difference.'],
 ['Medium','Logan Square, LaSalle, Riverside, Franklin, NW, Oak Park','Pre-2026 sales in 2026 payouts',{formula:`Summary!F${SN+1}`},'Summary / Proposed Reclass JE','Logan Square 2/2 (244,420.21 gross, 5,725 orders) and Lake + LaSalle 7/13 (42,183.85 gross, 1,080 orders) were catch-up payouts including sales before R365. The 1/5 payouts include 12/29-12/31 sales not in R365.','These collections relieve the 92,465.91 QB opening receivable at Holding. Tie to the QB 12/31 detail by store, then move it to the stores (estimate on the Reclass tab).'],
 ['Low','Other stores','Single-payout sales variances',null,'Payout Periods (Flag: Sales var)','Riverside 7/27 (120.42); Northwestern 7/20 (319.39); Oak Park 1/12 325.32 and 1/19 208.75 (offset by 1/5); Old Town 8/10 280.12 (first week).','Review each on the Payout Periods tab.'],
 ['Low','Riverside / Logan Square','Feb fee JE cross-location',21.68,'GL Fee JE Lines','The 2/28 UberEats Fees JE credits 1111 Riverside 21.68 less, and Logan Square 21.68 more, than their expense lines.','Move 21.68 of the 1111 credit from Logan Square to Riverside.'],
 ['Low','Old Town, Sterling','Uber payouts above listed components',{formula:`SUM(${ur('Q')})`},'Uber Payouts (Unlisted Items)','Old Town 8/10 by 48.13 and Sterling 7/27 by 4.00, likely tips or a misc adjustment Uber does not break out.','Informational.'],
];
DI.forEach((d,i)=>{const row=Ds.getRow(i+5);row.values=d;row.alignment={wrapText:true,vertical:'top'}});
fmtCols(Ds,[[9],[24],[28],[14,money],[22],[70],[60]]);

wb.xlsx.writeFile(OUT).then(()=>console.log('wrote',OUT,'rows',UN,GN,fN,PN));
