const {L,LOCS,r2,matches,up,ud,g1111}=require('./model');const ue=require('./ue.json');const M=require('./map');const {load}=require('./glparse');
const add=(d,n)=>{const D=new Date(d+'T12:00:00');D.setDate(D.getDate()+n);return D.toISOString().slice(0,10)};
const dow=d=>new Date(d+'T12:00:00').getDay();
const depBy={};for(const mt of matches)depBy[mt.p.ref]=mt.d;
const lasalle=ud.find(d=>d.num==='BD002517');
const dss=g1111.filter(x=>x.num.startsWith('NJ'));
const rows=[];
for(const l of LOCS){const ps=ue.filter(o=>M[o['Store Name']]===l&&o.date>='2026-01-05').sort((a,b)=>a.date<b.date?-1:1);let start='2025-12-29';
 for(const o of ps){const end=add(o.date,-(dow(o.date)||7));const glS=dss.filter(x=>x.loc===l&&x.date>=start&&x.date<=end).reduce((s,x)=>s+x.dr-x.cr,0);
  let d=depBy[o['Payout reference ID']];if(!d&&lasalle&&o['Payout reference ID']==='449EDNBXFGU2BKT')d=lasalle;
  rows.push({loc:l,pdate:o.date,ref:o['Payout reference ID'],start,end,orders:o['Order Count'],ueInc:o['Sales (incl. tax)'],glDss:r2(glS),salesVar:r2(glS-o['Sales (incl. tax)']),ded:r2(o['Sales (incl. tax)']-o['Total payout']),payout:o['Total payout'],depNum:d?d.num:'',depDate:d?d.date:'',depAmt:d?d.amt:0,depLoc:d?d.loc:'',depVar:r2((d?d.amt:0)-o['Total payout']),multi:(new Date(end)-new Date(start))/864e5>7});
  start=add(end,1);}
 const last=dss.filter(x=>x.loc===l&&x.date>=start&&x.date<='2026-09-27').reduce((s,x)=>s+x.dr-x.cr,0);L[l].unpaid={start,amt:r2(last)};}
module.exports={rows};
if(require.main===module){for(const r of rows)if(Math.abs(r.salesVar)>100||r.multi||r.depVar)console.log(r.loc.slice(5,18),r.pdate,r.start,r.end,r.ueInc,r.glDss,r.salesVar,r.payout,r.depAmt,r.depVar);for(const l of LOCS)console.log(l,L[l].unpaid)}
