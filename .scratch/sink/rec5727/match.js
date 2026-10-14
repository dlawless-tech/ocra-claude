const fs=require("fs");
const S=JSON.parse(fs.readFileSync("stmt.json","utf8"));
const o=JSON.parse(JSON.parse(fs.readFileSync("grid.raw","utf8")));
const R=[...o.ChecksWithdrawalsGrid.map(r=>({...r,g:"W",amt:r.credit-r.debit})),...o.DepositsOtherCreditsGrid.map(r=>({...r,g:"D",amt:-(r.debit-r.credit)}))];
R.forEach(r=>{r.d=new Date(r.date);r.ds=r.date.slice(5,10);});
const yr=s=>new Date("2026-"+s.post.replace("/","-")+"T12:00:00Z");
const used=new Set();const pairs=[],miss=[];
// pass 1 prefer cleared, closest date
for(const s of S){const sd=yr(s);
 const c=R.filter(r=>!used.has(r)&&Math.abs(r.amt-s.amt)<0.005).sort((a,b)=>(b.cleared-a.cleared)||Math.abs(a.d-sd)-Math.abs(b.d-sd));
 if(c[0]){used.add(c[0]);pairs.push([s,c[0]])}else miss.push(s)}
const f=r=>`${r.g} ${r.ds} ${r.amt.toFixed(2).padStart(10)} ${r.cleared?"X":"."} ${r.transaction} ${r.transactionType} | ${r.company} | ${r.comment}`;
console.log("== statement items with no R365 match");miss.forEach(s=>console.log(s.post,s.amt.toFixed(2),s.card,s.desc));
console.log("== matched but not cleared");pairs.filter(p=>!p[1].cleared).forEach(p=>console.log(p[0].post,p[0].desc,"->",f(p[1])));
console.log("== matched date gap >5d");pairs.filter(p=>Math.abs(p[1].d-yr(p[0]))>5*864e5).forEach(p=>console.log(p[0].post,p[0].desc,"->",f(p[1])));
console.log("== cleared in R365 but not on statement");R.filter(r=>r.cleared&&!used.has(r)).forEach(r=>console.log(f(r)));
console.log("== uncleared outstanding");R.filter(r=>!r.cleared&&!used.has(r)).forEach(r=>console.log(f(r)));
fs.writeFileSync("pairs.json",JSON.stringify(pairs.map(([s,r])=>({s,id:r.transactionDetailId,cleared:r.cleared}))));
