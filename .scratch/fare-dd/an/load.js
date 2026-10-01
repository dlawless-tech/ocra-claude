const fs=require('fs');const S='../src/';
function parse(t){const rows=[];let r=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c=='"'){if(t[i+1]=='"'){f+='"';i++}else q=false}else f+=c}else if(c=='"')q=true;else if(c==','){r.push(f);f=''}else if(c=='\n'){r.push(f.replace(/\r$/,''));rows.push(r);r=[];f=''}else f+=c}if(f||r.length){r.push(f);rows.push(r)}return rows}
function rd(prefix){const fn=fs.readdirSync(S).find(f=>f.startsWith(prefix));const rows=parse(fs.readFileSync(S+fn,'utf8').replace(/^﻿/,''));const h=rows[0];
 return rows.slice(1).filter(r=>r.length>=h.length-1).map(r=>{const o={};h.forEach((k,i)=>{const v=r[i];o[k]=(v!==''&&v!=='NULL'&&/^-?\d+\.\d\d$/.test(v))?+v:(v==='NULL'?null:v)});return o})}
const det=rd('FINANCIAL_DETAILED'),simp=rd('FINANCIAL_SIMPLIFIED'),err=rd('FINANCIAL_ERROR'),pay=rd('FINANCIAL_PAYOUT'),sales=rd('SALES_BY_ORDER');
module.exports={det,simp,err,pay,sales};
if(require.main===module){
 const cnt=(a,k)=>{const o={};for(const x of a)o[x[k]]=(o[x[k]]||0)+1;return o};
 console.log('stores det',cnt(det,'Store name'));console.log('types',cnt(det,'Transaction type'));console.log('channel',cnt(det,'Channel'));console.log('status',cnt(det,'Final order status'));
 console.log('pay stores',cnt(pay,'Store name'));console.log('pay status',cnt(pay,'Payout status'));console.log('pay channel',cnt(pay,'Channel'));
 console.log('sales stores',cnt(sales,'Store name'));console.log('sales cancelled',cnt(sales,'Is cancelled'));
 console.log(Object.keys(sales[0]).join('|'));
 const pd=cnt(pay,'Payout date');console.log(JSON.stringify(pd));
 console.log('det payout null',det.filter(x=>!x['Payout date']).length, 'min/max local date', det.map(x=>x['Timestamp local date']).sort()[0], det.map(x=>x['Timestamp local date']).sort().pop());
 console.log('descs', JSON.stringify(cnt(det.filter(x=>x['Transaction type']!=='Order'),'Description')).slice(0,3000));
}
