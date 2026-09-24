const fs=require('fs');const M=require('./map.js');const det=require('./det.json');const gl=require('./gl.json');const grid=require('./grid.json');
const lines={};for(const l of fs.readFileSync(__dirname+'/lines.out','utf8').trim().split('\n')){const [d,loc,r]=l.split('\t');if(d==='2026-09-19')lines[loc]=JSON.parse(JSON.parse(r)).L.map(x=>x.split(' | '));}
const c=x=>Math.round(x*100);const f=x=>+(x/100).toFixed(2);
const work=[],rep=[];
for(const x of det.filter(x=>x.created>='2026-09-23')){
  const loc=M[x.rest],t=x.totals,D=c(gl[loc].D),net=x.total;
  const com=-t.commission_total,del=-t.grubhub_delivery_fee_total,proc=-t.processing_fee,tax=-t.withheld_sales_tax;
  const ar=D-net;const plug=ar-com-del-proc-tax;
  const L=lines[loc];const std=['ar grubhub - deposit','commissions','delivery commissions','order processing fees','sales tax'];
  const plugC=L.map(r=>r[3]).filter(s=>!std.includes(s));if(plugC.length!==1)throw loc+' plug '+plugC;
  if(tax&&!L.some(r=>r[3]==='sales tax'))throw loc+' no tax line';
  const ln=[{comment:'ar grubhub - deposit',col:ar>=0?'credit':'debit',amount:f(Math.abs(ar))},{comment:'commissions',col:'debit',amount:f(com)},{comment:'delivery commissions',col:'debit',amount:f(del)},{comment:'order processing fees',col:'debit',amount:f(proc)}];
  if(tax)ln.push({comment:'sales tax',col:'debit',amount:f(tax)});
  ln.push({comment:plugC[0],col:plug>=0?'debit':'credit',amount:f(Math.abs(plug))});
  const dr=ln.filter(l=>l.col==='debit').reduce((s,l)=>s+c(l.amount),0),cr=ln.filter(l=>l.col==='credit').reduce((s,l)=>s+c(l.amount),0);
  if(dr!==cr)throw loc+' unbalanced';
  const id=grid.find(g=>g.d==='2026-09-19'&&g.loc===loc).id;
  work.push({loc,id,tot:f(dr),lines:ln});
  rep.push([loc,x.sid,f(net),gl[loc].D,f(ar),f(com),f(del),f(proc),f(tax),f(plug),plugC[0],f(dr)]);
}
work.sort((a,b)=>a.loc<b.loc?-1:1);rep.sort((a,b)=>a[0]<b[0]?-1:1);
fs.writeFileSync(__dirname+'/work.json',JSON.stringify(work,null,1));
console.log('loc|deposit|net|D|AR cr|com|del|proc|tax|plug|plug comment|total');for(const r of rep)console.log(r.join('|'));
console.log('stores',work.length,'sum net',rep.reduce((s,r)=>s+c(r[2]),0)/100);
