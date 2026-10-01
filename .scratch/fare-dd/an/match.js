const {load}=require('./glparse');const {P}=require('./dd');
const g=load('gl1102.csv');
const deps=g.filter(x=>x.type==='Bank Deposit').map((x,i)=>({...x,i,amt:+(x.cr-x.dr).toFixed(2)}));
const dd=(a,b)=>(new Date(a)-new Date(b))/864e5;
const used=new Set(),m=[];
for(const p of P){if(!p.net)continue;
 const c=deps.filter(d=>!used.has(d.i)&&Math.abs(d.amt-p.net)<0.005&&dd(d.date,p.date)>=-2&&dd(d.date,p.date)<=10).sort((a,b)=>(a.loc===p.store?0:1)-(b.loc===p.store?0:1)||Math.abs(dd(a.date,p.date))-Math.abs(dd(b.date,p.date)));
 if(c.length){used.add(c[0].i);m.push({p,d:c[0]})}}
const mp=new Set(m.map(x=>x.p.id));
const up=P.filter(p=>!mp.has(p.id)&&p.net),ud=deps.filter(d=>!used.has(d.i));
module.exports={m,up,ud,deps,g};
if(require.main===module){const s=a=>a.reduce((t,x)=>t+x,0).toFixed(2);
console.log('matched',m.length,s(m.map(x=>x.p.net)),'unmatched payouts',up.length,s(up.map(x=>x.net)),'unmatched deps',ud.length,s(ud.map(x=>x.amt)));
const mis={};for(const x of m){const k=x.d.loc+' -> '+x.p.store;mis[k]=+((mis[k]||0)+x.p.net).toFixed(2)}console.table(mis);
console.log('-- unmatched payouts');up.forEach(p=>console.log(p.date,p.store,p.net,p.id));
console.log('-- unmatched deposits');ud.forEach(d=>console.log(d.date,d.loc,d.num,d.amt,d.comment.slice(0,50)));}
