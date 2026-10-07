// week (Mon-Sun, keyed by Sunday) x store: sales, deposits, fee booked
const P=require('./parse.js'); const a=process.argv[2]; const r=P(`gl${a}.txt`);
const sun=s=>{const [m,d,y]=s.split('/').map(Number);const D=new Date(y,m-1,d);D.setDate(D.getDate()+(7-D.getDay())%7);return `${D.getMonth()+1}/${D.getDate()}`;};
const t={}; for(const x of r){const k=sun(x.date)+'|'+x.loc.replace('Flecha ','');t[k]=t[k]||{s:0,d:0,f:0,o:0};const v=t[k];
 if(x.kind==='sales')v.s+=x.dr-x.cr; else if(x.kind==='deposit')v.d+=x.cr-x.dr; else if(x.kind==='fee')v.f+=x.cr-x.dr; else v.o+=x.cr-x.dr;}
const stores=[...new Set(Object.keys(t).map(k=>k.split('|')[1]))].sort(); const weeks=[...new Set(Object.keys(t).map(k=>k.split('|')[0]))].sort((x,y)=>new Date('2026/'+x)-new Date('2026/'+y));
console.log(`\n${a}  week: sales/deposit/fee per store`); console.log('week  '+stores.map(s=>s.padEnd(26)).join(''));
for(const w of weeks)console.log(w.padEnd(6)+stores.map(s=>{const v=t[w+'|'+s];return (v?[v.s,v.d,v.f].map(n=>n.toFixed(0).padStart(7)).join(' '):'').padEnd(26);}).join(''));
const tot={};for(const[k,v]of Object.entries(t)){const s=k.split('|')[1];tot[s]=tot[s]||{s:0,d:0,f:0};for(const z of['s','d','f'])tot[s][z]+=v[z];}
for(const[s,v]of Object.entries(tot))console.log(`TOTAL ${s.padEnd(14)} sales ${v.s.toFixed(2)} dep ${v.d.toFixed(2)} fee ${v.f.toFixed(2)}  dep/sales ${(v.d/v.s*100).toFixed(1)}%  fee/sales ${(v.f/v.s*100).toFixed(1)}%  net ${(v.s-v.d-v.f).toFixed(2)}`);
