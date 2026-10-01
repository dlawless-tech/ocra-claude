const fs=require('fs');
function parse(t){const rows=[];let r=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c=='"'){if(t[i+1]=='"'){f+='"';i++}else q=false}else f+=c}else if(c=='"')q=true;else if(c==','){r.push(f);f=''}else if(c=='\n'){r.push(f.replace(/\r$/,''));rows.push(r);r=[];f=''}else f+=c}if(f||r.length){r.push(f);rows.push(r)}return rows}
const n=s=>+(String(s||'0').replace(/,/g,'').replace(/^\((.*)\)$/,'-$1'));
function load(file){const rows=parse(fs.readFileSync(file,'utf8'));const hi=rows.findIndex(r=>r[0]==='LocationName1');const h=rows[hi];const ix=k=>h.indexOf(k);
 return rows.slice(hi+1).filter(r=>r.length>10&&r[ix('TrxDate')]).map(r=>{const [m,d,y]=r[ix('TrxDate')].split('/');return{loc:r[ix('LocationName')],acct:r[ix('AccountName')],beg:n(r[ix('BegBalAmount')]),date:`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`,type:r[ix('TrxType')],num:r[ix('TrxNumber')].trim(),co:r[ix('TrxCompany')],comment:r[ix('Comment')],dr:n(r[ix('Debit')]),cr:n(r[ix('Credit')])}})}
module.exports={load};
if(require.main===module){const g=load(process.argv[2]);console.log(g.length);
 const k={};for(const x of g){const key=x.type+' | '+x.num.replace(/\d+/g,'#')+' | '+x.comment.replace(/\d/g,'#').slice(0,40);k[key]=k[key]||{n:0,dr:0,cr:0};k[key].n++;k[key].dr+=x.dr;k[key].cr+=x.cr}
 Object.entries(k).sort((a,b)=>b[1].n-a[1].n).slice(0,40).forEach(([a,b])=>console.log(b.n,b.dr.toFixed(2),b.cr.toFixed(2),a));
 const L={};for(const x of g){L[x.loc]=L[x.loc]||{beg:x.beg,dr:0,cr:0};L[x.loc].dr+=x.dr;L[x.loc].cr+=x.cr}console.table(Object.fromEntries(Object.entries(L).map(([a,b])=>[a,{beg:b.beg,dr:+b.dr.toFixed(2),cr:+b.cr.toFixed(2),end:+(b.beg+b.dr-b.cr).toFixed(2)}])));}
