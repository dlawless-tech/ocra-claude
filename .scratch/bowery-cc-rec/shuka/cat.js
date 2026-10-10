const fs=require('fs');const o=JSON.parse(JSON.parse(fs.readFileSync('full.raw','utf8')));
const bank=JSON.parse(fs.readFileSync('csv.json','utf8')).filter(b=>new Date(b.pd)<=new Date('08/30/2026')&&b.type!=='Payment');
const R=o.w.map(r=>({amt:Math.round(r.credit*100),memo:r.company,date:r.date.slice(0,10)}));
const cat=s=>/UBER|LYFT|TRVL|CURB|TAXI|CITI BIKE/i.test(s)?'Travel':/AMAZON|AMZN/i.test(s)?'Amazon':'Other';
const f=x=>(x/100).toFixed(2);const tot={};
for(const b of bank){const c=cat(b.desc);tot[c]=tot[c]||{b:0,r:0};tot[c].b+=b.amt}
for(const r of R){const c=cat(r.memo);tot[c]=tot[c]||{b:0,r:0};tot[c].r+=r.amt}
for(const c in tot)console.log(c.padEnd(7),'bank',f(tot[c].b).padStart(9),'R365',f(tot[c].r).padStart(9),'gap',f(tot[c].b-tot[c].r).padStart(9));
// Other: exact amount matching
const B=bank.filter(b=>cat(b.desc)==='Other'),RO=R.filter(r=>cat(r.memo)==='Other');const used=new Set();const um=[];
for(const r of RO){const k=B.findIndex((b,i)=>!used.has(i)&&b.amt===r.amt);if(k>=0)used.add(k);else um.push(r)}
console.log('\nR365 Other not on bank:');um.forEach(r=>console.log(' ',r.date,f(r.amt),r.memo));
console.log('\nBank Other not in R365:');let t=0;B.forEach((b,i)=>{if(!used.has(i)){t+=b.amt;console.log(' ',b.td,'p'+b.pd,b.card,b.desc,f(b.amt))}});console.log('  total',f(t));
