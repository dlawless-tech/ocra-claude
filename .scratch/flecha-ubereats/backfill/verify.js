const fs=require('fs');const L=fs.readFileSync('verify.csv','utf8').split(/\r?\n/);
const p=l=>{const o=[];let s='',q=false;for(const c of l){if(c=='"')q=!q;else if(c==','&&!q){o.push(s);s=''}else s+=c}o.push(s);return o};
const hi=L.findIndex(l=>l.startsWith('LocationName1,'));const h=p(L[hi]);const i=k=>h.indexOf(k);const n=v=>+String(v).replace(/,/g,'')||0;
const D=s=>{const[m,d,y]=s.split('/').map(Number);return Date.UTC(y,m-1,d)};
const rows=L.slice(hi+1).filter(Boolean).map(p).filter(r=>r[i('TrxDate')]);
const lines=require('./lines.json');const want={};for(const x of lines)want[x.weekEnding+'|'+x.store]=x.fee;
const got={},bal={},tp=[];
for(const r of rows){const s=r[i('LocationName1')],dt=r[i('TrxDate')],t=D(dt),num=r[i('TrxNumber')],v=n(r[i('Debit')])-n(r[i('Credit')]);
 if(num=='Uber Eats'&&t<=D('10/4/2026'))got[dt+'|'+s]=(got[dt+'|'+s]||0)-v;
 if(num=='3rd Party'&&t>=D('8/30/2026'))tp.push(dt+' '+s+' '+v);
 bal[s]=bal[s]||{b:n(r[i('BegBalAmount')]),open:0};
 if(t<=D('10/11/2026')){bal[s].b+=v; if(t>D('10/4/2026')&&(/^JE\d+$/.test(num)||num=='Uber Eats'))bal[s].open+=v}}
let bad=0;for(const k in want)if(Math.abs((got[k]||0)-want[k])>0.005){bad++;console.log('DIFF',k,want[k],got[k])}
for(const k in got)if(!(k in want)){bad++;console.log('EXTRA',k,got[k])}
console.log('Uber Eats entries checked',Object.keys(want).length,'diffs',bad,'| 3rd Party 1235 lines from 8/30:',tp.length?tp:'none');
for(const s in bal)console.log(s,'10/11 balance',bal[s].b.toFixed(2),'less 10/5-10/11 sales net of 10/11 est',bal[s].open.toFixed(2),'=> left from 10/4 and before',(bal[s].b-bal[s].open).toFixed(2));
