// parse.js <gl.csv> : rows [loc,date,type,num,comment,debit,credit]
const fs=require('fs'); const t=fs.readFileSync(process.argv[2],'utf8').split(/\r?\n/);
const parse=l=>{const o=[];let c='',q=false;for(const ch of l){if(ch=='"')q=!q;else if(ch==','&&!q){o.push(c);c=''}else c+=ch}o.push(c);return o};
const h=parse(t[3]); const ix=k=>h.indexOf(k); const n=v=>+String(v).replace(/,/g,'')||0;
const rows=t.slice(4).filter(Boolean).map(parse).filter(r=>r[ix('TrxDate')]).map(r=>({loc:r[ix('LocationName1')],bloc:r[ix('LocationName')],beg:r[ix('BegBalAmount2')],date:r[ix('TrxDate')],type:r[ix('TrxType')],num:r[ix('TrxNumber')],cm:r[ix('Comment')],dr:n(r[ix('Debit')]),cr:n(r[ix('Credit')])}));
module.exports=rows; if(require.main===module) rows.forEach(r=>console.log([r.loc,r.beg,r.date,r.type,r.num,r.bloc,r.cm,r.dr,r.cr].join('|')));
