const fs=require('fs');
const rows=fs.readFileSync('chase3014.csv','utf8').trim().split(/\r?\n/).slice(1).map(l=>{const p=l.split(',');return{card:p[0],td:p[1],pd:p[2],pdd:new Date(p[2]),desc:p[3].replace(/\s+/g,' '),type:p[5],amt:Math.round(-parseFloat(p[6])*100)}});
fs.writeFileSync('csv.json',JSON.stringify(rows));
const sum=(a)=>(a.reduce((s,r)=>s+r.amt,0)/100).toFixed(2);
const win=(a,b)=>rows.filter(r=>r.pdd>=new Date(a)&&r.pdd<=new Date(b));
console.log('first post',rows.map(r=>r.pd).sort((a,b)=>new Date(a)-new Date(b))[0]);
for(const [a,b] of [['07/14/2026','08/13/2026'],['08/14/2026','08/30/2026'],['08/14/2026','09/13/2026']]){const w=win(a,b);const ch=w.filter(r=>r.type!=='Payment');const pay=w.filter(r=>r.type==='Payment');console.log(a,b,'charges',ch.length,sum(ch),'payments',pay.map(r=>r.pd+' '+(r.amt/100)).join(';'))}
const types={};rows.forEach(r=>types[r.type]=(types[r.type]||0)+1);console.log(types);
