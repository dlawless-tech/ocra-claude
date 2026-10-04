const fs=require('fs'); const want=fs.readFileSync('ids.txt','utf8').trim().split(/\r?\n/).map(l=>l.split('|'));
const got={};
for (const f of ['h1.txt','h2.txt','h3.txt','h4.txt']) for (const l of fs.readFileSync(f,'utf8').split(/\r?\n/)) {
  if(!l) continue; const raw=l.split('|').slice(3).join('|');
  let e; try{ e=JSON.parse(JSON.parse(raw)); }catch(x){ continue; }
  if(!e.lines||!e.lines.length) continue;
  const locs=[...new Set(e.lines.map(x=>x[4]))]; if(locs.length!==1) continue;
  const [m,d,y]=e.date.split('/'); const key=y+'-'+m.padStart(2,'0')+'-'+d.padStart(2,'0')+'|'+locs[0].replace(/^\d+ - /,'');
  got[key]=e;
}
const out={}, miss=[];
for (const w of want) { const k=w[0]+'|'+w[1]; if(got[k]) out[k]={id:w[2],...got[k]}; else miss.push(w.join('|')); }
fs.writeFileSync('entries.json', JSON.stringify(out,null,1));
fs.writeFileSync('ids-miss.txt', miss.join('\n')+(miss.length?'\n':''));
console.log('valid', Object.keys(out).length, 'missing', miss.length);
