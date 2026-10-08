const fs=require('fs');const [,,pf,jf]=process.argv;const p=JSON.parse(fs.readFileSync(pf,'utf8'));const je=JSON.parse(fs.readFileSync(jf,'utf8'));
const num=s=>parseFloat(String(s).replace(/,/g,''))||0;let bad=0,d=0,c=0;
for(const [i,dd,cc] of p){const r=je[i];if(!r||Math.abs(num(r[3])-dd)>.005||Math.abs(num(r[4])-cc)>.005){bad++;console.log('MISMATCH row',i,dd,cc,r&&r.slice(1,7).join('|'))}}
je.forEach(r=>{d+=num(r[3]);c+=num(r[4])});console.log('lines',je.length,'mismatched',bad,'debits',d.toFixed(2),'credits',c.toFixed(2));
