const ExcelJS=require('exceljs');const {S}=require('./summary');const {rows}=require('./periods');const {g1111,r2}=require('./model');const {load}=require('./glparse');const ue=require('./ue.json');const M=require('./map');
const OUT="C:/Users/trici/OCRA/TML's Files - General/Downloads/FARE Third Party Analysis/FARE UberEats Review 12.29.25 to 9.27.26.xlsx";
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
const ORDER=['Summary','Discrepancies','Fees & Refunds','Sales Tax (excluded)','Uber Detail by Location','Payout Periods','1111 Rollforward','Proposed Reclass JE','Uber Payouts','GL 1111 Detail','GL Fee JE Lines'];ORDER.forEach(n=>wb.addWorksheet(n));
const sh=(n,o)=>{const w=wb.getWorksheet(n);if(o&&o.views)w.views=o.views;return w};
const LOCS=S.map(s=>short(s.loc));const stores=LOCS.filter(l=>l!=='Holding LLC');
const sumTotals=(ws,r,first,last,cols)=>{ws.getRow(r).getCell(1).value='Total';for(const c of cols){const L=ws.getColumn(c).letter;ws.getRow(r).getCell(c).value={formula:`SUM(${L}${first}:${L}${last})`}}totRow(ws,r)};

// ---------- Uber Payouts ----------
const U=sh('Uber Payouts',{views:[{state:'frozen',ySplit:1}]});
U.addRow(['Location','Payout Date','Uber Store Name','Payout Ref','Orders','Sales (excl tax)','Tax on Sales','Sales (incl tax)','Refunds / Chargebacks (excl tax)','Offers on Items (excl tax)','Offer Redemption Fee','Marketing Adjustment','Marketplace Fee','Other Payments (ads)','Unlisted Items','Tax on Refunds & Offers','MF Tax','Backup Withholding','Total Payout','In Window']);hdr(U,1);
const v=(o,ks)=>ks.reduce((s,k)=>s+(o[k]||0),0);
ue.slice().sort((a,b)=>short(M[a['Store Name']]).localeCompare(short(M[b['Store Name']]))||(a.date<b.date?-1:1)).forEach((o,i)=>{const r=i+2;U.addRow([short(M[o['Store Name']]),D(o.date),o['Store Name'],o['Payout reference ID'],o['Order Count'],o['Sales (excl. tax)'],o['Tax on Sales'],o['Sales (incl. tax)'],
 r2(v(o,['Chargeback Amount','Price adjustments (excl. tax)'])),r2(v(o,['Offers on items (incl. tax)','Delivery Offer Redemptions (incl. tax)'])-v(o,['Tax On Offers on items','Tax On Delivery Offer Redemptions'])),o['Offer Redemption Fee'],o['Marketing Adjustment'],r2(v(o,['Marketplace Fee','Tax on Marketplace Fee','Delivery Network Fee','Tax on Delivery Network Fee','Order Processing Fee','Bag Fee'])),r2(v(o,['Other payments','Capital payments','Container Deposit Fee'])),
 {formula:`ROUND(S${r}-F${r}-G${r}-SUM(I${r}:N${r})-SUM(P${r}:R${r}),2)`},r2(v(o,['Tax on Chargeback Amount','Tax on Price Adjustments','Tax On Offers on items','Tax On Delivery Offer Redemptions'])),r2(v(o,['Marketplace Facilitator Tax','Marketplace Facilitator Tax Adjustment'])),r2(v(o,['Backup Withholding Tax','Garnishment'])),o['Total payout'],{formula:`B${r}>=DATE(2026,1,5)`}])});
fmtCols(U,[[26],[11,dfmt],[34],[18],[8,'#,##0'],...Array(14).fill([13,money]),[9]]);U.autoFilter='A1:T1';
const UN=ue.length+1;const ur=c=>`'Uber Payouts'!$${c}$2:$${c}$${UN}`;

