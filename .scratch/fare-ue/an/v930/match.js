const g=require('./glparse').load('gl1111.csv');const ue=require('./ue.json');const M=require('./map');
const deps=g.filter(x=>x.type==='Bank Deposit').map((x,i)=>({...x,i,amt:+(x.cr-x.dr).toFixed(2)}));
const pays=ue.map((o,i)=>({i,store:M[o['Store Name']],date:o.date,amt:o['Total payout'],ref:o['Payout reference ID']}));
const dd=(a,b)=>(new Date(a)-new Date(b))/864e5;
const used=new Set(),m=[];
// pass1 exact amount, deposit 0..10 days after payout
for(const p of pays.sort((a,b)=>a.date<b.date?-1:1)){ if(p.amt===0) continue;
 const c=deps.filter(d=>!used.has(d.i)&&Math.abs(d.amt-p.amt)<0.005&&dd(d.date,p.date)>=-3&&dd(d.date,p.date)<=10).sort((a,b)=>Math.abs(dd(a.date,p.date))-Math.abs(dd(b.date,p.date)));
 if(c.length){used.add(c[0].i);m.push({p,d:c[0]})}}
const mp=new Set(m.map(x=>x.p.i));
const up=pays.filter(p=>!mp.has(p.i)&&p.amt!==0), ud=deps.filter(d=>!used.has(d.i));
module.exports={m,up,ud,deps,pays};
if(require.main===module){
console.log('matched',m.length,m.reduce((s,x)=>s+x.p.amt,0).toFixed(2),'unmatched payouts',up.length,up.reduce((s,x)=>s+x.amt,0).toFixed(2),'unmatched deps',ud.length,ud.reduce((s,x)=>s+x.amt,0).toFixed(2));
console.log('-- misposted location (dep loc != payout store)');const mis={};for(const x of m){if(x.d.loc!==x.p.store){const k=x.d.loc+' -> '+x.p.store;mis[k]=(mis[k]||0)+x.p.amt}}console.table(mis);
console.log('-- unmatched payouts');up.sort((a,b)=>a.date<b.date?-1:1).forEach(p=>console.log(p.date,p.store,p.amt,p.ref));
console.log('-- unmatched deposits');ud.sort((a,b)=>a.date<b.date?-1:1).forEach(d=>console.log(d.date,d.loc,d.num,d.amt,d.comment.slice(0,50)));}
