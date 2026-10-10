const fs=require('fs');const o=JSON.parse(JSON.parse(fs.readFileSync('full.raw','utf8')));
const c=r=>Math.round(r*100);
const bank=fs.readFileSync('chase.csv','utf8').trim().split(/\r?\n/).slice(1).map(l=>{const p=l.split(',');return{card:p[0],td:p[1],pd:p[2],desc:p[3],type:p[5],amt:c(-parseFloat(p[6]))}})
 .filter(b=>{const d=new Date(b.pd);return d>=new Date('08/07/2026')&&d<=new Date('08/30/2026')});
let bal=-1086259;for(const b of bank)bal-=b.amt;console.log('bank lines',bank.length,'bal 8/30',(bal/100).toFixed(2));
const W=o.w.map(r=>({id:r.transactionDetailId,date:r.date.slice(0,10),amt:c(r.credit),memo:r.company}));
const D=o.d.map(r=>({id:r.transactionDetailId,date:r.date.slice(0,10),amt:-c(r.debit),memo:r.comment}));
const items=[...W,...D];const used=new Set();const res=[];
const md=m=>{const x=m.match(/(\d{1,2})\/(\d{1,2})(?:-(\d{1,2})(?:\/(\d{1,2}))?)?/);if(!x)return null;const mo=+x[1],d1=+x[2];let mo2=mo,d2=d1;if(x[3]){if(x[4]){mo2=+x[3];d2=+x[4]}else d2=+x[3]}return[new Date(2026,mo-1,d1),new Date(2026,mo2-1,d2)]};
// pass1 exact single
for(const it of items){const i=bank.findIndex((b,k)=>!used.has(k)&&b.amt===it.amt);if(i>=0){used.add(i);it.m=[i]}}
// pass2 subset within date range
for(const it of items){if(it.m)continue;const r=md(it.memo);if(!r)continue;const cand=bank.map((b,k)=>k).filter(k=>{if(used.has(k))return false;const t=new Date(bank[k].td);return t>=new Date(r[0]-864e5*1)&&t<=new Date(+r[1]+864e5*1)});
 const sol=[];(function f(s,i,acc){if(sol.length)return;if(s===it.amt&&acc.length){sol.push([...acc]);return}if(i>=cand.length||acc.length>8)return;const v=bank[cand[i]].amt;if(v>0&&s+v<=it.amt||v<0)f(s+v,i+1,[...acc,cand[i]]);f(s,i+1,acc)})(0,0,[]);
 if(sol.length){sol[0].forEach(k=>used.add(k));it.m=sol[0]}}
let cl=0;for(const it of items){if(it.m)cl+=it.amt;}
console.log('MATCHED R365:');for(const it of items.filter(i=>i.m))console.log(it.date,(it.amt/100).toFixed(2).padStart(9),it.memo,'<=',it.m.map(k=>bank[k].td+' '+bank[k].desc.trim()+' '+(bank[k].amt/100).toFixed(2)).join(' | '));
console.log('\nUNMATCHED R365:');let u=0;for(const it of items.filter(i=>!i.m)){u+=it.amt;console.log(it.date,(it.amt/100).toFixed(2).padStart(9),it.memo)}console.log('total',(u/100).toFixed(2));
console.log('\nUNMATCHED BANK:');let ub=0;bank.forEach((b,k)=>{if(!used.has(k)){ub+=b.amt;console.log(b.td,b.pd,b.card,b.desc,(b.amt/100).toFixed(2))}});console.log('total',(ub/100).toFixed(2));
console.log('cleared net',(cl/100).toFixed(2));
fs.writeFileSync('matched.json',JSON.stringify(items.filter(i=>i.m).map(i=>({id:i.id,amt:i.amt,memo:i.memo}))));