// ---------- GL 1111 Detail ----------
const G=sh('GL 1111 Detail',{views:[{state:'frozen',ySplit:1}]});
G.addRow(['Location','Date','Type','Number','Comment','Debit','Credit','Net (Dr - Cr)','Category']);hdr(G,1,32);
const catOf=x=>x.num.startsWith('NJ')?'DSS':x.num==='UberEats Fees'?'Fees JE':x.num==='UberEats AJE'?'AJE':x.type==='Bank Deposit'?'Bank Deposit':x.num==='Balance Sheet'?'QB Opening':'Other';
g1111.forEach((x,i)=>{const r=i+2;G.addRow([short(x.loc),D(x.date),x.type,x.num,x.comment,x.dr,x.cr,{formula:`F${r}-G${r}`},catOf(x)])});
fmtCols(G,[[30],[11,dfmt],[14],[14],[40],[12,money],[12,money],[13,money],[13]]);G.autoFilter='A1:I1';
const GN=g1111.length+1;const gr=c=>`'GL 1111 Detail'!$${c}$2:$${c}$${GN}`;

// ---------- GL Fee JE Lines ----------
const F=sh('GL Fee JE Lines',{views:[{state:'frozen',ySplit:1}]});
F.addRow(['Account','Location','Date','Number','Comment','Debit','Credit','Net (Dr - Cr)']);hdr(F,1,32);
let fr=2;for(const [a,f] of [['7380 - Uber Eats Third Party Fees','gl7380.csv'],['7630 - Uber Eats Marketing','gl7630.csv'],['4905 - Third Party App Marketing Comps','gl4905.csv'],['7535 - Third Party Refunds','gl7535.csv'],['2270 - Sales Tax Payable','gl2270.csv']])for(const x of load(f))if(x.num==='UberEats Fees'&&x.date<='2026-09-27'){F.addRow([a,short(x.loc),D(x.date),x.num,x.comment,x.dr,x.cr,{formula:`F${fr}-G${fr}`}]);fr++}
fmtCols(F,[[36],[30],[11,dfmt],[14],[24],[12,money],[12,money],[13,money]]);F.autoFilter='A1:H1';
const fN=fr-1;const flr=c=>`'GL Fee JE Lines'!$${c}$2:$${c}$${fN}`;
const glAcct=(a,locRef,lo,hi='Summary!$D$3')=>`SUMIFS(${flr('H')},${flr('B')},${locRef},${flr('A')},"${a}*",${flr('C')},"<="&${hi}${lo?`,${flr('C')},">"&${lo}`:''})`;

// ---------- Payout Periods ----------
const P=sh('Payout Periods',{views:[{state:'frozen',xSplit:2,ySplit:4}]});
title(P,'Uber Payout Periods vs GL DSS and Deposits (excl. sales tax)','Each payout covers the Mon-Sun weeks since the prior payout (7/13 covers two weeks). GL DSS in 1111 is booked with tax; the ex-tax figure removes tax at the payout\'s own Uber tax rate. Yellow cells are judgment calls.');
P.getRow(4).values=['Location','Payout Date','Period Start','Period End','Orders','Uber Sales (excl tax)','Uber Tax on Sales','GL DSS (incl tax)','GL DSS excl tax (est)','GL DSS Tax (est)','Sales Var excl tax (GL - Uber)','Var %','Pre-2026 Sales?','Pre-2026 Portion','Uber Deductions excl tax','Uber Tax & Withholding Deducted','Uber Payout','Deposit #','Deposit Date','Deposit Amount','Deposit Posted To','Deposit Var','Payout Ref','Flag','Pre-2026 Deductions (est)'];hdr(P,4,60);
const PR=rows.filter(x=>x.loc!=='FARE Holding LLC');const prRow={};
const sumRef=(cols,r)=>cols.map(c=>`SUMIFS(${ur(c)},${ur('D')},$W${r})`).join('+');
PR.forEach((x,i)=>{const r=i+5;prRow[x.ref]=r;const o=ue.find(q=>q['Payout reference ID']===x.ref);const pre=x.start==='2025-12-29'&&x.salesVar<-1&&!/Lakeview|Old Town/.test(x.loc);
 const flag=[Math.abs(x.salesVar)>25&&Math.abs(x.salesVar/(x.ueInc||1))>0.02?'Sales var':'',!x.depNum?'No deposit':x.depVar?'Deposit var':'',x.depLoc&&x.depLoc!==x.loc?'Deposit at '+short(x.depLoc):''].filter(Boolean).join('; ');
 P.getRow(r).values=[short(x.loc),D(x.pdate),D(x.start),D(x.end),x.orders,o['Sales (excl. tax)'],o['Tax on Sales'],
  {formula:`SUMIFS(${gr('H')},${gr('A')},A${r},${gr('I')},"DSS",${gr('B')},">="&C${r},${gr('B')},"<="&D${r})`},{formula:`IF(F${r}+G${r}=0,H${r},ROUND(H${r}*F${r}/(F${r}+G${r}),2))`},{formula:`H${r}-I${r}`},{formula:`I${r}-F${r}`},{formula:`IF(F${r}=0,0,K${r}/F${r})`},pre?'Y':'N',{formula:`IF(M${r}="Y",K${r},0)`},
  {formula:`-(${sumRef(['I','J','K','L','M','N','O'],r)})`},{formula:`-(${sumRef(['P','Q','R'],r)})`},x.payout,x.depNum,D(x.depDate),x.depAmt,short(x.depLoc),{formula:`T${r}-Q${r}`},x.ref,flag,{formula:`IF(M${r}="Y",ROUND(O${r}*(-N${r}/F${r}),2),0)`}];
 if(pre)P.getRow(r).getCell(13).fill=inputFill;});
