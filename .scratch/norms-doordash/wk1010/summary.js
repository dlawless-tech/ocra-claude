const fs=require('fs'); const gl=JSON.parse(fs.readFileSync('gl.json'));
const map=JSON.parse(fs.readFileSync(process.argv[2])); const pw=JSON.parse(fs.readFileSync('payouts-wide.json')).summariesList;
const n=s=>parseFloat(String(s).replace(/[$,]/g,''));
const stores="Anaheim,Carson,Claremont,Costa Mesa,Downey,El Monte,Hollywood,Huntington Beach,Inglewood,La Cienega,Lakewood,Las Vegas,North Torrance,Ontario,Orange,Pico Rivera,Rialto,Riverside,Santa Ana,Slauson,South Torrance,Van Nuys,West Covina,Whittier".split(',');
const inW=d=>{const [m,dd]=d.split('/').map(Number); return m===10&&dd>=5&&dd<=11;};
const out={};
for(const s of stores){ const g=gl[s]; if(!g){out[s]={D:0,days:0,missing:true}; console.log(s,'NOT IN REPORT'); continue;}
 const je=g.rows.filter(r=>r.type==='Journal Entry'&&inW(r.date)&&r.debit>0);
 const D=+je.reduce((a,r)=>a+r.debit,0).toFixed(2); const days=new Set(je.map(r=>r.date)).size;
 const dep=g.rows.filter(r=>r.type==='Bank Deposit'); const prev=pw.find(p=>map[p.storeId]===s);
 const dep9=dep.filter(r=>r.date==='10/9/2026');
 out[s]={D,days,beg:g.beg,dep9:dep9.map(r=>r.credit),prevNet:prev?n(prev.netPayout):null,otherRows:g.rows.filter(r=>!(r.type==='Journal Entry'&&r.debit>0)&&!(r.date==='10/9/2026'&&r.type==='Bank Deposit')).map(r=>`${r.date} ${r.type} ${r.debit}/${r.credit} ${r.memo}`)};
 console.log([s,D,days,g.beg,dep9.map(r=>r.credit).join('+'),prev?n(prev.netPayout):'-'].join(' | '), out[s].otherRows.length?JSON.stringify(out[s].otherRows):'', dep9.length>1?JSON.stringify(dep9.map(r=>r.memo)):'');
}
fs.writeFileSync('dsum.json',JSON.stringify(out,null,1));
