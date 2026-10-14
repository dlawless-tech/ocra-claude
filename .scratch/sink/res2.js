const tx=require('./gl-long.json').slice(1);const D=s=>{const[m,d,y]=s.split('/');return +new Date(+y,m-1,+d)};const day=864e5;
const sales=(a,b)=>tx.filter(t=>/^NJ/.test(t.num)&&D(t.d)>=a&&D(t.d)<=b).reduce((x,t)=>x+t.dr-t.cr,0);
const fee=(a,b)=>tx.filter(t=>/^DoorDash/i.test(t.num)&&D(t.d)>=a&&D(t.d)<=b).reduce((x,t)=>x+t.cr-t.dr,0);
let prev=null;
for(let s=+new Date(2025,7,4);s<=+new Date(2026,8,21);s+=7*day){const e=s+6*day;
 const deps=tx.filter(t=>t.type==='Bank Deposit'&&D(t.d)>e&&D(t.d)<=e+7*day); const dep=deps[0];
 if(!dep){console.log(new Date(e).toLocaleDateString(),'NO DEPOSIT, sales',sales(s,e).toFixed(2));continue}
 const last=tx.filter(t=>D(t.d)<=D(dep.d)).pop(); const bal=last.bal;
 const exp=(sales(s,e)-dep.cr)+sales(e+day,D(dep.d)) - fee(e+day,D(dep.d)) + fee(e+day,D(dep.d)); // placeholder
 const r=bal-exp; const flag=prev===null||Math.abs(r-prev)>0.005?' <<':'';
 console.log(new Date(e).toLocaleDateString(),'dep',dep.d,dep.cr.toFixed(2),'bal',bal.toFixed(2),'resid',r.toFixed(2),deps.length>1?'MULTI':'',flag); prev=r;}