const PN=PR.length+4;sumTotals(P,PN+1,5,PN,[5,6,7,8,9,10,11,14,15,16,17,20,22,25]);
fmtCols(P,[[24],[10,dfmt],[10,dfmt],[10,dfmt],[8,'#,##0'],...Array(6).fill([13,money]),[8,pct],[9],[13,money],[13,money],[13,money],[13,money],[11],[10,dfmt],[13,money],[22],[12,money],[18],[30]]);
P.getColumn(25).width=13;P.getColumn(25).numFmt=money;P.autoFilter={from:'A4',to:'Y4'};
const pr=c=>`'Payout Periods'!$${c}$5:$${c}$${PN}`;

// ---------- Sales Tax (excluded) ----------
const TX=sh('Sales Tax (excluded)',{views:[{state:'frozen',xSplit:1,ySplit:5}]});
title(TX,'Sales Tax and Withholding, Excluded from the Analysis','1111 carries sales tax (DSS books Uber sales with tax; fee JEs clear Uber\'s tax deductions to 2270). This tab only carries that tax through so 1111 ties. Backup withholding is booked to 2270 with the tax, so it sits here too.');
TX.getRow(5).values=['Location','Uber Tax on Sales','GL DSS Tax (est)','Var (GL - Uber)','Uber MF Tax','Uber Tax on Refunds & Offers','Uber Backup Withholding','Uber Tax & Withholding Deducted','GL 2270 Booked (fee JEs through cutoff)','Var (Uber - GL)','GL DSS After Last Paid Period (incl tax)','  of which Tax (est)','GL 2270 Booked After Cutoff (unpaid week)','Net Tax Effect on 1111'];hdr(TX,5,60);
const txRow={};
LOCS.forEach((l,i)=>{const r=i+6;txRow[l]=r;const w=`${ur('A')},$A${r},${ur('T')},TRUE`;
 TX.getRow(r).values=[l,{formula:`SUMIFS(${pr('G')},${pr('A')},$A${r})`},{formula:`SUMIFS(${pr('J')},${pr('A')},$A${r})`},{formula:`C${r}-B${r}`},{formula:`-SUMIFS(${ur('Q')},${w})`},{formula:`-SUMIFS(${ur('P')},${w})`},{formula:`-SUMIFS(${ur('R')},${w})`},{formula:`E${r}+F${r}+G${r}`},{formula:glAcct('2270',`$A${r}`)},{formula:`H${r}-I${r}`},
  {formula:`IF(Summary!P${i+6}="",0,SUMIFS(${gr('H')},${gr('A')},$A${r},${gr('I')},"DSS",${gr('B')},">"&Summary!P${i+6},${gr('B')},"<="&Summary!$B$3))`},{formula:`IFERROR(ROUND(K${r}*B${r}/(B${r}+SUMIFS(${pr('F')},${pr('A')},$A${r})),2),0)`},{formula:glAcct('2270',`$A${r}`,'Summary!$D$3','Summary!$B$3')},{formula:`D${r}+J${r}+L${r}-M${r}`}]});
