const fs=require('fs');const L=fs.readFileSync('gl1235.csv','utf8').split(/\r?\n/);
const p=l=>{const o=[];let s='',q=false;for(const c of l){if(c=='"')q=!q;else if(c==','&&!q){o.push(s);s=''}else s+=c}o.push(s);return o};
const hi=L.findIndex(l=>l.startsWith('LocationName1,'));const h=p(L[hi]);const i=k=>h.indexOf(k);const n=v=>+String(v).replace(/,/g,'')||0;
const rows=L.slice(hi+1).filter(Boolean).map(p).filter(r=>r[i('TrxDate')]);
const tp={};for(const r of rows){if(!/3rd Party/i.test(r[i('TrxNumber')]))continue;const k=r[i('TrxDate')]+'|'+r[i('LocationName1')]+'|'+r[i('TrxNumber')];tp[k]=(tp[k]||0)+n(r[i('Credit')])-n(r[i('Debit')]);}
for(const k of Object.keys(tp).filter(k=>/^(8\/(2[4-9]|3)|9|10)/.test(k)).sort())console.log(k,tp[k].toFixed(2));
const lines=require('./lines.json');const by={};for(const x of lines){by[x.store]=by[x.store]||{fee:0,sales:0};by[x.store].fee+=x.fee;by[x.store].sales+=x.sales}
for(const s in by)console.log(s,'sales',by[s].sales.toFixed(2),'fee',by[s].fee.toFixed(2),(by[s].fee/by[s].sales*100).toFixed(1)+'%');
console.log(h.join(','))
