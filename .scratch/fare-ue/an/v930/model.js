const {load}=require('./glparse');const ue=require('./ue.json');const M=require('./map');const {m:matches,up,ud}=require('./match');
const r2=x=>Math.round(x*100)/100;
const g1111=load('gl1111.csv').filter(x=>x.date<='2026-09-27');
const ACC={'7380':'gl7380.csv','7630':'gl7630.csv','4905':'gl4905.csv','7535':'gl7535.csv','2270':'gl2270.csv'};
const glFee={};for(const a in ACC)for(const x of load(ACC[a]))if(x.num==='UberEats Fees'&&x.date<='2026-09-27'){const k=x.loc;glFee[k]=glFee[k]||{};glFee[k][a]=(glFee[k][a]||0)+x.dr-x.cr}
const wk=d=>{const D=new Date(d+'T12:00:00');D.setDate(D.getDate()-((D.getDay()+6)%7));return D.toISOString().slice(0,10)};
const addDays=(d,n)=>{const D=new Date(d+'T12:00:00');D.setDate(D.getDate()+n);return D.toISOString().slice(0,10)};
const LOCS=['FARE 150 Riverside','FARE Loop (S Franklin)','FARE Lake + LaSalle','FARE Logan Square','FARE Northwestern Memorial Hospital','FARE Oak Park','FARE Old Post Office','FARE Sterling Food Hall','FARE Lakeview (W Diversey)','FARE Old Town','FARE Holding LLC'];
const F={mf:['Marketplace Fee','Tax on Marketplace Fee','Delivery Network Fee','Tax on Delivery Network Fee','Order Processing Fee','Bag Fee'],offers:['Offers on items (incl. tax)','Delivery Offer Redemptions (incl. tax)'],orf:['Offer Redemption Fee'],madj:['Marketing Adjustment'],other:['Other payments','Capital payments','Container Deposit Fee'],cb:['Chargeback Amount (incl. tax)','Price Adjustments (incl. tax)'],mft:['Marketplace Facilitator Tax','Marketplace Facilitator Tax Adjustment'],bw:['Backup Withholding Tax','Garnishment']};
const sum=(o,ks)=>ks.reduce((s,k)=>s+(o[k]||0),0);
const inWin=o=>o.date>='2026-01-05'; // payouts for sales weeks from 12/29
const L={};for(const l of LOCS)L[l]={loc:l,ue:{orders:0,exc:0,tax:0,inc:0,payout:0,n:0,mf:0,offers:0,orf:0,madj:0,other:0,cb:0,mft:0,bw:0,cbx:0,cbtax:0},ueSept:{ded:0},ueDec:{payout:0,inc:0},gl:{dss:0,dssLast:0,dssPaidWin:0,fees:0,aje:0,dep:0,open:0,end:0},fee:glFee[l]||{},dep:{matched:0,matchedHere:0,postedElsewhere:0,undeposited:0,undepList:[],unmatchedHere:0},weeks:{}};
for(const o of ue){const l=M[o['Store Name']];const x=L[l];
 if(!inWin(o)){x.ueDec.payout+=o['Total payout'];x.ueDec.inc+=o['Sales (incl. tax)'];continue}
 const u=x.ue;u.n++;u.orders+=o['Order Count'];u.exc+=o['Sales (excl. tax)'];u.tax+=o['Tax on Sales'];u.inc+=o['Sales (incl. tax)'];u.payout+=o['Total payout'];u.cbx+=o['Chargeback Amount'];u.cbtax+=o['Tax on Chargeback Amount'];
 for(const k in F)u[k]+=sum(o,F[k]);
 if(o.date>='2026-09-08')x.ueSept.ded+=o['Sales (incl. tax)']-o['Total payout'];
 const w=wk(addDays(o.date,-7));x.weeks[w]=x.weeks[w]||{gl:0,ue:0,payout:0,pd:[]};x.weeks[w].ue+=o['Sales (incl. tax)'];x.weeks[w].payout+=o['Total payout'];x.weeks[w].pd.push(o.date);}
for(const r of g1111){const x=L[r.loc];const a=r.dr-r.cr;
 if(r.num.startsWith('NJ')){x.gl.dss+=a;if(r.date>='2026-09-21')x.gl.dssLast+=a;else{const w=wk(r.date);x.weeks[w]=x.weeks[w]||{gl:0,ue:0,payout:0,pd:[]};x.weeks[w].gl+=a}}
 else if(r.num==='UberEats Fees')x.gl.fees-=a; else if(r.num==='UberEats AJE')x.gl.aje+=a; else if(r.type==='Bank Deposit')x.gl.dep-=a; else if(r.num==='Balance Sheet')x.gl.open+=a;
 x.gl.end+=a;}
for(const mt of matches){L[mt.p.store].dep.matched+=mt.p.amt;if(mt.d.loc===mt.p.store)L[mt.p.store].dep.matchedHere+=mt.p.amt;else L[mt.p.store].dep.postedElsewhere+=mt.p.amt}
for(const p of up){if(p.date<'2026-01-05')continue;L[p.store].dep.undeposited+=p.amt;L[p.store].dep.undepList.push(p)}
for(const d of ud){L[d.loc].dep.unmatchedHere+=d.amt}
// Logan/LaSalle catch-up: weekly 7/13 double week
module.exports={L,LOCS,r2,matches,up,ud,g1111,glFee};
if(require.main===module){for(const l of LOCS){const x=L[l];const u=x.ue;const fee=Object.values(x.fee).reduce((a,b)=>a+b,0);
 console.log(l.padEnd(36),'UEinc',r2(u.inc),'GLdss',r2(x.gl.dss-x.gl.dssLast),'var',r2(x.gl.dss-x.gl.dssLast-u.inc),'| UEded',r2(u.inc-u.payout),'GLfee',r2(x.gl.fees),r2(fee),'Sept',r2(x.ueSept.ded),'| pay',r2(u.payout),'depM',r2(x.dep.matched),'undep',r2(x.dep.undeposited),'| end',r2(x.gl.end),'last',r2(x.gl.dssLast))}}
