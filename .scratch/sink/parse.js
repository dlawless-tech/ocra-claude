const fs=require('fs');
function csv(t){const rows=[];let r=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c=='"'){if(t[i+1]=='"'){f+='"';i++}else q=false}else f+=c}else if(c=='"')q=true;else if(c==','){r.push(f);f=''}else if(c=='\n'||c=='\r'){if(c=='\r'&&t[i+1]=='\n')i++;r.push(f);rows.push(r);r=[];f=''}else f+=c}if(f||r.length){r.push(f);rows.push(r)}return rows}
const R=csv(fs.readFileSync(process.argv[2],'utf8'));const h=R[3];const ix=n=>h.indexOf(n);
const n=s=>+String(s).replace(/[,"]/g,'')||0;
const tx=R.slice(4).filter(r=>r[ix('TrxDate')]).map(r=>({d:r[ix('TrxDate')],type:r[ix('TrxType')],num:r[ix('TrxNumber')],cm:r[ix('Comment')],dr:n(r[ix('Debit')]),cr:n(r[ix('Credit')]),bal:n(r[ix('Textbox17')])}));
fs.writeFileSync('gl.json',JSON.stringify(tx,null,0));
tx.forEach(t=>console.log([t.d,t.type.padEnd(13),t.num.padEnd(22),t.dr.toFixed(2).padStart(9),t.cr.toFixed(2).padStart(9),t.bal.toFixed(2).padStart(9),t.cm.slice(0,40)].join(' ')));
