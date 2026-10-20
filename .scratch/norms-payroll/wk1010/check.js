const fs=require('fs');const n=s=>parseFloat(String(s||'0').replace(/,/g,''))||0;
const p=JSON.parse(fs.readFileSync(process.argv[2]));const l=JSON.parse(fs.readFileSync(process.argv[3]));
let bad=0;for(const [i,d,c] of p){if(Math.abs(n(l[i][3])-d)>0.001||Math.abs(n(l[i][4])-c)>0.001){bad++;console.log('MISMATCH',i,d,c,l[i]);}}
const D=l.reduce((a,r)=>a+n(r[3]),0),C=l.reduce((a,r)=>a+n(r[4]),0);
console.log('lines',l.length,'mismatches',bad,'debits',D.toFixed(2),'credits',C.toFixed(2));
for(const i of [5,6,7]) console.log(i,l[i][5],l[i][4]);