const TN=LOCS.length+5;sumTotals(TX,TN+1,6,TN,Array.from({length:13},(_,i)=>i+2));fmtCols(TX,[[30],...Array(13).fill([14,money])]);
note(TX,TN+3,'Uber collects and remits the sales tax on these orders (marketplace facilitator), so tax in 1111 should net to about zero. GL DSS tax is estimated at each payout\'s Uber tax rate, since 1111 does not split it.');

// ---------- Summary ----------
const Sm=sh('Summary',{views:[{state:'frozen',xSplit:1,ySplit:5}]});
title(Sm,'FARE Uber Eats vs R365 GL: Summary by Location (excl. sales tax)','Uber payouts 1/5/26 to 9/21/26 (sales weeks 12/29/25 to 9/20/26) vs GL account 1111 Uber Eats Deposit Clearing. Sales and fees exclude sales tax; the tax that passes through 1111 is on the Sales Tax (excluded) tab. 12/29/25 payouts (December, booked in QB) excluded.');
Sm.getCell('A3').value='GL through';Sm.getCell('B3').value=D('2026-09-27');Sm.getCell('B3').numFmt=dfmt;Sm.getCell('B3').fill=inputFill;Sm.getCell('C3').value='Fees compared through';Sm.getCell('D3').value=D('2026-09-20');Sm.getCell('D3').numFmt=dfmt;Sm.getCell('D3').fill=inputFill;
Sm.getRow(5).values=['Location','Orders','Uber Sales (excl tax)','GL DSS Sales excl tax (same periods)','Sales Variance (GL - Uber)','Pre-2026 sales in catch-up payouts','Operating Sales Variance','Uber Deductions excl tax (fees, mktg, refunds)','GL Fees Booked excl tax (through cutoff)','Fee Variance (Uber - GL)','  Pre-2026 deductions (catch-ups, est)','  Other Fee Variance','Uber Payouts','Deposits Recorded in R365','Payouts Not Deposited / Deposit Var','Last Paid Period End','GL DSS After Last Paid Period (excl tax)','GL Fees Booked After Cutoff (excl tax)','Sales Tax & Withholding Net (excluded tab)','Corrected 1111 Balance','1111 Balance As Posted','Location Posting Difference'];hdr(Sm,5,60);
const smRow={};
LOCS.forEach((l,i)=>{const r=i+6;smRow[l]=r;const t=txRow[l];Sm.getRow(r).values=[l,
 {formula:`SUMIFS(${ur('E')},${ur('A')},A${r},${ur('T')},TRUE)`},
 {formula:`SUMIFS(${pr('F')},${pr('A')},A${r})`},{formula:`SUMIFS(${pr('I')},${pr('A')},A${r})`},{formula:`D${r}-C${r}`},{formula:`SUMIFS(${pr('N')},${pr('A')},A${r})`},{formula:`E${r}-F${r}`},
 {formula:`SUMIFS(${pr('O')},${pr('A')},A${r})`},
 {formula:`-SUMIFS(${gr('H')},${gr('A')},A${r},${gr('I')},"Fees JE",${gr('B')},"<="&$D$3)-'Sales Tax (excluded)'!I${t}`},
 {formula:`H${r}-I${r}`},{formula:`SUMIFS(${pr('Y')},${pr('A')},A${r})`},{formula:`J${r}-K${r}`},
 {formula:`SUMIFS(${pr('Q')},${pr('A')},A${r})`},{formula:`SUMIFS(${pr('T')},${pr('A')},A${r})`},{formula:`M${r}-N${r}`},
 {formula:`IF(COUNTIF(${pr('A')},A${r})=0,"",_xlfn.MAXIFS(${pr('D')},${pr('A')},A${r}))`},
 {formula:`'Sales Tax (excluded)'!K${t}-'Sales Tax (excluded)'!L${t}`},
 {formula:`-SUMIFS(${gr('H')},${gr('A')},A${r},${gr('I')},"Fees JE",${gr('B')},">"&$D$3,${gr('B')},"<="&$B$3)-'Sales Tax (excluded)'!M${t}`},
 {formula:`'Sales Tax (excluded)'!N${t}`},
 {formula:`E${r}+J${r}+O${r}+Q${r}-R${r}+S${r}+SUMIFS(${gr('H')},${gr('A')},A${r},${gr('I')},"QB Opening")`},
 {formula:`SUMIFS(${gr('H')},${gr('A')},A${r},${gr('B')},"<="&$B$3)`},{formula:`U${r}-T${r}`}]});
