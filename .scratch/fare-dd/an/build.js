const ExcelJS=require('../../fare-ue/an/node_modules/exceljs');
const {L,LOCS,r2,payDep,g,cat}=require('./model');const {P,det,sales,M}=require('./dd');const {up}=require('./match');const {load}=require('./glparse');
const OUT="C:/Users/trici/OCRA/TML's Files - General/Downloads/FARE Third Party Analysis/FARE DoorDash Analysis 12.29.25 to 9.27.26.xlsx";
const wb=new ExcelJS.Workbook();const money='#,##0.00;[Red](#,##0.00);-';const pct='0.0%';
const short=l=>(l||'').replace(/^FARE /,'');
const hdr=(ws,r)=>{const row=ws.getRow(r);row.font={bold:true,color:{argb:'FFFFFFFF'}};row.alignment={wrapText:true,vertical:'middle',horizontal:'center'};row.eachCell(c=>c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFC8102E'}});row.height=48};
const tot=(ws,r)=>{const row=ws.getRow(r);row.font={bold:true};row.eachCell(c=>{c.border={top:{style:'thin'},bottom:{style:'double'}}})};
const title=(ws,t,sub)=>{ws.getCell('A1').value=t;ws.getCell('A1').font={bold:true,size:14};if(sub){ws.getCell('A2').value=sub;ws.getCell('A2').font={italic:true,color:{argb:'FF555555'}}}};
const note=(ws,r,t)=>{ws.getRow(r).getCell(1).value=t;ws.getRow(r).font={italic:true}};
const table=(ws,start,cols,data,{total=true,filter=true}={})=>{ws.getRow(start).values=cols.map(c=>c[0]);hdr(ws,start);
 data.forEach((d,i)=>{ws.getRow(start+1+i).values=cols.map(c=>typeof c[1]==='function'?c[1](d):d[c[1]])});
 if(total&&data.length){const r=start+1+data.length;const row=ws.getRow(r);row.getCell(1).value='Total';cols.forEach((c,j)=>{if(j===0||['t','p','x','d'].includes(c[2]))return;const col=ws.getColumn(j+1).letter;row.getCell(j+1).value={formula:`SUBTOTAL(9,${col}${start+1}:${col}${r-1})`}});tot(ws,r)}
 cols.forEach((c,j)=>{const col=ws.getColumn(j+1);col.width=Math.max(col.width||0,c[3]||(j===0?30:14));if(j===0||c[2]==='t'||c[2]==='d')return;col.numFmt=c[2]==='p'?pct:c[2]==='i'?'#,##0':money});
 if(filter&&data.length)ws.autoFilter={from:{row:start,column:1},to:{row:start+data.length,column:cols.length}};
 return start+1+data.length+(total?1:0)};
const stores=LOCS.filter(l=>l!=='FARE Holding LLC');const f2=n=>n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const S=LOCS.map(l=>{const o=L[l];const h=l==='FARE Holding LLC';return{loc:short(l),orders:o.dd.orders,sub:o.dd.sub,dssPre:o.dssPre,g4104:o.gl4104,B:o.B,ded:o.dedEx,fees:o.gl.fees,C:o.C,Csep:o.Csep,Cother:o.Cother,T:o.T,net:o.dd.net,dep:r2(o.depAssigned),D:o.D,unpaid:o.unpaidNet,undep:o.undepAmt,dec:h?0:r2(-o.ddDec.net),correct:o.correct,posted:o.gl.end,postDiff:o.postDiff}});
const H=L['FARE Holding LLC'];

// Summary
let ws=wb.addWorksheet('Summary',{views:[{state:'frozen',xSplit:1,ySplit:4}]});
title(ws,'FARE DoorDash vs R365 GL: 1102 DoorDash Deposit Clearing by Location','DoorDash Marketplace activity 1/1/26 to 9/27/26 (local order date) vs R365 GL through 9/27/26, all sales and fees before sales tax. Deposits are assigned to the store whose payout they were. 12/29-12/31/25 sales sit in the QB opening balance.');
let r=table(ws,4,[['Location','loc','t',26],['Orders','orders','i',9],['DD Sales (subtotal)','sub'],['GL DoorDash Sales (DSS 1102, pre-tax)','dssPre'],['Sales Variance (GL - DD)','B'],['Reference: GL 4104 DoorDash Sales','g4104'],['DD Deductions','ded'],['GL Fees Booked (Jan-Aug JEs)','fees'],['Fee Variance (DD - GL)','C'],['  Week of 9/21-9/27 not yet booked','Csep'],['  Other fee variance','Cother'],['DD Net Payouts','net'],['Deposits in R365 (by payout store)','dep'],['Net Not Yet Deposited','D'],['  9/21-9/27 activity (unpaid)','unpaid'],['  Payout deposited outside 1102','undep'],['  Less 12/29-12/31 net in 1/8 payout','dec'],['Sales Tax Left in 1102 by DSS','T'],['Correct 1102 Balance 9/27','correct'],['1102 Balance As Posted 9/27','posted'],['Location Posting Difference','postDiff']],S,{filter:false});
note(ws,r+1,'Correct balance = Sales Variance + Fee Variance + Net not yet deposited + Sales Tax Left in 1102. GL pre-tax sales = DSS debit to 1102 less the tax on those orders. The DSS debits 1102 with tax included and nothing clears it, so it is the one tax line in this workbook. GL 4104 is reference only: the DSS splits the DoorDash price between 4104 and 4500 Third Party Service Fee Income. Holding correct balance = QB opening 3,031.05 less the 1/2/26 payouts for the week of 12/22 (2,563.91).');
note(ws,r+2,'Location Posting Difference: the 8/31/26 DoorDash AJ credited stores 192,256.46, but the DoorDash deposits posted at Holding for 2026 payouts total 150,651.63.');

// Findings
const sum=(a,f)=>r2(a.reduce((s,x)=>s+f(x),0));
const totT=sum(stores,l=>L[l].T),taxSep=sum(stores,l=>L[l].ddSep.tax),taxJA=r2(totT-taxSep);
const totSep=sum(stores,l=>L[l].Csep),nmh=up.find(p=>p.date==='2026-07-16');
const lvDup=150.33;
const F=[
 ['High','All stores','DSS leaves sales tax in 1102',totT,`The DSS debits 1102 with each DoorDash order's sales tax included. DoorDash remits that tax itself and never pays it to FARE, and the DoorDash fee entries keep tax off, so it builds up in 1102 every week. This is a DSS / POS setup issue rather than a fee entry issue.`,'Decide how DoorDash orders should hit the DSS (no tax on the DoorDash tender, or a periodic clearing entry). No entry is proposed here.'],
 ['High','Holding + all stores','8/31 DoorDash AJ over-reclassed deposits',r2(H.postDiff),`DoorDash deposits posted to FARE Holding LLC for 2026 payouts total 150,651.63. The 8/31 AJ debited Holding and credited stores 192,256.46, so 41,604.83 too much moved. Holding sits at ${f2(H.gl.end)} against a correct ${f2(H.correct)}, and the stores are understated by the same total.`,'Post Proposed JE 1 (Dr stores / Cr Holding).'],
 ['High','Lakeview','DSS DoorDash sales run 25% above DoorDash',L['FARE Lakeview (W Diversey)'].B,'Every week since opening, GL pre-tax DoorDash sales are 127.7%-133.7% of the DoorDash subtotal. Lakeview books the full DoorDash price to 4104 (9,772.99 vs DoorDash 9,711.56) and still adds the markup to 4500, where the other stores split the price about 80/20 between 4104 and 4500. The Uber analysis found the same 25% at Lakeview.','Fix the Lakeview POS / Checkmate item or markup mapping. Sales and 1102 are overstated by this amount.'],
 ['High','Old Town','DSS DoorDash sales run 20% below DoorDash',L['FARE Old Town'].B,'Every week since opening, GL pre-tax DoorDash sales are 76.9%-79.1% of the DoorDash subtotal. Old Town books the in-store price to 4104 (14,565.16, 80% of DoorDash 18,173.53), but the DoorDash markup never reaches 4500.','Fix the Old Town POS / Checkmate markup mapping. Sales are understated by this amount.'],
 ['Medium','Northwestern Memorial Hospital','DoorDash payout deposited to Grubhub clearing',nmh.net,`DoorDash 7/16 payout ${f2(nmh.net)} (ID ${nmh.id}) was recorded as BD002858 on 7/17 in 1103 Grubhub Deposit Clearing.`,'Recode BD002858 from 1103 to 1102 (Proposed JE 2). This also clears a 469.85 item in the Grubhub recon.'],
 ['Medium','Lake + LaSalle, Loop','DSS days missing DoorDash tender',1563.95,'LaSalle: no DoorDash in DSS on 6/24 (240.07), 8/18 (347.55), 8/19 (428.81). Loop: DSS short on 6/1 (225.06) and 6/3 (322.46).','Check those DSS days for DoorDash orders rung to another tender, then reclass.'],
 ['Low','Logan Square, NMH, Oak Park','Small recurring DSS overage',r2(L['FARE Logan Square'].B+L['FARE Northwestern Memorial Hospital'].B+L['FARE Oak Park'].B),'GL DSS runs 1-3% above DoorDash almost every week at these stores (Logan about 80 per week). Likely orders DoorDash cancelled or adjusted that the POS kept, or POS tax differing from the tax DoorDash charged.','Spot-check one week of POS DoorDash orders against the DoorDash order list.'],
 ['Low','All stores','Jan-Feb fee JEs used mixed categories',0,'Jan-Feb: 7540 Marketing got 13,088 vs DoorDash marketing fees 6,012; 4905 got 884 vs promotions 7,169; Feb 7310 was net of a 5,285 DoorDash "Misc" credit. Monthly totals tie, so this is classification only. From March the only difference is adjustments going to 7535 with refunds.','Optional reclass between 7540 and 4905 for Jan-Feb.'],
 ['Low','150 Riverside','August fee JE line with no activity',19.66,'The 8/31 DoorDash JE credited 1102 19.66 at 150 Riverside, a repeat of July. DoorDash shows no Riverside activity after 7/21.','Reverse the 19.66.'],
 ['Info','All stores','Week of 9/21-9/27 fees not booked yet',totSep,'DoorDash pays the week of 9/21-9/27 on 10/1, so its entry is not due yet. The 9/6, 9/13 and 9/20 weekly entries are posted and tie to DoorDash at every store.','Post with the 10/1 payout.'],
 ['Info','8 stores','DoorDash Drive fees billed through AP',0,'Drive (FARE online orders delivered by DoorDash) is billed on Door Dash Inc AP invoices to 7250 Delivery Services, not through payouts. Mar-Aug invoices tie to Drive fees within 257 net; Jan-Feb invoices run 2,627.52 above Drive fees (likely Drive charges beyond the per-order fee, or December fees); Sept Drive fees of 3,585.79 are not invoiced yet.','See the Drive Fees tab.'],
];
ws=wb.addWorksheet('Findings',{views:[{state:'frozen',ySplit:4}]});title(ws,'Findings and Discrepancies','Ranked by impact.');
table(ws,4,[['Priority',0,'t',9],['Location',1,'t',24],['Issue',2,'t',38],['Amount',3,'',14],['Detail',4,'t',80],['Proposed Action',5,'t',55]],F,{total:false,filter:false});
ws.eachRow((row,i)=>{if(i>4)row.alignment={wrapText:true,vertical:'top'}});

// Proposed JEs
ws=wb.addWorksheet('Proposed JEs');title(ws,'Proposed Journal Entries (review before posting)','Nothing here has been posted.');
const cols=[['Account','acct','t',36],['Location','loc','t',30],['Debit','dr'],['Credit','cr'],['Memo','memo','t',55]];
const je1=stores.filter(l=>Math.abs(L[l].postDiff)>0.004).map(l=>({acct:'1102 - DoorDash Deposit Clearing',loc:short(l),dr:r2(-L[l].postDiff),cr:0,memo:'Reverse 8/31 DoorDash AJ excess over Holding deposits'}));
je1.push({acct:'1102 - DoorDash Deposit Clearing',loc:'Holding LLC',dr:0,cr:r2(H.postDiff),memo:'Reverse 8/31 DoorDash AJ excess over Holding deposits'});
ws.getCell('A4').value='JE 1: Reclass 8/31 DoorDash AJ excess (date 8/31/26)';ws.getCell('A4').font={bold:true};
let rr=table(ws,5,cols,je1,{filter:false});
const je2=[];
ws.getRow(rr+2).getCell(1).value='JE 2: Recode BD002858 (7/17/26, NMH, 469.85) from 1103 Grubhub Deposit Clearing to 1102 DoorDash Deposit Clearing';ws.getRow(rr+2).font={bold:true};
rr=table(ws,rr+3,cols,[{acct:'1103 - Grubhub Deposit Clearing',loc:'Northwestern Memorial Hospital',dr:469.85,cr:0,memo:'DoorDash payout 7/16 deposited to Grubhub clearing'},{acct:'1102 - DoorDash Deposit Clearing',loc:'Northwestern Memorial Hospital',dr:0,cr:469.85,memo:'DoorDash payout 7/16 deposited to Grubhub clearing'}],{filter:false});
ws.getRow(rr+2).getCell(1).value='After JE 1-2, each store 1102 balance equals: sales variance + other fee variance + week of 9/21 fees (not due yet) + 9/21-9/27 net not yet paid + sales tax left in 1102 (Summary tab).';ws.getRow(rr+2).font={italic:true};

// Fees by location
const glAcc={};for(const [a,f] of [['7310','gl7310.csv'],['7540','gl7540.csv'],['4905','gl4905.csv'],['7535','gl7535.csv']])for(const x of load(f))if(/^doordash$/i.test(x.num)){glAcc[x.loc]=glAcc[x.loc]||{};glAcc[x.loc][a]=(glAcc[x.loc][a]||0)+x.dr-x.cr}
ws=wb.addWorksheet('Fees by Location',{views:[{state:'frozen',xSplit:1,ySplit:4}]});title(ws,'DoorDash Deductions vs GL by Location, 1/1/26 to 9/27/26','DoorDash amounts shown as positive costs, before sales tax. GL from the monthly DoorDash JEs (Jan-Aug) and weekly entries (Sept), so the Variance column includes the week of 9/21-9/27, not booked yet.');
const FL=stores.map(l=>{const d=L[l].dd,a=glAcc[l]||{};const gt=r2((a['7310']||0)+(a['7540']||0)+(a['4905']||0)+(a['7535']||0));return{loc:short(l),sub:d.sub,comm:d.comm,g7310:r2(a['7310']||0),mkt:d.mkt,g7540:r2(a['7540']||0),disc:d.disc,g4905:r2(a['4905']||0),err:d.err,adj:d.adj,g7535:r2(a['7535']||0),ddf:d.ddf,ded:L[l].dedEx,gt,v:r2(L[l].dedEx-gt),sep:L[l].Csep,cp:d.sub?d.comm/d.sub:0,dp:d.sub?L[l].dedEx/d.sub:0}});
table(ws,4,[['Location','loc','t',26],['DD Subtotal','sub'],['Commission + processing','comm'],['GL 7310','g7310'],['Marketing / ad fees','mkt'],['GL 7540','g7540'],['Promotions funded by FARE','disc'],['GL 4905','g4905'],['Refunds (error charges)','err'],['Adjustments (net cost)','adj'],['GL 7535','g7535'],['DD-funded promos net of credits','ddf'],['Total deductions','ded'],['GL total','gt'],['Variance','v'],['Sept portion','sep'],['Commission % of subtotal','cp','p',11],['All deductions % of subtotal','dp','p',11]],FL,{filter:false});

// Monthly fees
ws=wb.addWorksheet('Monthly Fees',{views:[{state:'frozen',xSplit:2,ySplit:4}]});title(ws,'DoorDash Deductions vs GL by Location and Month','By DoorDash local transaction date; GL by JE date.');
const MF={};const mk=(l,m)=>({loc:short(l),m,sub:0,comm:0,mkt:0,disc:0,err:0,adj:0,ddf:0,tax:0,gl:0,g7310:0,g7540:0,g4905:0,g7535:0});
for(const x of det){const d=x['Timestamp local date'];if(d<'2026-01-01')continue;const l=M[x['Store ID']];const k=l+'|'+d.slice(0,7);const c=cat(x);const o=MF[k]=MF[k]||mk(l,d.slice(0,7));for(const q of ['comm','mkt','disc','err','adj','ddf','tax','sub'])o[q]+=c[q]}
for(const x of g)if(/^doordash$/i.test(x.num)){const k=x.loc+'|'+x.date.slice(0,7);const o=MF[k]=MF[k]||mk(x.loc,x.date.slice(0,7));o.gl+=x.cr-x.dr}
for(const [a,f] of [['g7310','gl7310.csv'],['g7540','gl7540.csv'],['g4905','gl4905.csv'],['g7535','gl7535.csv']])for(const x of load(f))if(/^doordash$/i.test(x.num)){const o=MF[x.loc+'|'+x.date.slice(0,7)];if(o)o[a]+=x.dr-x.cr}
const mf=Object.values(MF).map(o=>{const ded=o.comm+o.mkt+o.disc+o.err+o.adj+o.ddf;return{...o,ded,v:ded-o.gl}}).sort((a,b)=>a.loc<b.loc?-1:a.loc>b.loc?1:a.m<b.m?-1:1);
table(ws,4,[['Location','loc','t',26],['Month','m','t',9],['DD Subtotal','sub'],['Commission','comm'],['GL 7310','g7310'],['Marketing','mkt'],['GL 7540','g7540'],['Promotions','disc'],['GL 4905','g4905'],['Refunds','err'],['Adjustments','adj'],['GL 7535','g7535'],['DD-funded net','ddf'],['DD Deductions','ded'],['GL 1102 Fee Credit','gl'],['Variance','v']],mf);

// Weekly sales
ws=wb.addWorksheet('Weekly Sales',{views:[{state:'frozen',xSplit:2,ySplit:4}]});title(ws,'Weekly DoorDash Sales vs GL DSS (1102 debits)','Mon-Sun weeks by local order date, before sales tax. GL pre-tax = DSS debit to 1102 less the tax on those orders. The week of 12/29 covers 1/1-1/4 only.');
const wsr=[];for(const l of stores)for(const [w,W] of Object.entries(L[l].weeks).sort())wsr.push({loc:short(l),wk:w,orders:W.orders,sub:W.sub,gl:W.gl-W.tax,v:W.gl-W.tax-W.sub,p:W.sub?(W.gl-W.tax)/W.sub:0});
table(ws,4,[['Location','loc','t',26],['Week Of','wk','d',11],['Transactions','orders','i',11],['DD Sales (subtotal)','sub'],['GL DoorDash Sales (pre-tax)','gl'],['Variance','v'],['GL / DD','p','p',9]],wsr);

// Payouts & deposits
ws=wb.addWorksheet('Payouts & Deposits',{views:[{state:'frozen',xSplit:2,ySplit:4}]});title(ws,'Every DoorDash Payout and Its R365 Deposit','Payouts land Thursday for the prior Mon-Sun. Matched on exact amount within 10 days.');
const pr=P.map(p=>{const d=payDep[p.id];const nx=p.id===nmh.id;return{loc:short(p.store),date:p.date,id:p.id,per:`${p.wkStart} to ${p.wkEnd}`,sub:p.sub,comm:-p.comm-p.ppf,mkt:-p.mktf,disc:-p.discYou,ddf:-(p.discDD+p.ddCredit+p.disc3+p.tp),err:-p.err,adj:-p.adj,net:p.net,dn:d?d.num:nx?'BD002858 (1103)':'',dd:d?d.date:nx?'2026-07-17':'',dl:d?short(d.loc):nx?'Northwestern Memorial Hospital':'',da:d?d.amt:nx?469.85:0,st:d?(d.loc===p.store?'OK':'Posted to Holding'):nx?'Posted to 1103':p.net?'Not deposited':'Zero payout'}});
table(ws,4,[['Location','loc','t',26],['Payout Date','date','d',11],['Payout ID','id','t',11],['Sales Period','per','t',23],['Subtotal','sub'],['Commission','comm'],['Marketing','mkt'],['Promotions','disc'],['DD-funded net','ddf'],['Refunds','err'],['Adjustments','adj'],['Net Payout','net'],['Deposit #','dn','t',16],['Deposit Date','dd','d',11],['Deposit Location','dl','t',26],['Deposit Amount','da'],['Status','st','t',18]],pr);

// Refunds & adjustments
ws=wb.addWorksheet('Refunds & Adjustments',{views:[{state:'frozen',ySplit:4}]});title(ws,'Error Charges (Refunds) and Adjustments','From the DoorDash financial detail, 12/29/25 to 9/27/26.');
const reason=d=>/missing/i.test(d||'')?'Missing item':/incorrect/i.test(d||'')?'Incorrect item':/quality/i.test(d||'')?'Food quality':/ads spend|ad fee|ad orders/i.test(d||'')?'Offsite / partner ads':/cancel/i.test(d||'')?'Cancelled order':/remade/i.test(d||'')?'Remade order':'Other';
const RS={};const ref=[];
for(const x of det){if(!x['Error charges']&&!x.Adjustments&&x['Transaction type']!=='Fee')continue;const l=short(M[x['Store ID']]);const t=(x['Transaction type']==='Error Charge'?'Refund: ':x['Transaction type']+': ')+reason(x.Description);const k=l+'|'+t;
 RS[k]=RS[k]||{loc:l,t,n:0,err:0,adj:0,fee:0};RS[k].n++;RS[k].err+=-x['Error charges'];RS[k].adj+=x.Adjustments;RS[k].fee+=x['Transaction type']==='Fee'?-x['Marketing fees | (including any applicable taxes)']:0;
 ref.push({loc:l,d:x['Timestamp local date'],t:x['Transaction type'],o:x['DoorDash order ID']||'',desc:x.Description||'',err:-x['Error charges'],adj:x.Adjustments,fee:x['Transaction type']==='Fee'?-x['Marketing fees | (including any applicable taxes)']:0,pd:x['Payout date']||'unpaid'})}
let r3=table(ws,4,[['Location','loc','t',26],['Type','t','t',34],['Count','n','i',8],['Refunds charged','err'],['Adjustments (credit +)','adj'],['Ad fees','fee']],Object.values(RS).sort((a,b)=>a.loc<b.loc?-1:a.loc>b.loc?1:b.err-a.err),{filter:false});
ws.getRow(r3+2).getCell(1).value='Detail';ws.getRow(r3+2).font={bold:true};
table(ws,r3+3,[['Location','loc','t',26],['Date','d','d',11],['Type','t','t',12],['Order','o','t',11],['Description','desc','t',60],['Refund','err'],['Adjustment','adj'],['Ad fee','fee'],['Payout Date','pd','d',11]],ref.sort((a,b)=>a.loc<b.loc?-1:a.loc>b.loc?1:a.d<b.d?-1:1));

// Drive
ws=wb.addWorksheet('Drive Fees');title(ws,'DoorDash Drive Fees vs 7250 Delivery Services (Door Dash Inc AP invoices)','Drive orders are FARE online orders delivered by DoorDash, billed monthly by invoice, not through payouts.');
const DM={'36554485':'FARE Loop (S Franklin)','36554731':'FARE Northwestern Memorial Hospital','36555180':'FARE Logan Square','36947599':'FARE Lake + LaSalle','37373459':'FARE Oak Park','47266559':'FARE Old Town','48473035':'FARE 150 Riverside','51111512':'FARE Lakeview (W Diversey)'};
const DV={};const dk=(l,m)=>DV[l+'|'+m]=DV[l+'|'+m]||{loc:short(l),m,n:0,sub:0,fee:0,gl:0};
for(const s of sales){const l=DM[s['Store ID']];if(!l||s['Is cancelled']==='true')continue;const m=(s['Delivery date']||s['Order placed date']).slice(0,7);if(m<'2026-01')continue;const o=dk(l,m);o.n++;o.sub+=+s.Subtotal;o.fee+=+s['Drive fee']}
for(const x of load('gl7250.csv'))if(/door/i.test(x.co))dk(x.loc,x.date.slice(0,7)).gl+=x.dr-x.cr;
const drv=Object.values(DV).map(o=>({...o,v:o.gl-o.fee})).sort((a,b)=>a.loc<b.loc?-1:a.loc>b.loc?1:a.m<b.m?-1:1);
table(ws,4,[['Location','loc','t',26],['Month','m','t',9],['Drive Orders','n','i',9],['Drive Order Subtotal','sub'],['Drive Fees (DoorDash)','fee'],['GL 7250 Door Dash Inc','gl'],['Variance (GL - DD)','v']],drv);

// GL detail
ws=wb.addWorksheet('GL 1102 Detail',{views:[{state:'frozen',ySplit:4}]});title(ws,'R365 GL 1102 DoorDash Deposit Clearing, 12/31/25 to 9/27/26');
table(ws,4,[['Location','loc','t',30],['Date','date','d',11],['Type','type','t',14],['Number','num','t',14],['Comment','comment','t',40],['Debit','dr'],['Credit','cr']],g.map(x=>({...x,loc:short(x.loc)})));

module.exports={F,S,FL,drv,H,totT,totSep,nmh,je1,je2,mf};
if(require.main===module)wb.xlsx.writeFile(OUT).then(()=>console.log('wrote',OUT));
