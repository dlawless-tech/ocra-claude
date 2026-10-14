const fs=require('fs');const L=fs.readFileSync('gl1235.csv','utf8').split(/\r?\n/);
const p=l=>{const o=[];let s='',q=false;for(const c of l){if(c=='"')q=!q;else if(c==','&&!q){o.push(s);s=''}else s+=c}o.push(s);return o};
const hi=L.findIndex(l=>l.startsWith('LocationName1,'));const h=p(L[hi]);const i=k=>h.indexOf(k);const n=v=>+String(v).replace(/,/g,'')||0;
const D=s=>{const[m,d,y]=s.split('/').map(Number);return Date.UTC(y,m-1,d)};
const rows=L.slice(hi+1).filter(Boolean).map(p).filter(r=>r[i('TrxDate')]);
const st={};for(const r of rows){const s=r[i('LocationName1')];st[s]=st[s]||{beg:n(r[i('BegBalAmount')]),b104:0,b1011:0,tp:0};const t=D(r[i('TrxDate')]),v=n(r[i('Debit')])-n(r[i('Credit')]);
 if(t<=D('10/4/2026'))st[s].b104+=v;if(t<=D('10/11/2026')&&!(t>D('10/4/2026')&&r[i('TrxType')]=='Journal Entry'))st[s].b1011+=v;
 if(/^3rd Party$/.test(r[i('TrxNumber')])&&t>=D('8/30/2026')&&t<=D('10/4/2026'))st[s].tp+=-v;}
const lines=require('./lines.json');
for(const s in st){const fee=lines.filter(x=>x.store==s).reduce((a,x)=>a+x.fee,0);const x=st[s];
 console.log(s,'beg',x.beg.toFixed(2),'bal10/4',(x.beg+x.b104).toFixed(2),'3P booked',x.tp.toFixed(2),'backfill',fee.toFixed(2),
 'after backfill: 10/4',(x.beg+x.b104+x.tp-fee).toFixed(2),'10/11 excl 10/5+ JEs',(x.beg+x.b1011+x.tp-fee).toFixed(2))}
