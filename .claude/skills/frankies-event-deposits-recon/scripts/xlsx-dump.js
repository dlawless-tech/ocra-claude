const fs=require('fs'),os=require('os'),path=require('path');const {execFileSync}=require('child_process');
const src=process.argv[2];const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dx-'));
execFileSync('unzip',['-o','-q',src,'-d',dir]);const rd=f=>fs.readFileSync(path.join(dir,f),'utf8');
const unesc=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
const strs=[];if(fs.existsSync(path.join(dir,'xl/sharedStrings.xml')))for(const m of rd('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)){let t='';for(const n of m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g))t+=n[1];strs.push(unesc(t));}
const rels=rd('xl/_rels/workbook.xml.rels');
for(const s of rd('xl/workbook.xml').matchAll(/<sheet name="([^"]+)"[^>]*r:id="([^"]+)"/g)){
 const t=rels.match(new RegExp(`Id="${s[2]}"[^>]*Target="([^"]+)"|Target="([^"]+)"[^>]*Id="${s[2]}"`));
 const x=rd('xl/'+(t[1]||t[2]).replace(/^\/?xl\//,''));console.log('=====',unesc(s[1]));
 for(const row of x.matchAll(/<row [^>]*>([\s\S]*?)<\/row>/g)){const out=[];
  for(const cm of row[1].matchAll(/<c r="([A-Z]+\d+)"([^>]*?)(\/>|>([\s\S]*?)<\/c>)/g)){const ty=(cm[2].match(/t="([^"]+)"/)||[])[1];const v=((cm[4]||'').match(/<v>([\s\S]*?)<\/v>/)||[])[1];const f=((cm[4]||'').match(/<f[^>]*>([\s\S]*?)<\/f>/)||[])[1];
   if(v===undefined&&!f)continue;const val=ty==='s'?strs[+v]:unesc(v||'');out.push(cm[1]+'='+JSON.stringify(val)+(f?' {='+unesc(f)+'}':''));}
  if(out.length)console.log(out.join(' | '));}}
