// fees.js <gl.csv> <Sunday M/D/YYYY>... : sales Mon-Sun (DSS JEs), deposit the following Mon-Sun
const rows=require('./parse.js'); const c=v=>Math.round(v*100)/100;
const D=s=>{const[m,d,y]=s.split('/').map(Number);return Date.UTC(y,m-1,d)}; const day=864e5;
const other=rows.filter(r=>!(r.type==='Journal Entry'&&/^JE\d+$/.test(r.num))&&!(r.type==='Bank Deposit'));
const out=[];
for (const we of process.argv.slice(3)) { const e=D(we), s=e-6*day;
 for (const loc of [...new Set(rows.map(r=>r.loc))]) {
  const R=rows.filter(r=>r.loc===loc);
  const sales=c(R.filter(r=>r.type==='Journal Entry'&&/^JE\d+$/.test(r.num)&&D(r.date)>=s&&D(r.date)<=e).reduce((a,r)=>a+r.dr-r.cr,0));
  const deps=R.filter(r=>r.type==='Bank Deposit'&&D(r.date)>e&&D(r.date)<=e+7*day);
  const dep=c(deps.reduce((a,r)=>a+r.cr-r.dr,0));
  out.push({we,loc,sales,deposit:dep,deps:deps.map(r=>r.num+' '+r.date+' '+r.cr).join(';'),fee:c(sales-dep)}); } }
console.log(JSON.stringify(out,null,1)); console.error('non-DSS, non-deposit rows:'); other.forEach(r=>console.error(r.loc,r.date,r.num,r.dr,r.cr));