const SN=LOCS.length+5;sumTotals(Sm,SN+1,6,SN,[2,3,4,5,6,7,8,9,10,11,12,13,14,15,17,18,19,20,21,22]);
fmtCols(Sm,[[30],[9,'#,##0'],...Array(13).fill([13,money]),[11,dfmt],...Array(6).fill([13,money])]);
Sm.getRow(SN+2).getCell(1).value='Check: corrected total less posted total (should be 0.00)';Sm.getRow(SN+2).getCell(20).value={formula:`T${SN+1}-U${SN+1}`};Sm.getRow(SN+2).getCell(20).numFmt=money;Sm.getRow(SN+2).font={bold:true,color:{argb:'FF006100'}};
note(Sm,SN+4,'Corrected balance = Sales Variance + Fee Variance + Payouts Not Deposited + (GL DSS after last paid period - fees booked for that week) + sales tax net, with each deposit assigned to the store whose payout it was. Holding carries the 12/31/25 QB opening balance.');
note(Sm,SN+5,'Fees compared through 9/20: fee JEs through 9/20 vs payouts through 9/21. The 9/27 fee JE belongs to the week paid 9/28, which is not in the Uber export, so it nets against that week\'s DSS. GL fees excl tax = the fee JEs\' 1111 credit less their 2270 lines.');
note(Sm,SN+6,'Location Posting Difference: Jan-Jun Uber deposits booked to FARE Holding LLC, and the 8/31/26 UberEats AJE did not move them at per-store deposit amounts.');

// ---------- Fees & Refunds ----------
const FRs=sh('Fees & Refunds',{views:[{state:'frozen',xSplit:1,ySplit:5}]});
title(FRs,'Uber Fees, Marketing and Refunds vs GL by Location (excl. sales tax)','Uber: payouts 1/5/26 to 9/21/26 (sales through the fees-compared date on Summary), as positive expense, tax removed. GL: UberEats Fees JE lines through that date (GL Fee JE Lines tab). Right-hand columns: the 9/27 fee JE, for the week Uber pays 9/28 (not in the export).');
FRs.getRow(5).values=['Location','Uber Marketplace Fees','GL 7380 Uber Eats Third Party Fees','Var','Uber Marketing & Promotions (offers, offer fees, mktg adj, ads)','GL 7630 Uber Eats Marketing','GL 4905 Third Party App Marketing Comps','Var','Uber Refunds / Chargebacks','GL 7535 Third Party Refunds','Var','Uber Unlisted Items','Uber Total excl tax','GL Total excl tax','Total Var','Week 9/21-9/27 GL: 7380 Fees','Week 9/21-9/27 GL: 7630 + 4905 Marketing','Week 9/21-9/27 GL: 7535 Refunds','Week 9/21-9/27 GL: Total'];hdr(FRs,5,60);
stores.forEach((l,i)=>{const r=i+6;const win=`${ur('A')},$A${r},${ur('B')},">="&DATE(2026,1,5),${ur('B')},"<="&(Summary!$D$3+3)`;const sep=`${ur('A')},$A${r},${ur('B')},">"&Summary!$D$3`;
 const us=(c,w)=>`-SUMIFS(${ur(c)},${w})`;
 FRs.getRow(r).values=[l,{formula:us('M',win)},{formula:glAcct('7380',`$A${r}`)},{formula:`B${r}-C${r}`},{formula:`${us('J',win)}${us('K',win)}${us('L',win)}${us('N',win)}`},{formula:glAcct('7630',`$A${r}`)},{formula:glAcct('4905',`$A${r}`)},{formula:`E${r}-F${r}-G${r}`},{formula:us('I',win)},{formula:glAcct('7535',`$A${r}`)},{formula:`I${r}-J${r}`},{formula:us('O',win)},{formula:`B${r}+E${r}+I${r}+L${r}`},{formula:`C${r}+F${r}+G${r}+J${r}`},{formula:`M${r}-N${r}`},{formula:glAcct('7380',`$A${r}`,'Summary!$D$3','Summary!$B$3')},{formula:glAcct('7630',`$A${r}`,'Summary!$D$3','Summary!$B$3')+'+'+glAcct('4905',`$A${r}`,'Summary!$D$3','Summary!$B$3')},{formula:glAcct('7535',`$A${r}`,'Summary!$D$3','Summary!$B$3')},{formula:`P${r}+Q${r}+R${r}`}]});
