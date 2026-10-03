const fs=require('fs');const out={};
for (const w of ['week.raw','week0913.raw','week0920.raw','week0927.raw']) {
 let s=fs.readFileSync('../fare-ghw/'+w,'utf8'); s=s.slice(s.indexOf('"{'), s.lastIndexOf('}"')+2); const x=JSON.parse(JSON.parse(s));
 for (const d of x.deposits) out[d.short_distribution_id]=d;
}
fs.writeFileSync('deps.json',JSON.stringify(out));
for (const d of Object.values(out)) console.log(d.short_distribution_id,d.rest_id,Object.keys(d).filter(k=>/date|time/i.test(k)).map(k=>k+'='+d[k]).join(' '),d.total);
