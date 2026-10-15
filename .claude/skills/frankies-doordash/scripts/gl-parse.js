// Parse the GL Account Detail CSV into [{loc,beg,d,type,num,cm,dr,cr,bal}], dropping the export's repeated rows.
// usage: node gl-parse.js <gl.csv> <gl.json>
const fs=require('fs');
function csv(t){const rows=[];let r=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c=='"'){if(t[i+1]=='"'){f+='"';i++}else q=false}else f+=c}else if(c=='"')q=true;else if(c==','){r.push(f);f=''}else if(c=='\n'||c=='\r'){if(c=='\r'&&t[i+1]=='\n')i++;r.push(f);rows.push(r);r=[];f=''}else f+=c}if(f||r.length){r.push(f);rows.push(r)}return rows}
const R=csv(fs.readFileSync(process.argv[2],'utf8'));const h=R[3];const ix=n=>h.indexOf(n);const n=s=>+String(s).replace(/[,"]/g,'')||0;
const seen=new Set();const tx=[];
for(const r of R.slice(4)){if(!r[ix('TrxDate')])continue;const o={loc:r[ix('LocationName1')],beg:n(r[ix('BegBalAmount')]),d:r[ix('TrxDate')],type:r[ix('TrxType')],num:r[ix('TrxNumber')],cm:r[ix('Comment')],dr:n(r[ix('Debit')]),cr:n(r[ix('Credit')]),bal:n(r[ix('Textbox17')])};const k=JSON.stringify(o);if(seen.has(k))continue;seen.add(k);tx.push(o)}
fs.writeFileSync(process.argv[3],JSON.stringify(tx));
const locs=[...new Set(tx.map(x=>x.loc))];for(const l of locs){const t=tx.filter(x=>x.loc==l);console.log(l,'beg',t[0].beg,'rows',t.length,'end bal',t[t.length-1].bal)}
