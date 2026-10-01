const {rows}=require('./gh');const M=require('./map');const {load}=require('./glparse');const {pays,m,up,ud,depOf,r2}=require('./match');
const END='2026-09-21',START='2025-12-30';
const LOCS=['FARE 150 Riverside','FARE Loop (S Franklin)','FARE Lake + LaSalle','FARE Logan Square','FARE Northwestern Memorial Hospital','FARE Oak Park','FARE Old Post Office','FARE Sterling Food Hall','FARE Lakeview (W Diversey)','FARE Old Town','FARE Holding LLC'];
const g1103=load('gl1103.csv');
const FA=['7350','7340','7570','7560','4905','7535','2270'];
const glF=[];for(const a of FA)for(const x of load('gl'+a+'.csv'))if(/grub/i.test(x.num)&&x.num!=='GrubHub AJE'&&x.date<='2026-09-20')glF.push({...x,a,amt:x.dr-x.cr});
const z=()=>({rtax:0,orders:0,sub:0,tax:0,dlv:0,tip:0,mt:0,adj:0,adjN:0,cx:0,cxN:0,com:0,dcom:0,proc:0,promo:0,loy:0,misc:0,cred:0,wt:0,net:0});
const L={};for(const l of LOCS)L[l]={loc:l,gh:z(),ghM:{},gl:{dss:0,dssWin:0,dssPre:0,dssPost:0,sales:0,fee1103:0,feeM:{},feeA:{},dep:0,aje:0,open:0,end:0},stores:new Set()};
const acc=(x,r)=>{const t=r.transaction_type;
 if(t==='Prepaid Order'){x.orders++;x.sub+=r.subtotal;x.tax+=r.subtotal_sales_tax+r.self_delivery_charge_tax;x.dlv+=r.self_delivery_charge;x.tip+=r.tip}
 if(/Adjust|Cancel/.test(t))x.rtax-=r.subtotal_sales_tax+r.self_delivery_charge_tax; if(t==='Order Adjustment'){x.adj+=r.merchant_total;x.adjN++} if(t==='Cancellation'){x.cx+=r.merchant_total;x.cxN++}
 if(t==='Miscellaneous')x.misc+=r.merchant_total; if(t==='GH Credit')x.cred+=r.merchant_total;
 if(!['Miscellaneous','GH Credit'].includes(t))x.mt+=r.merchant_total;
 x.com+=r.commission;x.dcom+=r.delivery_commission+r.gh_plus_commission;x.proc+=r.processing_fee;x.promo+=r.merchant_funded_promotion;x.loy+=r.merchant_funded_loyalty;x.wt+=r.withheld_tax;x.net+=r.merchant_net_total};
for(const r of rows){const l=M[r.grubhub_store_id];L[l].stores.add(r.store_name.trim()+' #'+r.grubhub_store_id);acc(L[l].gh,r);const mo=r.transaction_date.slice(0,7);L[l].ghM[mo]=L[l].ghM[mo]||z();acc(L[l].ghM[mo],r)}
// GH fee buckets mapped to GL accounts (tie proven on May)
const bk=x=>({'7350/7340 Delivery comm + processing':-(x.dcom+x.proc),'7570 Marketing comm + ads - credits':-(x.com+x.misc+x.cred),'4905 Promotions':-(x.promo+x.loy),'7535 Refunds':-(x.adj+x.cx),'2270 Withheld sales tax':-x.wt});
const glb=a=>({'7350':'7350/7340 Delivery comm + processing','7340':'7350/7340 Delivery comm + processing','7570':'7570 Marketing comm + ads - credits','7560':'7570 Marketing comm + ads - credits','4905':'4905 Promotions','7535':'7535 Refunds','2270':'2270 Withheld sales tax'}[a]);
for(const x of glF){const G=L[x.loc].gl;const mo=x.date.slice(0,7);const b=glb(x.a);G.feeA[b]=(G.feeA[b]||0)+x.amt;G.feeM[mo]=G.feeM[mo]||{};G.feeM[mo][b]=(G.feeM[mo][b]||0)+x.amt}
for(const x of g1103){const G=L[x.loc].gl;const a=x.dr-x.cr;G.end+=a;
 if(x.num.startsWith('NJ')){G.dss+=a;if(x.date<START)G.dssPre+=a;else if(x.date<=END)G.dssWin+=a;else G.dssPost+=a}
 else if(x.num==='GrubHub AJE')G.aje+=a;else if(x.type==='Bank Deposit')G.dep-=a;else if(x.num==='Balance Sheet')G.open+=a;else if(x.date>END)G.feePost=(G.feePost||0)-a;else G.fee1103-=a}