const FN=stores.length+5;sumTotals(FRs,FN+1,6,FN,Array.from({length:18},(_,i)=>i+2));fmtCols(FRs,[[26],...Array(18).fill([13,money])]);
note(FRs,FN+3,'Catch-up payouts (Logan Square 2/2, Lake + LaSalle 7/13, Riverside 2/2) carry deductions on pre-2026 sales, so their Uber columns run above the GL. Other variances are timing: the JEs follow Uber monthly statements (order date), payouts run by week.');
note(FRs,FN+4,'Riverside and Logan Square differ from Summary by 21.68 each: the Feb fee JE credits 1111 at a different location than its expense lines.');

// ---------- Uber Detail ----------
const UDs=sh('Uber Detail by Location',{views:[{state:'frozen',xSplit:1,ySplit:5}]});
title(UDs,'Uber Eats Payout Detail by Location (excl. sales tax)','All payouts 1/5/26 to 9/21/26 as reported by Uber, tax removed from sales, refunds and offers. Deductions negative. Tax columns at right are excluded from the analysis.');
UDs.getRow(5).values=['Location','Payouts','Orders','Sales (excl tax)','Refunds / Chargebacks','Offers on Items','Offer Redemption Fee','Marketing Adjustment','Marketplace Fee','Other Payments (ads)','Unlisted Items','Net before Tax & Withholding','Marketplace Fee % of Sales','Net % of Sales','Excluded: Tax on Sales','Excluded: Tax on Refunds & Offers','Excluded: MF Tax','Excluded: Backup Withholding','Total Payout'];hdr(UDs,5,60);
stores.forEach((l,i)=>{const r=i+6;const w=`${ur('A')},$A${r},${ur('T')},TRUE`;const s=c=>({formula:`SUMIFS(${ur(c)},${w})`});
 UDs.getRow(r).values=[l,{formula:`COUNTIFS(${w})`},s('E'),s('F'),s('I'),s('J'),s('K'),s('L'),s('M'),s('N'),s('O'),{formula:`SUM(D${r}:K${r})`},{formula:`IF(D${r}=0,0,-I${r}/D${r})`},{formula:`IF(D${r}=0,0,L${r}/D${r})`},s('G'),s('P'),s('Q'),s('R'),s('S')]});
const UDN=stores.length+5;sumTotals(UDs,UDN+1,6,UDN,[2,3,4,5,6,7,8,9,10,11,12,15,16,17,18,19]);UDs.getRow(UDN+1).getCell(13).value={formula:`-I${UDN+1}/D${UDN+1}`};UDs.getRow(UDN+1).getCell(14).value={formula:`L${UDN+1}/D${UDN+1}`};
fmtCols(UDs,[[26],[8,'#,##0'],[9,'#,##0'],...Array(9).fill([13,money]),[11,pct],[11,pct],...Array(5).fill([13,money])]);

// ---------- Rollforward ----------
const RF=sh('1111 Rollforward',{views:[{state:'frozen',xSplit:1,ySplit:5}]});
title(RF,'1111 Uber Eats Deposit Clearing Rollforward, as Posted','GL 12/1/25 through the GL-through date, as booked (DSS and fee JEs include sales tax). Every location opens at 0.00 before the 12/31/25 QB conversion entry.');
const cats=['QB Opening','DSS','Fees JE','Bank Deposit','AJE'];RF.getRow(5).values=['Location','QB Opening 12/31/25','DSS Uber Sales','UberEats Fees JEs','Bank Deposits','8/31 UberEats AJE','Balance'];hdr(RF,5,36);
LOCS.forEach((l,i)=>{const r=i+6;RF.getRow(r).values=[l,...cats.map(c=>({formula:`SUMIFS(${gr('H')},${gr('A')},$A${r},${gr('I')},"${c}",${gr('B')},"<="&Summary!$B$3)`})),{formula:`SUM(B${r}:F${r})`}]});
const RN=LOCS.length+5;sumTotals(RF,RN+1,6,RN,[2,3,4,5,6,7]);fmtCols(RF,[[30],...Array(6).fill([14,money])]);

