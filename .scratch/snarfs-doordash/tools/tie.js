// At each Sunday: GL balance vs (DSS debits to date - DoorDash fees/mkt/amd/diff implied by payouts started to date - deposits to date) -> error
// expected bal = sum net of payouts started by Sunday - deposits by Sunday; err = GL bal - expected
// usage: node tie.js <pay.json> <gl.json> <loc fragment>
const fs=require('fs');const [pf,gf,loc]=process.argv.slice(2);
const P=JSON.parse(fs.readFileSync(pf)),G=JSON.parse(fs.readFileSync(gf)).filter(x=>x.loc.includes(loc));
const r2=v=>Math.round(v*100)/100;const gd=s=>{const[m,d,y]=s.split('/');return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`};
const cd=t=>new Date(t).toLocaleDateString('en-CA',{timeZone:'America/Chicago'});
const first=gd(G[0].d), last=gd(G[G.length-1].d);
let d=new Date(first+'T12:00:00Z');while(d.getUTCDay())d.setUTCDate(d.getUTCDate()+1);
const beg=G[0].beg; let prev=0;
console.log('Sunday      GLbal    undep.net   error   change');
for(;d.toISOString().slice(0,10)<=last;d.setUTCDate(d.getUTCDate()+7)){const s=d.toISOString().slice(0,10);
 const rows=G.filter(x=>gd(x.d)<=s);const bal=r2(beg+rows.reduce((a,x)=>a+x.dr-x.cr,0));
 const dep=rows.filter(x=>x.type==='Bank Deposit').reduce((a,x)=>a+x.cr-x.dr,0);
 const net=P.filter(p=>cd(p.start)<=s).reduce((a,p)=>a+p.net,0);
 const exp=r2(net-dep), err=r2(bal-exp);console.log(s,bal.toFixed(2).padStart(9),exp.toFixed(2).padStart(9),err.toFixed(2).padStart(9),r2(err-prev).toFixed(2).padStart(9));prev=err}
