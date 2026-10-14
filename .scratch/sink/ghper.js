const o=require('./ghtx.json');const tz=process.argv[2]||'America/Denver';const startDow=+(process.argv[3]||2); // 2=Tue
const day=t=>new Date(t).toLocaleDateString('en-CA',{timeZone:tz});
const ord=o.tx.filter(x=>x.transaction_type!=='DISTRIBUTION');
const dist=o.tx.filter(x=>x.transaction_type==='DISTRIBUTION').map(x=>({d:x.transaction_time.slice(0,10),amt:-x.net_amount/100}));
// period key: start day of a 7-day period beginning on startDow, split at month end
const per={};
for(const x of ord){const d=day(x.transaction_time);const D=new Date(d+'T12:00:00Z');let back=(D.getUTCDay()-startDow+7)%7;let s=new Date(D-back*864e5);
 if(s.getUTCMonth()!==D.getUTCMonth()) s=new Date(Date.UTC(D.getUTCFullYear(),D.getUTCMonth(),1,12));
 const k=s.toISOString().slice(0,10);const p=per[k]=per[k]||{net:0,gross:0,n:0,last:d};p.net+=x.net_amount/100;p.gross+=x.prepaid_amount/100;p.n++;if(d>p.last)p.last=d;}
const used=new Set();
for(const k of Object.keys(per).sort()){const p=per[k];const m=dist.find((x,i)=>!used.has(i)&&Math.abs(x.amt-p.net)<0.015&&(used.add(i),true));
 console.log(k,'to',p.last,'n',String(p.n).padStart(3),'gross',p.gross.toFixed(2).padStart(8),'net',p.net.toFixed(2).padStart(8),m?'= paid '+m.d:'');}
console.log('unmatched payouts:',dist.filter((x,i)=>!used.has(i)).map(x=>x.d+' '+x.amt).join(', '));
