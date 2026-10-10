const fs=require('fs');const o=JSON.parse(JSON.parse(fs.readFileSync('grid.raw','utf8')));
for(const k in o){const g=o[k];if(typeof g==='string'){console.log(k,g);continue;}console.log('==',k,g.n);let t=0;
g.rows.sort((a,b)=>a[0]<b[0]?-1:1).forEach(r=>{t+=r[1];console.log(r[0].slice(0,10),String(r[1].toFixed(2)).padStart(10),r[3],r[5],r[2])});console.log('total',t.toFixed(2));}
