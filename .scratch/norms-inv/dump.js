const fs=require('fs');const rd=f=>fs.readFileSync('x/'+f,'utf8');
const strs=[];for(const m of rd('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)){let t='';for(const n of m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g))t+=n[1];strs.push(t)}
for(const f of fs.readdirSync('x/xl/worksheets').filter(f=>f.endsWith('.xml'))){console.log('== '+f);
const x=rd('xl/worksheets/'+f);
for(const r of x.matchAll(/<row [^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)){const out=[];
for(const c of r[2].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)){const body=c[3]||'';const v=(body.match(/<v>([\s\S]*?)<\/v>/)||[])[1];const fm=(body.match(/<f[^>]*>([\s\S]*?)<\/f>/)||[])[1];if(v==null&&!fm)continue;let val=/t="s"/.test(c[2])?strs[+v]:v;out.push(c[1]+'='+val+(fm?' {'+fm+'}':''))}
if(out.length)console.log(r[1]+': '+out.join(' | '))}}