for(const a of ['4105','4206'])for(const x of load('gl'+a+'.csv'))if(x.date>=START&&x.date<=END)L[x.loc].gl.sales+=x.cr-x.dr;
// deposits
for(const l of LOCS)Object.assign(L[l],{payTot:0,depHere:0,depHolding:0,undep:0,undepList:[]});
for(const p of pays){const x=L[p.store];x.payTot+=p.amt;const mt=depOf[p.i];if(!mt){x.undep+=p.amt;x.undepList.push(p)}else if(mt.d.loc===p.store)x.depHere+=p.amt;else x.depHolding+=p.amt}
module.exports={L,LOCS,r2,bk,pays,m,up,ud,depOf,glF,g1103,END,START};
if(false){for(const l of LOCS){const x=L[l],h=x.gh,G=x.gl;const ded=h.mt+h.misc+h.cred-h.net;const fees=Object.values(G.feeA).reduce((a,b)=>a+b,0);
 console.log(l.slice(5,20).padEnd(16),'mt',r2(h.mt),'dssWin',r2(G.dssWin),'B',r2(G.dssWin-h.mt),'tip',r2(h.tip),'| ded',r2(ded),'glFee',r2(fees),r2(G.fee1103),'C',r2(ded-G.fee1103),'| pay',r2(h.net),'here',r2(x.depHere),'hold',r2(x.depHolding),'aje',r2(G.aje),'undep',r2(x.undep),'| post',r2(G.dssPost),'end',r2(G.end),'pre',r2(G.dssPre))}}
const S=[];for(const l of LOCS){const x=L[l],h=x.gh,G=x.gl;const gross=h.mt-h.adj-h.cx;const ded=gross-h.net;const b=bk(h);const bsum=Object.values(b).reduce((a,c)=>a+c,0);
 const fees=G.fee1103;const udHere=ud.filter(d=>d.loc===l&&d.date>='2026-01-05').reduce((s,d)=>s+d.amt,0);const decDep=ud.filter(d=>d.loc===l&&d.date<'2026-01-05').reduce((s,d)=>s+d.amt,0);
 const B=G.dssWin-gross,A=G.dssPost-(G.feePost||0),C=ded-fees,ajeX=l==='FARE Holding LLC'?0:-G.aje-x.depHolding;
 const holdOwn=l==='FARE Holding LLC'?G.open-decDep+G.aje-m.filter(t=>t.d.loc===l).reduce((s,t)=>s+t.d.amt,0):0;
 const calc=B+A+C+x.undep-ajeX-udHere+holdOwn;
 S.push({loc:l,stores:[...x.stores].join('; '),orders:h.orders,sub:r2(h.sub),tax:r2(h.tax),dlv:r2(h.dlv),tip:r2(h.tip),gross:r2(gross),refunds:r2(-(h.adj+h.cx)),refN:h.adjN+h.cxN,dss:r2(G.dssWin),B:r2(B),glSales:r2(G.sales),ded:r2(ded),bsum:r2(bsum),fees:r2(fees),C:r2(C),net:r2(h.net),depHere:r2(x.depHere),depHolding:r2(x.depHolding),aje:r2(-G.aje),ajeX:r2(ajeX),undep:r2(x.undep),udHere:r2(udHere),A:r2(A),end:r2(G.end),calc:r2(calc),chk:r2(G.end-calc),b,feeA:G.feeA,h,G,x})}
