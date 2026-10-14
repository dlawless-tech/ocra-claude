// Parse the GL Account Detail SSRS CSV into [{d,type,num,cm,dr,cr,bal}]. The export repeats its first data row; drop it.
// usage: node gl-parse.js <gl.csv> <gl.json>
const fs = require('fs');
function csv(t){const rows=[];let r=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c=='"'){if(t[i+1]=='"'){f+='"';i++}else q=false}else f+=c}else if(c=='"')q=true;else if(c==','){r.push(f);f=''}else if(c=='\n'||c=='\r'){if(c=='\r'&&t[i+1]=='\n')i++;r.push(f);rows.push(r);r=[];f=''}else f+=c}if(f||r.length){r.push(f);rows.push(r)}return rows}
const R = csv(fs.readFileSync(process.argv[2], 'utf8')); const h = R[3]; const ix = n => h.indexOf(n);
const n = s => +String(s).replace(/[,"]/g, '') || 0;
const tx = R.slice(4).filter(r => r[ix('TrxDate')]).map(r => ({ d: r[ix('TrxDate')], type: r[ix('TrxType')], num: r[ix('TrxNumber')], cm: r[ix('Comment')], dr: n(r[ix('Debit')]), cr: n(r[ix('Credit')]), bal: n(r[ix('Textbox17')]) })).slice(1);
fs.writeFileSync(process.argv[3], JSON.stringify(tx));
console.log(tx.length + ' rows, ' + tx[0].d + ' to ' + tx[tx.length - 1].d);
