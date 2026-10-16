const g=require("./gl2.json"),O=require("./orders-all.json");const S=process.argv[2];
const md=s=>{const[m,d,y]=s.split("/");return Date.UTC(+y,m-1,+d)/864e5};const ct=i=>{const[m,d,y]=new Date(i).toLocaleDateString("en-US",{timeZone:"America/Chicago"}).split("/");return Date.UTC(+y,m-1,+d)/864e5};
const f=n=>{const d=new Date(n*864e5);return (d.getUTCMonth()+1)+"/"+d.getUTCDate()};const r2=v=>Math.round(v*100)/100;
const rows=g[S].filter(r=>r.number!=="EZ Cater Fees").map(r=>({...r,day:md(r.date),amt:r2(r.debit-r.credit)}));
const os=O.filter(o=>o.store.replace(/^Snarf.s /,"")===S&&o.status!=="cancelled").map(o=>({...o,sub:ct(o.sub_at),ev:ct(o.at)}));
const sale=r=>/^NJ/.test(r.number);
// reversals net with equal earlier sale
for(const r of rows.filter(r=>!sale(r)&&r.type!=="Bank Deposit"&&r.number!=="EZ Cater"&&r.amt<0)){const o=rows.filter(x=>sale(x)&&!x.rev&&x.day<=r.day&&Math.abs(x.amt+r.amt)<=0.01).pop();if(o){o.rev=r.rev=1}}
const sales=rows.filter(r=>sale(r)&&!r.rev&&r.amt>0);
const cand=x=>os.filter(o=>!o.s&&o.sub-1<=x.day&&x.day<=o.ev+1);const take=(x,l)=>{l.forEach(o=>o.s=x);x.o=l};
for(const x of sales){const c=cand(x).find(o=>Math.abs(o.total-x.amt)<=0.10);if(c)take(x,[c])}
for(const x of sales.filter(x=>!x.o)){const c=cand(x);let h=null;for(let i=0;i<c.length&&!h;i++)for(let j=i+1;j<c.length&&!h;j++){if(Math.abs(c[i].total+c[j].total-x.amt)<=0.10)h=[c[i],c[j]];for(let k=j+1;k<c.length&&!h;k++)if(Math.abs(c[i].total+c[j].total+c[k].total-x.amt)<=0.10)h=[c[i],c[j],c[k]]}if(h)take(x,h)}
for(const x of sales.filter(x=>!x.o)){const c=cand(x).filter(o=>Math.abs(o.total-x.amt)<=0.10*o.total).sort((a,b)=>Math.abs(a.total-x.amt)-Math.abs(b.total-x.amt));if(c[0])take(x,[c[0]])}
const deps=rows.filter(r=>r.type==="Bank Deposit");
console.log("== "+S);
for(const d of deps){const w=d.day-2;const wk=os.filter(o=>o.ev>w-7&&o.ev<=w);const ss=[...new Set(wk.map(o=>o.s).filter(Boolean))];
 const D=r2(ss.reduce((t,x)=>t+x.amt,0)),due=r2(wk.reduce((t,o)=>t+o.due,0)),fee=r2(wk.reduce((t,o)=>t+o.total-o.due,0));
 console.log(`deposit ${d.date} ${d.credit.toFixed(2)} | orders delivered ${f(w-6)}-${f(w)}: ${wk.map(o=>o.order+" "+f(o.ev)+" "+o.total).join(", ")}`);
 console.log(`   R365 sales for them: ${ss.map(x=>x.date+" "+x.amt).join(", ")||"none"} = ${D} | Cr10150 ${r2(D-due)} Dr70470 ${fee} 42060 ${r2(D-due-fee)}`);}
console.log("R365 sales with no EZ order:",sales.filter(x=>!x.o).map(x=>x.date+" "+x.amt).join(", ")||"none");
console.log("R365 adjustments not netted:",rows.filter(r=>!sale(r)&&r.type!=="Bank Deposit"&&!r.rev).map(r=>r.date+" "+r.number+" "+r.amt).join(", ")||"none");
console.log("EZ orders with no R365 sale:",os.filter(o=>!o.s).map(o=>o.order+" "+f(o.ev)+" "+o.total).join(", ")||"none");