module.exports.S=S;
if(require.main===module)console.table(S.map(s=>({loc:s.loc.slice(5,20),gross:s.gross,dss:s.dss,B:s.B,tip:s.tip,ded:s.ded,bsum:s.bsum,fees:s.fees,C:s.C,ajeX:s.ajeX,undep:s.undep,udH:s.udHere,A:s.A,end:s.end,chk:s.chk})));
// excl-tax view: GH tax is pass-through; DSS tax estimated at that day's GH tax ratio (location avg if no GH orders)
{const {rows}=require('./gh');const M=require('./map');
 const day={},loc={};let eT=0,eG=0;
 for(const r of rows){const l=M[r.grubhub_store_id];const t=r.subtotal_sales_tax+r.self_delivery_charge_tax;const s=S.find(x=>x.loc===l);
  s.otax=s.otax||0;s.rtax=s.rtax||0;
  if(r.transaction_type==='Prepaid Order'){s.otax+=t;const k=l+'|'+r.transaction_date;day[k]=day[k]||{t:0,g:0};day[k].t+=t;day[k].g+=r.merchant_total;loc[l]=loc[l]||{t:0,g:0};loc[l].t+=t;loc[l].g+=r.merchant_total;eT+=t;eG+=r.merchant_total}
  else if(/Adjust|Cancel/.test(r.transaction_type))s.rtax-=t}
 const lr=l=>loc[l]&&loc[l].g?loc[l].t/loc[l].g:eT/eG;
 const dt={},dtM={};for(const x of g1103)if(x.num.startsWith('NJ')&&x.date>=START&&x.date<=END){const d=day[x.loc+'|'+x.date];const rt=d&&d.g?d.t/d.g:lr(x.loc);dt[x.loc]=(dt[x.loc]||0)+(x.dr-x.cr)*rt;const mk=x.loc+'|'+x.date.slice(0,7);dtM[mk]=(dtM[mk]||0)+(x.dr-x.cr)*rt}module.exports.dtM=dtM;module.exports.dayR=(l,d)=>{const q=day[l+'|'+d];return q&&q.g?q.t/q.g:lr(l)};
 for(const s of S){s.otax=r2(s.otax||0);s.rtax=r2(s.rtax||0);s.dssTax=r2(dt[s.loc]||0);s.dssEx=r2(s.dss-s.dssTax);
  s.salesEx=r2(s.gross-s.otax);s.refEx=r2(s.refunds-s.rtax);s.feesEx=r2(s.ded-s.refunds-s.b['2270 Withheld sales tax']);
  s.Bex=r2(s.dssEx-s.salesEx);s.taxDss=r2(s.dssTax-s.otax);
  const gl4=['7350/7340 Delivery comm + processing','7570 Marketing comm + ads - credits','4905 Promotions','7535 Refunds'].reduce((a,k)=>a+(s.feeA[k]||0),0);
  s.gl2270=r2(s.feeA['2270 Withheld sales tax']||0);s.feesGLex=r2(gl4);s.Cex=r2(s.feesEx+s.refEx-gl4);s.taxBooked=r2(s.otax-s.gl2270);
  s.taxVar=r2(s.taxDss+s.taxBooked);s.chk2=r2(s.Bex+s.Cex+s.taxVar-s.B-s.C)}}
if(require.main===module)console.table(S.map(s=>({loc:s.loc.slice(5,18),salesEx:s.salesEx,refEx:s.refEx,feesEx:s.feesEx,net:s.net,dssEx:s.dssEx,Bex:s.Bex,Cex:s.Cex,taxDss:s.taxDss,taxBk:s.taxBooked,chk:s.chk2,c2:r2(s.salesEx-s.refEx-s.feesEx-s.net)})));
// unpaid week excl tax; tax folded into one bridge figure
{const {load}=require('./glparse');const t27={};for(const x of load('gl2270.csv'))if(/grub/i.test(x.num)&&x.num!=='GrubHub AJE'&&x.date>END)t27[x.loc]=(t27[x.loc]||0)+x.dr-x.cr;
 const lr={};for(const s of S){const g=s.gross;lr[s.loc]=g?s.otax/g:0}const avg=S.reduce((a,s)=>a+s.otax,0)/S.reduce((a,s)=>a+s.gross,0);
 for(const s of S){const rt=lr[s.loc]||avg;const dPost=s.G.dssPost;s.Aex=r2(dPost*(1-rt)-((s.G.feePost||0)-(t27[s.loc]||0)));s.hold=s.loc==='FARE Holding LLC'?s.end:0;
  s.endEx=r2(s.Bex+s.Cex-s.ajeX+s.undep-s.udHere+s.Aex+s.hold);s.taxAll=r2(s.end-s.endEx)}}
