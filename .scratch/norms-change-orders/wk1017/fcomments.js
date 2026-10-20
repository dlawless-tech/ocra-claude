const fs=require('fs'),path=require('path');const dir=process.argv[2];const rd=f=>fs.readFileSync(path.join(dir,f),'utf8');
const strs=[];for(const m of rd('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)){let t='';for(const n of m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g))t+=n[1];strs.push(t);}
const book=rd('xl/workbook.xml'),rels=rd('xl/_rels/workbook.xml.rels');
for(const s of book.matchAll(/<sheet name="([^"]+)"[^>]*r:id="([^"]+)"/g)){const rel=(rels.match(new RegExp('<Relationship[^>]*Id="'+s[2]+'"[^>]*>'))||[''])[0];const tgt=rel.match(/Target="([^"]+)"/)[1].replace(/^\/?xl\//,'');
const c={};for(const m of rd('xl/'+tgt).matchAll(/<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)){const t=(m[2].match(/t="([^"]+)"/)||[])[1],v=((m[3]||'').match(/<v>([\s\S]*?)<\/v>/)||[])[1];if(v!==undefined)c[m[1]]=t==='s'?strs[+v]:v;}
for(const a in c){const r=+a.replace(/[A-Z]+/,'');if(/^B/.test(a)&&/10-1[1-7]|Total Week/.test(c[a])){const row=['C','D','E','F','G','H','I'].map(k=>k+'='+(c[k+r]??'')).join(' | ');console.log(s[1],c[a],row);}}}