// ---------- Reclass ----------
const RJ=sh('Proposed Reclass JE');
title(RJ,'Proposed 1111 Location Reclass (for review, not posted)','Moves each location to its corrected balance (Summary, Location Posting Difference). Nets to zero. Deposits only, so sales tax does not affect it.');
fmtCols(RJ,[[34],[30],[14,money],[14,money],[40]]);RJ.getRow(4).values=['Account','Location','Debit','Credit','Comment'];hdr(RJ,4,30);
const rjl=S.filter(s=>Math.abs(s.postDiff)>0.004);
rjl.forEach((s,i)=>{const r=i+5;const l=short(s.loc);RJ.getRow(r).values=['1111 - Uber Eats Deposit Clearing',l,{formula:`MAX(-Summary!V${smRow[l]},0)`},{formula:`MAX(Summary!V${smRow[l]},0)`},'reclass Uber deposits to payout store']});
let rN=rjl.length+4;sumTotals(RJ,rN+1,5,rN,[3,4]);
let r0=rN+4;RJ.getRow(r0).getCell(1).value='After the reclass Holding keeps the 92,465.91 QB opening balance. Estimated pre-2026 net Uber cash collected in 2026:';RJ.getRow(r0).font={bold:true};
RJ.getRow(r0+1).values=['Location','Payout Date','Pre-2026 Sales (excl tax)','Share of Payout','Est. Pre-2026 Net'];hdr(RJ,r0+1,30);
const est=PR.filter(x=>x.start==='2025-12-29'&&x.salesVar<-1&&!/Lakeview|Old Town/.test(x.loc));
est.forEach((x,i)=>{const r=r0+2+i,p=prRow[x.ref];RJ.getRow(r).values=[short(x.loc),D(x.pdate),{formula:`-'Payout Periods'!N${p}`},{formula:`C${r}/'Payout Periods'!F${p}`},{formula:`ROUND('Payout Periods'!Q${p}*D${r},2)`}];RJ.getRow(r).getCell(2).numFmt=dfmt;RJ.getRow(r).getCell(4).numFmt=pct;RJ.getRow(r).getCell(5).numFmt=money});
const eN=r0+1+est.length;sumTotals(RJ,eN+1,r0+2,eN,[3,5]);
RJ.getRow(eN+2).values=['QB opening balance at Holding',null,null,null,{formula:`Summary!T${smRow['Holding LLC']}`}];RJ.getRow(eN+3).values=['Unexplained (tie to QB 12/31 detail)',null,null,null,{formula:`E${eN+2}-E${eN+1}`}];RJ.getRow(eN+3).font={bold:true};[eN+1,eN+2,eN+3].forEach(q=>RJ.getRow(q).getCell(5).numFmt=money);

