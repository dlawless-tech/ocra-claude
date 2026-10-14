const tx=require('./gh.json');const D=s=>{const[m,d,y]=s.split('/');return Date.UTC(+y,m-1,+d)};const day=864e5;
const fd=x=>{const d=new Date(x);return (d.getUTCMonth()+1)+'/'+d.getUTCDate()};const f=x=>x.toFixed(2).padStart(8);
const off=+process.argv[2]; // 0 = Mon-Sun, 1 = Tue-Mon, 2 = Wed-Tue
const fees=tx.filter(t=>t.type==='Journal Entry'&&!/^NJ/.test(t.num)).map(t=>({...t,a:+(t.cr-t.dr).toFixed(2)}));
let hit=0,n=0;
for(let s=D('6/1/2026')+off*day;s<=D('10/5/2026');s+=7*day){const e=s+6*day;
 const S=tx.filter(t=>/^NJ/.test(t.num)&&!t.cm&&D(t.d)>=s&&D(t.d)<=e).reduce((a,t)=>a+t.dr-t.cr,0);
 const dep=tx.filter(t=>t.type==='Bank Deposit'&&D(t.d)>e&&D(t.d)<=e+7*day);const P=dep.reduce((a,t)=>a+t.cr,0);
 const imp=+(S-P).toFixed(2);const m=fees.find(x=>Math.abs(x.a-imp)<0.02);n++;if(m)hit++;
 console.log((fd(s)+'-'+fd(e)).padEnd(11),f(S),dep.map(t=>t.d+' '+t.cr).join('+').padEnd(36),f(imp),m?'= '+m.num:'');}
console.log('matched',hit,'of',n);
