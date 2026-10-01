const {load}=require('./glparse');const {P,det,M,wk,add}=require('./dd');const {m:matches,up}=require('./match');
const r2=x=>Math.round(x*100)/100;
const END='2026-09-27',START='2026-01-01';
const LOCS=['FARE Logan Square','FARE Loop (S Franklin)','FARE Northwestern Memorial Hospital','FARE Oak Park','FARE Lake + LaSalle','FARE Old Town','FARE Sterling Food Hall','FARE Lakeview (W Diversey)','FARE Old Post Office','FARE 150 Riverside','FARE Holding LLC'];
const g=load('gl1102.csv').filter(x=>x.date<=END);
const z=()=>({orders:0,sub:0,tax:0,comm:0,mkt:0,disc:0,ddf:0,err:0,adj:0,net:0});
const L={};for(const l of LOCS)L[l]={loc:l,dd:z(),ddSep:z(),ddDec:z(),unpaidNet:0,gl:{dss:0,fees:0,dep:0,aje:0,open:0,end:0},depAssigned:0,depHolding:0,depDecPay:0,undep:[],weeks:{}};
const cat=x=>({sub:x.Subtotal,tax:-x['Subtotal tax remitted by DoorDash to tax authorities'],comm:-(x.Commission+x['Payment processing fee']),mkt:-x['Marketing fees | (including any applicable taxes)'],disc:-x['Customer discounts from marketing | (funded by you)'],ddf:-(x['Customer discounts from marketing | (funded by DoorDash)']+x['DoorDash marketing credit']+x['Customer discounts from marketing | (funded by a third-party)']+x['Third-party contribution']),err:-x['Error charges'],adj:-x.Adjustments,net:x['Net total']});
for(const x of det){const l=M[x['Store ID']];const d=x['Timestamp local date'];const c=cat(x);const b=d<START?L[l].ddDec:L[l].dd;
 for(const k in c)b[k]+=c[k];if(x['Transaction type']==='Order'&&!/Cancelled/.test(x['Final order status']))b.orders++;
 if(d>='2026-09-21')for(const k in c)L[l].ddSep[k]+=c[k];
 if(d>=START&&!x['Payout ID'])L[l].unpaidNet+=x['Net total'];
 if(d>=START){const w=wk(d);const W=L[l].weeks[w]=L[l].weeks[w]||{dd:0,gl:0,sub:0,tax:0,orders:0};W.dd+=c.sub+c.tax;W.sub+=c.sub;W.tax+=c.tax;if(x['Transaction type']==='Order')W.orders++}}
for(const x of g){const a=x.dr-x.cr;const o=L[x.loc];
 if(x.num.startsWith('NJ')){o.gl.dss+=a;const w=wk(x.date);const W=o.weeks[w]=o.weeks[w]||{dd:0,gl:0,sub:0,tax:0,orders:0};W.gl+=a}
 else if(/^doordash$/i.test(x.num))o.gl.fees-=a;else if(/^doordash aje?$/i.test(x.num))o.gl.aje+=a;else if(x.type==='Bank Deposit')o.gl.dep-=a;else if(/Balance/.test(x.num))o.gl.open+=a;else console.log('??',x);
 o.gl.end+=a}
const payDep={};for(const mt of matches){payDep[mt.p.id]=mt.d;const o=L[mt.p.store];if(mt.p.date<'2026-01-05'){L['FARE Holding LLC'].depDecPay+=mt.p.net;continue}o.depAssigned+=mt.p.net;if(mt.d.loc!==mt.p.store)o.depHolding+=mt.p.net}
for(const p of up)L[p.store].undep.push(p);
for(const l of LOCS){const o=L[l];for(const b of [o.dd,o.ddSep,o.ddDec])for(const k in b)b[k]=r2(b[k]);o.unpaidNet=r2(o.unpaidNet);for(const k in o.gl)o.gl[k]=r2(o.gl[k]);
 const d=o.dd;o.ddGross=r2(d.sub+d.tax);o.dedEx=r2(d.sub-d.net);o.undepAmt=r2(o.undep.reduce((s,p)=>s+p.net,0));
 o.dssPre=r2(o.gl.dss-d.tax);o.B=r2(o.dssPre-d.sub);o.T=d.tax;o.C=r2(o.dedEx-o.gl.fees);o.Csep=r2(o.ddSep.sub-o.ddSep.net);o.Cother=r2(o.C-o.Csep);o.D=r2(d.net-o.depAssigned);
 o.correct=l==='FARE Holding LLC'?r2(o.gl.open-o.depDecPay):r2(o.gl.dss-o.gl.fees-o.depAssigned);
 o.check=r2(o.B+o.T+o.C+o.D-(l==='FARE Holding LLC'?0:o.correct));o.postDiff=r2(o.gl.end-o.correct)}
const g4104=load('gl4104.csv').filter(x=>x.date<=END&&x.date>=START);for(const l of LOCS)L[l].gl4104=r2(g4104.filter(x=>x.loc===l).reduce((a,x)=>a+x.cr-x.dr,0));
module.exports={L,LOCS,r2,payDep,matches,up,g,END,START,cat};
if(require.main===module){console.table(LOCS.map(l=>{const o=L[l];return{loc:l.slice(5,22),orders:o.dd.orders,ddGross:o.ddGross,dss:o.gl.dss,B:o.B,tax:o.T,ded:o.dedEx,fees:o.gl.fees,C:o.C,sep:o.Csep,D:o.D,unpaid:o.unpaidNet,undep:o.undepAmt,dec:o.ddDec.net,correct:o.correct,chk:o.check,posted:o.gl.end,diff:o.postDiff,aje:o.gl.aje,depH:r2(o.depHolding)}}));
const t=k=>r2(LOCS.reduce((s,l)=>s+L[l][k],0));console.log('correct',t('correct'),'posted',r2(LOCS.reduce((s,l)=>s+L[l].gl.end,0)),'decNet',r2(LOCS.reduce((s,l)=>s+L[l].ddDec.net,0)),'decpay',L['FARE Holding LLC'].depDecPay)}
