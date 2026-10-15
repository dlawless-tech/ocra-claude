// Per Mon-Sun week for one store: GL D, DoorDash payouts (by window start, Central), correct entry vs booked, deposits vs payout nets.
// usage: node weeks.js <pay.json> <gl.json> <loc fragment>
const fs=require('fs');const [pf,gf,loc]=process.argv.slice(2);
const P=JSON.parse(fs.readFileSync(pf)),G=JSON.parse(fs.readFileSync(gf)).filter(x=>x.loc.includes(loc));
const r2=v=>Math.round(v*100)/100, ymd=d=>d.toISOString().slice(0,10);
const ct=t=>new Date(new Date(t).toLocaleString('en-US',{timeZone:'America/Chicago'}));
const gd=s=>{const[m,d,y]=s.split('/');return new Date(Date.UTC(y,m-1,d))};
const sunOf=d=>{const s=new Date(d);s.setUTCDate(d.getUTCDate()+(7-d.getUTCDay())%7);return ymd(s)};
const W={};const w=k=>W[k]=W[k]||{D:0,dep:[],je:0,pay:[],end:null};
for(const x of G){const k=sunOf(gd(x.d));if(x.cm==='Third Party Delivery')w(k).D+=x.dr;else if(x.type==='Bank Deposit')w(k).dep.push(r2(x.cr-x.dr));else w(k).je+=x.cr-x.dr;w(k).end=x.bal}
for(const p of P){const s=ct(p.start);const k=sunOf(new Date(Date.UTC(s.getFullYear(),s.getMonth(),s.getDate())));w(k).pay.push(p)}
const out=[];
for(const k of Object.keys(W).sort()){const x=W[k];const t=f=>r2(x.pay.reduce((s,p)=>s+p[f],0));
 const o={sun:k,D:r2(x.D),sales:t('sales'),net:t('net'),fees:-t('fees'),mkt:-t('mkt'),amd:t('amd'),n:x.pay.length,booked:r2(x.je),dep:r2(x.dep.reduce((a,b)=>a+b,0)),end:x.end};
 o.ar=r2(o.D-o.net);o.diff=r2(o.D-o.sales);o.fix=r2(o.ar-o.booked);out.push(o)}
console.log('Sunday       D      DDsales   net     n  ar(cr)   booked   fix     D-Sales  end bal');
for(const o of out)console.log(o.sun,[o.D,o.sales,o.net].map(v=>v.toFixed(2).padStart(8)).join(' '),String(o.n).padStart(2),[o.ar,o.booked,o.fix,o.diff,o.end].map(v=>(+v).toFixed(2).padStart(8)).join(' '));
fs.writeFileSync('weeks-'+loc+'.json',JSON.stringify(out,null,1));
