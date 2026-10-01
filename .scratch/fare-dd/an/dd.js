// payouts grouped by Payout ID, with per-component totals
const {det,pay,sales}=require('./load');const M=require('./map');
const C={sub:'Subtotal',taxm:'Subtotal tax passed to merchant',comm:'Commission',ppf:'Payment processing fee',mktf:'Marketing fees | (including any applicable taxes)',discYou:'Customer discounts from marketing | (funded by you)',discDD:'Customer discounts from marketing | (funded by DoorDash)',disc3:'Customer discounts from marketing | (funded by a third-party)',ddCredit:'DoorDash marketing credit',tp:'Third-party contribution',err:'Error charges',adj:'Adjustments',net:'Net total',taxDD:'Subtotal tax remitted by DoorDash to tax authorities'};
const P={};for(const p of pay){const id=p['Payout ID'];const o=P[id]=P[id]||{id,store:M[p['Store ID']],date:p['Payout date'],rows:0};o.rows++;for(const k in C)o[k]=+((o[k]||0)+(p[C[k]]||0)).toFixed(2)}
const add=(d,n)=>{const D=new Date(d+'T12:00:00Z');D.setUTCDate(D.getUTCDate()+n);return D.toISOString().slice(0,10)};
const wk=d=>{const D=new Date(d+'T12:00:00Z');D.setUTCDate(D.getUTCDate()-((D.getUTCDay()+6)%7));return D.toISOString().slice(0,10)};
for(const o of Object.values(P)){o.wkStart=add(o.date,-10);o.wkEnd=add(o.date,-4)}
// detail by store+sales week (local date)
const W={};for(const x of det){const s=M[x['Store ID']];const w=wk(x['Timestamp local date']);const k=s+'|'+w;const o=W[k]=W[k]||{store:s,wk:w,orders:0,paid:0,unpaid:0};if(x['Transaction type']==='Order')o.orders++;for(const c in C)o[c]=+((o[c]||0)+(x[C[c]]||0)).toFixed(2);if(x['Payout ID'])o.paid+=x['Net total'];else o.unpaid+=x['Net total']}
module.exports={P:Object.values(P).sort((a,b)=>a.date<b.date?-1:1),W:Object.values(W),C,add,wk,det,sales,M};
if(require.main===module){const ps=module.exports.P;console.log(ps.length,ps.filter(p=>p.rows>1).length);console.log(ps.filter(p=>p.date<'2026-01-05').map(p=>p.store+' '+p.net))}
