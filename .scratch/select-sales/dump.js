const fs=require('fs'),path=require('path');
const dir='x', rd=f=>fs.readFileSync(path.join(dir,f),'utf8');
const strs=[];for(const m of rd('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)){let t='';for(const n of m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g))t+=n[1];strs.push(t.replace(/&amp;/g,'&'));}
const book=rd('xl/workbook.xml'),rels=rd('xl/_rels/workbook.xml.rels');
const name=process.argv[2];
const id=book.match(new RegExp('<sheet name="'+name+'"[^>]*r:id="([^"]+)"'))[1];
const rel=rels.match(new RegExp('<Relationship[^>]*Id="'+id+'"[^>]*>'))[0];
const tgt=rel.match(/Target="([^"]+)"/)[1].replace(/^\/?xl\//,'');
for(const m of rd('xl/'+tgt).matchAll(/<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)){
 const t=(m[2].match(/t="([^"]+)"/)||[])[1],v=((m[3]||'').match(/<v>([\s\S]*?)<\/v>/)||[])[1],f=((m[3]||'').match(/<f[^>]*>([\s\S]*?)<\/f>/)||[])[1];
 if(v!==undefined||f) console.log(m[1]+'\t'+(t==='s'?strs[+v]:v)+(f&&process.argv[3]?'\t='+f:''));}
