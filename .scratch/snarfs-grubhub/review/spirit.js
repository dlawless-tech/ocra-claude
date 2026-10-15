// Spirit: per Tue-Mon period, D (DSS debits), Grubhub deposits landing Tue-Fri after it, actual fees D - deposits, and the GrubHub entries posted
const fs=require('fs');
const parse=l=>{const o=[];let c='',q=false;for(const ch of l){if(ch=='"'){q=!q;continue}if(ch==','&&!q){o.push(c);c='';continue}c+=ch}o.push(c);return o};
const n=s=>parseFloat(String(s).replace(/,/g,''))||0;const iso=d=>{const[m,dd,y]=d.split('/');return y+'-'+m.padStart(2,'0')+'-'+dd.padStart(2,'0')};
const rows=fs.readFileSync('gl-10125.csv','utf8').split(/\r?\n/).slice(4).filter(Boolean).map(parse).filter(r=>r.length>13&&/^\d+\/\d+\/\d{4}$/.test(r[5])&&/Spirit/.test(r[0]));
const day=(s,k)=>new Date(Date.parse(s+'T12:00:00Z')+k*864e5).toISOString().slice(0,10);
const r2=x=>Math.round(x*100)/100;
const sales={},dep=[],je={};
for(const r of rows){const d=iso(r[5]);
 if(/^grub/i.test(r[7])) je[d]=r2((je[d]||0)+n(r[13])-n(r[12]));
 else if(r[6]==='Journal Entry') sales[d]=r2((sales[d]||0)+n(r[12])-n(r[13]));
 else dep.push([d,r[6],r[7],n(r[13])-n(r[12])]);}
console.log('beg',rows[0]&&rows[0][2],'end',rows[rows.length-1][14]);
for(let a='2026-04-28';a<='2026-10-06';a=day(a,7)){const b=day(a,6);let D=0;for(let x=a;x<=b;x=day(x,1))D+=sales[x]||0;D=r2(D);
 const dp=dep.filter(x=>x[0]>day(b,0)&&x[0]<=day(b,4));const DP=r2(dp.reduce((s,x)=>s+x[3],0));
 const entries=Object.entries(je).filter(([d])=>d>=a&&d<=b);
 console.log(a,b,'D',D.toFixed(2).padStart(7),'dep',DP.toFixed(2).padStart(7),'fees',r2(D-DP).toFixed(2).padStart(7),'rate',D?(100*(D-DP)/D).toFixed(1)+'%':'-','| posted',entries.map(([d,v])=>d.slice(5)+' '+v).join(', '),'| deps',dp.map(x=>x[0].slice(5)+' '+x[3]).join(', '));}
const other=dep.filter(x=>x[1]!=='Bank Deposit');console.log('non-deposit rows',other);
