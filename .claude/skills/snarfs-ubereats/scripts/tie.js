// Each Sunday's 10135 balance vs the Uber deposits booked the next Mon-Fri, per store; prints only the Sundays that miss.
// usage: node tie.js <gl.json> [from M/D/YYYY]
const g=require(require('path').resolve(process.argv[2]));const from=new Date(process.argv[3]||'1/1/2026');
const D=s=>new Date(s);const day=864e5;
for(const loc of [...new Set(g.map(x=>x.loc))]){
  const t=g.filter(x=>x.loc==loc);let bad=0;const out=[];
  const sundays=[...new Set(t.filter(x=>x.num=='UberEats').map(x=>x.d))].map(D).filter(d=>d>=from).sort((a,b)=>a-b);
  for(const s of sundays){
    const upto=t.filter(x=>D(x.d)<=s);const bal=upto.length?upto[upto.length-1].bal:t[0].beg;
    const dep=t.filter(x=>x.type=='Bank Deposit'&&D(x.d)>s&&D(x.d)<=new Date(+s+5*day));
    const sum=dep.reduce((a,x)=>a+x.cr-x.dr,0);const diff=Math.round((bal-sum)*100)/100;
    if(Math.abs(diff)>0.005){bad++;out.push(`  ${s.toLocaleDateString('en-US')} bal ${bal.toFixed(2)} dep ${sum.toFixed(2)} [${dep.map(x=>x.num+' '+x.d).join(', ')}] diff ${diff.toFixed(2)}`)}
  }
  console.log(loc,'weeks',sundays.length,'off',bad);out.forEach(l=>console.log(l));
}
