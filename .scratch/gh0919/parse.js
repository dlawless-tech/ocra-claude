const fs=require('fs');const raw=fs.readFileSync(process.argv[2],'utf8');
const m=raw.split('### Result')[1].split('### Ran')[0].trim();const o=JSON.parse(JSON.parse(m));
fs.writeFileSync(process.argv[3],JSON.stringify(o,null,1));
for(const x of o.out){console.log(x.status, x.body.slice(0,1500));}
