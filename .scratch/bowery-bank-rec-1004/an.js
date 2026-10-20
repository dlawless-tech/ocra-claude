// usage: node an.js rec.raw bank.csv startDate(YYYY-MM-DD, exclusive) endDate
const fs=require('fs');const [raw,csv,st,en]=process.argv.slice(2);
const r=JSON.parse(JSON.parse(fs.readFileSync(raw,'utf8')));
const parse=l=>{const o=[];let c='',q=false;for(const ch of l){if(ch=='"')q=!q;else if(ch==','&&!q){o.push(c);c=''}else c+=ch}o.push(c);return o};
const lines=fs.readFileSync(csv,'utf8').trim().split(/\r?\n/);const H=parse(lines[0]);
const iso=s=>{const [m,d,y]=s.split('/');return `${y}-${m}-${d}`};
const bank=lines.slice(1).map(parse).map(a=>({date:iso(a[1]),desc:a[2].trim(),amt:+a[3],bal:+a[5],chk:a[6]}));
const inP=bank.filter(b=>b.date>st&&b.date<=en);
const dt=x=>new Date(x).toISOString().slice(0,10);
const items=[...r.ChecksWithdrawalsGrid.map(x=>({...x,amt:-x.credit})),...r.DepositsOtherCreditsGrid.map(x=>({...x,amt:x.debit}))].map(x=>({d:dt(x.date),amt:Math.round(x.amt*100)/100,no:x.transaction,type:x.transactionType,co:x.company,cm:x.comment,cl:x.cleared,id:x.transactionId}));
console.log('bank lines in period',inP.length,'net',inP.reduce((s,b)=>s+b.amt,0).toFixed(2),'first/last bal');
const sorted=[...bank].sort((a,b)=>a.date<b.date?-1:1);
const bAt=d=>{const x=bank.filter(b=>b.date<=d);return x.length?x[0].bal:null};
console.log('bank bal at start',bAt(st),'at end',bAt(en));
console.log('R365 items',items.length,'cleared',items.filter(i=>i.cl).length,'cleared net',items.filter(i=>i.cl).reduce((s,i)=>s+i.amt,0).toFixed(2));
// match
const pool=items.map(i=>({...i,used:false}));const unb=[];
for(const b of inP){let m=null;
 if(b.chk) m=pool.find(i=>!i.used&&i.no==b.chk&&Math.abs(i.amt-b.amt)<0.005);
 if(!m) m=pool.find(i=>!i.used&&i.cl&&Math.abs(i.amt-b.amt)<0.005);
 if(!m) m=pool.find(i=>!i.used&&Math.abs(i.amt-b.amt)<0.005);
 if(m){m.used=true;b.m=m}else unb.push(b)}
console.log('\n== bank lines with no R365 item ('+unb.length+')');unb.forEach(b=>console.log(b.date,b.amt.toFixed(2),b.chk,b.desc));
console.log('\n== matched but NOT cleared');inP.filter(b=>b.m&&!b.m.cl).forEach(b=>console.log(b.date,b.amt.toFixed(2),b.desc,'->',b.m.d,b.m.no,b.m.type,b.m.co));
console.log('\n== cleared in R365 but not matched to a period bank line');pool.filter(i=>i.cl&&!i.used).forEach(i=>console.log(i.d,i.amt.toFixed(2),i.no,i.type,i.co,i.cm));
fs.writeFileSync(raw.replace(/\.raw$/,'.match.json'),JSON.stringify({inP,pool},null,1));
