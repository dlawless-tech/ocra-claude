const R=require("./r2285.json");const dv=s=>{const[m,d,y]=s.split("/").map(Number);return y*1e4+m*100+d};
const locs=[...new Set(R.map(r=>r.loc))];
const b=(l,t)=>R.filter(r=>r.loc===l&&dv(r.dt)<=t).reduce((s,r)=>s+r.cr-r.dr,0);
console.log("store".padEnd(20),"9/5".padStart(10),"accr P10".padStart(10),"bills P10".padStart(10),"other".padStart(9),"10/3".padStart(10),"now".padStart(10));
for(const l of locs){const p=R.filter(r=>r.loc===l&&dv(r.dt)>20260905&&dv(r.dt)<=20261003);
const acc=p.filter(r=>r.type==="Journal Entry"&&/Accrued Water/i.test(r.ref)).reduce((s,r)=>s+r.cr-r.dr,0);
const bil=p.filter(r=>r.type==="AP Invoice").reduce((s,r)=>s+r.cr-r.dr,0);
const tot=p.reduce((s,r)=>s+r.cr-r.dr,0);
console.log(l.padEnd(20),...[b(l,20260905),acc,bil,tot-acc-bil,b(l,20261003),b(l,30000000)].map(x=>x.toFixed(2).padStart(10)))}
