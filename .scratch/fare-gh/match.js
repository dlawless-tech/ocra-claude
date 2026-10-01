const {rows}=require('./gh');const M=require('./map');const g=require('./glparse').load('gl1103.csv');
const r2=x=>Math.round(x*100)/100;
const P={};for(const r of rows){const k=r.grubhub_store_id+'|'+r.payout_date+'|'+r.deposit_id;P[k]=P[k]||{store:M[r.grubhub_store_id],gh:r.grubhub_store_id,name:r.store_name.trim(),date:r.payout_date,ptype:r.payout_type,dep:r.deposit_id,amt:0,min:'9',max:'0'};const p=P[k];p.amt+=r.merchant_net_total;p.min=r.transaction_date<p.min?r.transaction_date:p.min;p.max=r.transaction_date>p.max?r.transaction_date:p.max}
const pays=Object.values(P).map((p,i)=>({...p,i,amt:r2(p.amt)}));
const deps=g.filter(x=>x.type==='Bank Deposit').map((x,i)=>({...x,i,amt:r2(x.cr-x.dr)}));
const dd=(a,b)=>(new Date(a)-new Date(b))/864e5;
const used=new Set(),m=[],mp=new Set();
const ok=(d,date)=>dd(d.date,date)>=-3&&dd(d.date,date)<=14;
for(const p of pays.sort((a,b)=>a.date<b.date?-1:1)){if(!p.amt)continue;
 const c=deps.filter(d=>!used.has(d.i)&&Math.abs(d.amt-p.amt)<0.005&&ok(d,p.date)).sort((a,b)=>Math.abs(dd(a.date,p.date))-Math.abs(dd(b.date,p.date)));
 if(c.length){used.add(c[0].i);mp.add(p.i);m.push({ps:[p],d:c[0]})}}
// pass2: one deposit = sum of a location's payouts same date
const grp={};for(const p of pays)if(!mp.has(p.i)&&p.amt){const k=p.store+'|'+p.date;(grp[k]=grp[k]||[]).push(p)}
for(const ps of Object.values(grp)){const s=r2(ps.reduce((a,p)=>a+p.amt,0));const c=deps.find(d=>!used.has(d.i)&&Math.abs(d.amt-s)<0.005&&ok(d,ps[0].date));if(c){used.add(c.i);ps.forEach(p=>mp.add(p.i));m.push({ps,d:c})}}
// pass3: one deposit = all stores' payouts same date (estate-wide ACH)
const gd={};for(const p of pays)if(!mp.has(p.i)&&p.amt){(gd[p.date]=gd[p.date]||[]).push(p)}
for(const ps of Object.values(gd)){const s=r2(ps.reduce((a,p)=>a+p.amt,0));const c=deps.find(d=>!used.has(d.i)&&Math.abs(d.amt-s)<0.005&&ok(d,ps[0].date));if(c){used.add(c.i);ps.forEach(p=>mp.add(p.i));m.push({ps,d:c,estate:true})}}
const up=pays.filter(p=>!mp.has(p.i)&&p.amt),ud=deps.filter(d=>!used.has(d.i));
const depOf={};for(const x of m)for(const p of x.ps)depOf[p.i]=x;
module.exports={pays,deps,m,up,ud,depOf,r2};
if(require.main===module){
console.log('payouts',pays.length,r2(pays.reduce((s,p)=>s+p.amt,0)),'deps',deps.length,r2(deps.reduce((s,d)=>s+d.amt,0)));
console.log('matched',m.length,r2(m.reduce((s,x)=>s+x.d.amt,0)),'multi',m.filter(x=>x.ps.length>1).length,'estate',m.filter(x=>x.estate).length);
console.log('unmatched payouts',up.length,r2(up.reduce((s,p)=>s+p.amt,0)));up.sort((a,b)=>a.date<b.date?-1:1).forEach(p=>console.log(' ',p.date,p.ptype,p.store,p.name,p.amt));
console.log('unmatched deps',ud.length,r2(ud.reduce((s,d)=>s+d.amt,0)));ud.sort((a,b)=>a.date<b.date?-1:1).forEach(d=>console.log(' ',d.date,d.loc,d.num,d.amt,d.comment.slice(0,60)));
const mis={};for(const x of m)for(const p of x.ps)if(x.d.loc!==p.store){const k=x.d.loc+' -> '+p.store;mis[k]=r2((mis[k]||0)+p.amt)}console.log(mis);}
