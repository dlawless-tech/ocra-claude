// pooled deposits(window shifted by lag) / sales(window), sales window 8/3-9/20
const P=require('./parse.js'); const a=process.argv[2]; const r=P(`gl${a}.txt`);
const d=s=>{const [m,dd,y]=s.split('/').map(Number);return new Date(y,m-1,dd).getTime()/864e5;};
const A=d('8/3/2026'),B=d('9/20/2026'); const S=r.filter(x=>x.kind==='sales'&&d(x.date)>=A&&d(x.date)<=B).reduce((t,x)=>t+x.dr-x.cr,0);
const out=[]; for(let L=0;L<=14;L+=2){const D=r.filter(x=>x.kind==='deposit'&&d(x.date)>=A+L&&d(x.date)<=B+L).reduce((t,x)=>t+x.cr-x.dr,0); out.push(`lag${L}: ${(D/S*100).toFixed(1)}%`);}
console.log(a,'sales',S.toFixed(2),out.join('  '));
