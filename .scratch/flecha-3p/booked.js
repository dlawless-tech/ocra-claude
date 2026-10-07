// booked 3rd Party credit / same-week sales, per account x store-week, from the entry lines
const P=require('./parse.js'); const fs=require('fs');
const key=s=>{const [m,d,y]=s.split('/').map(Number);const D=new Date(y,m-1,d);D.setDate(D.getDate()+(7-D.getDay())%7);return `${D.getMonth()+1}/${D.getDate()}`;};
const E=fs.readFileSync('entries.jsonl','utf8').trim().split('\n').map(JSON.parse).filter(e=>e.num==='3rd Party');
for(const a of ['1235','1237','1238']){ const sales={}; for(const x of P(`gl${a}.txt`)) if(x.kind==='sales'){const k=key(x.date)+'|'+x.loc.replace('Flecha ','');sales[k]=(sales[k]||0)+x.dr-x.cr;}
 const out=[]; for(const e of E){const w=e.date.replace(/\/2026$/,''); for(const l of e.lines) if(l.a.startsWith(a)&&(l.cr||l.dr)){const s=l.loc.replace(/^\d+ - Flecha /,'');const v=sales[w+'|'+s]||0;out.push(`${w} ${s.slice(0,6)} ${(l.cr-l.dr).toFixed(2)}/${v.toFixed(2)}=${v?((l.cr-l.dr)/v*100).toFixed(1):'-'}%`);}}
 console.log('\n'+a+'\n'+out.join('\n')); }
