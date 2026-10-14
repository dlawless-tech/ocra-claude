const tx=require('./gl.json');const D=s=>{const[m,d,y]=s.split('/');return new Date(+y,m-1,+d)};const f=x=>x.toFixed(2).padStart(9);
const day=864e5;const mon0=new Date(2026,6,6);
console.log('week Mon-Sun        sales    depFri   dep-amt   sales-dep  dssDays');
for(let s=+mon0;s<=+new Date(2026,9,5);s+=7*day){const e=s+6*day;
 const sales=tx.filter(t=>t.type==='Journal Entry'&&/^NJ/.test(t.num)&&+D(t.d)>=s&&+D(t.d)<=e);
 const dep=tx.filter(t=>t.type==='Bank Deposit'&&+D(t.d)>e&&+D(t.d)<=e+7*day);
 const S=sales.reduce((a,t)=>a+t.dr-t.cr,0),P=dep.reduce((a,t)=>a+t.cr,0);
 const fd=x=>{const d=new Date(x);return (d.getMonth()+1)+'/'+d.getDate()};
 console.log((fd(s)+'-'+fd(e)).padEnd(14),f(S),dep.map(t=>t.d).join(',').padStart(10),f(P),f(S-P),'  '+sales.length);}
