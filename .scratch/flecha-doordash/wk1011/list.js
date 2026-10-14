const L=require("fs").readFileSync(process.argv[2],"utf8").split(/\r?\n/);const p=l=>{const o=[];let s="",q=false;for(const c of l){if(c==='"')q=!q;else if(c===","&&!q){o.push(s);s=""}else s+=c}o.push(s);return o};
const hi=L.findIndex(l=>l.startsWith("LocationName1,"));const h=p(L[hi]);const ix=k=>h.indexOf(k);
L.slice(hi+1).map(p).filter(r=>r[ix("TrxNumber")]&&!/^JE\d/.test(r[ix("TrxNumber")])&&r[ix("TrxType")]==="Journal Entry").forEach(r=>console.log([r[ix("LocationName1")],r[ix("TrxDate")],r[ix("TrxNumber")],r[ix("Debit")],r[ix("Credit")],r[10].slice(0,75)].join(" | ")))
