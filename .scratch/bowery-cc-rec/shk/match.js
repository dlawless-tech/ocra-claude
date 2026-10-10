const fs=require('fs');const o=JSON.parse(JSON.parse(fs.readFileSync('full.raw','utf8')));
const c=r=>Math.round(r*100),DAY=864e5,f2=x=>(x/100).toFixed(2);
const bank=fs.readFileSync('chase.csv','utf8').trim().split(/\r?\n/).slice(1).map(l=>{const p=l.split(',');return{card:p[0],td:new Date(p[1]),tds:p[1].slice(0,5),pd:new Date(p[2]),desc:p[3].replace(/\s+/g,' '),amt:c(-parseFloat(p[6]))}})
 .filter(b=>b.pd<=new Date('08/30/2026')&&!/PAYMENT -/.test(b.desc));
const W=o.w.map(r=>({id:r.transactionDetailId,date:r.date.slice(0,10),amt:c(r.credit),memo:r.company||r.comment}));
const D=o.d.map(r=>({id:r.transactionDetailId,date:r.date.slice(0,10),amt:-c(r.debit),memo:r.comment}));
const items=[...W,...D];const used=new Set();
const md=m=>{const x=m.match(/(\d{1,2})\/(\d{1,2})(?:[-,](\d{1,2})(?:\/(\d{1,2}))?)?/);if(!x)return null;const mo=+x[1],d1=+x[2];let mo2=mo,d2=d1;if(x[3]){if(x[4]&&+x[4]!==26){mo2=+x[3];d2=+x[4]}else d2=+x[3]}return[new Date(2026,mo-1,d1),new Date(2026,mo2-1,d2)]};
const cat=s=>/UBER|LYFT|CURB|CREATIVE|TRVL|PARKING/i.test(s)?'T':/AMAZON|AMZN|Amazon/i.test(s)?'A':'O';
for(const it of items)it.r=md(it.memo);
for(const it of items){if(!it.r)continue;let best=-1,bd=1e9;bank.forEach((b,k)=>{if(used.has(k)||b.amt!==it.amt)return;const dd=Math.min(Math.abs(b.td-it.r[0]),Math.abs(b.td-it.r[1]));if(dd<=3*DAY&&dd<bd){bd=dd;best=k}});if(best>=0){used.add(best);it.m=[best]}}
for(const it of items){if(it.m||!it.r)continue;const ct=cat(it.memo);const cand=bank.map((b,k)=>k).filter(k=>!used.has(k)&&cat(bank[k].desc)===ct&&bank[k].td>=it.r[0]-2*DAY&&bank[k].td<=+it.r[1]+2*DAY);
 let sol=null;(function f(s,i,acc){if(sol)return;if(s===it.amt&&acc.length){sol=[...acc];return}if(i>=cand.length)return;const v=bank[cand[i]].amt;if(s+v<=it.amt||v<0)f(s+v,i+1,[...acc,cand[i]]);f(s,i+1,acc)})(0,0,[]);
 if(sol){sol.forEach(k=>used.add(k));it.m=sol}}
console.log('MATCHED:');let cl=0;for(const it of items.filter(i=>i.m)){cl+=it.amt;console.log(it.date,f2(it.amt).padStart(9),it.memo,'<=',it.m.map(k=>bank[k].tds+' '+bank[k].desc+' '+f2(bank[k].amt)).join(' | '))}
console.log('matched net',f2(cl));
console.log('\nUNMATCHED R365:');let u=0;for(const it of items.filter(i=>!i.m)){u+=it.amt;console.log(it.date,f2(it.amt).padStart(9),it.memo)}console.log('total',f2(u));
console.log('\nUNMATCHED BANK (posted 8/23-8/30):');let ub=0;bank.forEach((b,k)=>{if(!used.has(k)){ub+=b.amt;console.log(b.tds,b.card,b.desc,f2(b.amt))}});console.log('total',f2(ub));
fs.writeFileSync('matched.json',JSON.stringify(items.filter(i=>i.m).map(i=>({id:i.id,amt:i.amt,memo:i.memo}))));
