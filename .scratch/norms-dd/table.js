const e=require('./entries.json'); const ar=require('./ar.json');
const rows=Object.entries(e).sort();
for(const [k,x] of rows){ const [d,loc]=k.split('|'); const L={}; for(const l of x.lines) L[l[3]]=[l[1],l[2],l[0].slice(0,4)];
  const s=n=>L[n]?(L[n][0]?'+'+L[n][0]:L[n][1]?'-'+L[n][1]:'0'):'?';
  const ed=(+d.slice(5,7))+'/'+(+d.slice(8))+'/2026'; const a=ar[loc][ed];
  const dr=x.lines.reduce((s,l)=>s+l[0+1],0), cr=x.lines.reduce((s,l)=>s+l[2],0);
  console.log(d.slice(5), loc.padEnd(16), 'AR', s('a/r doordash - payout').padStart(9), 'com', s('commission & fees').padStart(8), 'mkt', s('marketing spend').padStart(7), 'amd', s('amendments').padStart(7), 'dif', s('difference').padStart(8), '| D', a.D, 'GLcr', a.arCredit, Math.abs(dr-cr)>0.005?'UNBAL':'', x.lines.length!==5?'LINES'+x.lines.length:'', Object.keys(L).join(';').length>70?Object.keys(L).join(';'):'');
}
