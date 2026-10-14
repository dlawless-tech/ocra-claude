const tx=require('./gl-long.json').slice(1);const D=s=>{const[m,d,y]=s.split('/');return +new Date(+y,m-1,+d)};const day=864e5;
const fd=x=>{const d=new Date(x);return (d.getMonth()+1)+'/'+d.getDate()+'/'+String(d.getFullYear()).slice(2)};
const sales=(a,b)=>tx.filter(t=>/^NJ/.test(t.num)&&D(t.d)>=a&&D(t.d)<=b).reduce((x,t)=>x+t.dr-t.cr,0);
const fees=tx.filter(t=>t.type==='Journal Entry'&&!/^NJ/.test(t.num)).map(t=>({...t,amt:+(t.cr-t.dr).toFixed(2),used:false}));
const deps=tx.filter(t=>t.type==='Bank Deposit').map(t=>({...t,used:false}));
for(let s=+new Date(2025,8,8);s<=+new Date(2026,7,24);s+=7*day){const e=s+6*day;
 const S=+sales(s,e).toFixed(2); const ds=deps.filter(t=>!t.used&&D(t.d)>e&&D(t.d)<=e+8*day);
 const P=ds.length?ds[0].cr:0; if(ds.length) ds[0].used=true;
 const exp=+(S-P).toFixed(2); const f=fees.find(x=>!x.used&&Math.abs(x.amt-exp)<0.02);
 if(f) f.used=true;
 console.log((fd(s)+'-'+fd(e)).padEnd(18),'sales',S.toFixed(2).padStart(8),'dep',(ds[0]?ds[0].d:'-').padEnd(10),P.toFixed(2).padStart(8),'exp',exp.toFixed(2).padStart(8), f?'= '+f.num+' '+f.d:'** NO MATCH');}
console.log('\nUNMATCHED FEE ENTRIES (from 9/2025):');fees.filter(x=>!x.used&&D(x.d)>=+new Date(2025,8,8)).forEach(x=>console.log(x.d,x.num,x.amt));
console.log('\nUNUSED DEPOSITS:');deps.filter(x=>!x.used&&D(x.d)>=+new Date(2025,8,8)).forEach(x=>console.log(x.d,x.num,x.cr,x.cm));