// ---------- Discrepancies ----------
const Ds=sh('Discrepancies',{views:[{state:'frozen',ySplit:4}]});
title(Ds,'Discrepancies and Actions (excl. sales tax)','Ranked by priority. Amounts link to the tab named in Source.');
Ds.getRow(4).values=['Priority','Location','Issue','Amount','Source','Detail','Action'];hdr(Ds,4,30);
const las=PR.find(x=>x.depNum==='BD002517');const wk=`'Payout Periods'`;
const DI=[
 ['High','Lake + LaSalle','Deposit does not match payout',{formula:`${wk}!V${prRow[las.ref]}`},'Payout Periods',`Deposit BD002517 on 7/14 is 23,698.74. Uber's 7/13 payout (ref ${las.ref}) is 21,200.43.`,'Pull the 7/14 bank line. If it shows 21,200.43, correct the deposit. If 23,698.74, find the second Uber payment inside it.'],
 ['High','Logan Square, Oak Park, Lake + LaSalle, Sterling','Payouts with no deposit in R365',{formula:`SUMIFS(${pr('Q')},${pr('R')},"")`},'Payout Periods (Flag: No deposit)','9/14 and 9/21 payouts: Logan Square 3,457.26 + 4,062.27; Oak Park 1,131.18 + 783.69; Lake + LaSalle 586.47 + 454.82; Sterling 144.59 + 21.48.','Record the 9/15 and 9/22 Uber deposits. The other stores deposited those weeks, so check the bank feed these four land in.'],
 ['High','Holding + all stores','Uber deposits booked to Holding',{formula:`'Proposed Reclass JE'!C${rN+1}`},'Proposed Reclass JE','Jan-Jun Uber deposits (342,860.57) posted to FARE Holding LLC. The 8/31 UberEats AJE moved 263,750.90, but not at the per-store deposit amounts. Holding sits at 6,361.53 and each store is off by its Location Posting Difference.','Review and post the Proposed Reclass JE.'],
 ['High','Lakeview','DSS Uber sales run about 25% above Uber',{formula:`Summary!G${smRow['Lakeview (W Diversey)']}`},'Summary / Payout Periods','Every week since opening, GL DSS runs 23-25% above Uber sales, before and after tax.','Check the Lakeview POS payment mapping to 1111. Another delivery channel, tips, or marked-up menu prices may be posting as Uber. Sales likely overstated by this amount.'],
 ['Medium','All stores','September fees not booked (excl tax)',{formula:`Summary!K${SN+1}`},'Summary','No UberEats Fees entries after 8/31. Fee, marketing and refund deductions on the 9/8, 9/14 and 9/21 payouts sit in 1111.','Post the September fee entries.'],
 ['Medium','Logan Square','DSS runs about 0.8% above Uber',{formula:`Summary!G${smRow['Logan Square']}`},'Summary / Payout Periods','GL DSS exceeds Uber sales every week.','Compare one week of Toast Uber orders to Uber order detail. Likely tips or an item price difference.'],
 ['Medium','Logan Square, LaSalle, Riverside, Franklin, NW, Oak Park','Pre-2026 sales in 2026 payouts',{formula:`Summary!F${SN+1}`},'Summary / Proposed Reclass JE','Logan Square 2/2 (5,725 orders) and Lake + LaSalle 7/13 (1,080 orders) were catch-up payouts including sales before R365. The 1/5 payouts include 12/29-12/31 sales not in R365.','These collections relieve the 92,465.91 QB opening receivable at Holding. Tie to the QB 12/31 detail by store, then move it to the stores (estimate on the Reclass tab).'],
 ['Medium','Lakeview, Old Town','Backup withholding (24%) taken by Uber',{formula:`'Sales Tax (excluded)'!G${txRow['Lakeview (W Diversey)']}+'Sales Tax (excluded)'!G${txRow['Old Town']}`},'Sales Tax (excluded)','Withheld on every payout. Booked to 2270 with the sales tax, so it is outside the ex-tax analysis. Logan Square also had 4,082.33 withheld on the 2/2 catch-up.','Submit W-9s to Uber for Lakeview and Old Town to stop the withholding.'],
 ['Low','Other stores','Single-payout sales variances',null,'Payout Periods (Flag: Sales var)','Riverside 7/27, Northwestern 7/20, Oak Park 1/12 and 1/19 (offset by 1/5), Old Town 8/10 (first week).','Review each on the Payout Periods tab.'],
 ['Low','Riverside / Logan Square','Feb fee JE cross-location',21.68,'GL Fee JE Lines','The 2/28 UberEats Fees JE credits 1111 Riverside 21.68 less, and Logan Square 21.68 more, than their expense lines.','Move 21.68 of the 1111 credit from Logan Square to Riverside.'],
 ['Low','Old Town, Sterling','Uber payouts above listed components',{formula:`SUM(${ur('O')})`},'Uber Payouts (Unlisted Items)','Old Town 8/10 by 48.13 and Sterling 7/27 by 4.00, likely tips or a misc adjustment Uber does not break out.','Informational.'],
];
DI.forEach((d,i)=>{const row=Ds.getRow(i+5);row.values=d;row.alignment={wrapText:true,vertical:'top'}});
fmtCols(Ds,[[9],[24],[28],[14,money],[22],[70],[60]]);

wb.xlsx.writeFile(OUT).then(()=>console.log('wrote',OUT));
