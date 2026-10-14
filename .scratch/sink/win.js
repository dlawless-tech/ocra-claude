const tx=require('./gl-long.json').slice(1);const D=s=>{const[m,d,y]=s.split('/');return +new Date(+y,m-1,+d)};const day=864e5;
const a=+new Date(2025,9,27), b=+new Date(2026,2,8); // weeks 10/27/25 - 3/8/26 (Mon-Sun)... use 3/8 Sun
const S=tx.filter(t=>/^NJ/.test(t.num)&&D(t.d)>=a&&D(t.d)<=b).reduce((x,t)=>x+t.dr-t.cr,0);
const P=tx.filter(t=>t.type==='Bank Deposit'&&D(t.d)>=a+5*day&&D(t.d)<=b+5*day);
const F=tx.filter(t=>/^DoorDash/.test(t.num)&&D(t.d)>=+new Date(2025,10,10)&&D(t.d)<=+new Date(2026,2,17));
const sum=(r,k)=>r.reduce((x,t)=>x+t[k],0);
console.log('sales',S.toFixed(2),'deposits',sum(P,'cr').toFixed(2),'n',P.length,'expected fees',(S-sum(P,'cr')).toFixed(2));
console.log('fee entries',F.length,(sum(F,'cr')-sum(F,'dr')).toFixed(2),F[0].num,'..',F[F.length-1].num);
console.log('diff (entries - expected)',((sum(F,'cr')-sum(F,'dr'))-(S-sum(P,'cr'))).toFixed(2));
const days=new Set(tx.filter(t=>/^NJ/.test(t.num)).map(t=>D(t.d)));const miss=[];
for(let d=+new Date(2025,8,1);d<=+new Date(2026,9,11);d+=day) if(!days.has(d)) miss.push(new Date(d).toLocaleDateString('en-US',{month:'numeric',day:'numeric',year:'2-digit',weekday:'short'}));
console.log('days without DSS DoorDash sales:',miss.length);console.log(miss.join(' | '));
