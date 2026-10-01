const fs=require('fs');
const D="C:/Users/trici/OCRA/TML's Files - General/Downloads/FARE Third Party Analysis/FARE Grubhub 2026_Details_12_29_25_to_9_27_26.csv";
function parse(t){const rows=[];let r=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c=='"'){if(t[i+1]=='"'){f+='"';i++}else q=false}else f+=c}else if(c=='"')q=true;else if(c==','){r.push(f);f=''}else if(c=='\n'){r.push(f.replace(/\r$/,''));rows.push(r);r=[];f=''}else f+=c}if(f||r.length){r.push(f);rows.push(r)}return rows}
const rows=parse(fs.readFileSync(D,'utf8').replace(/^\uFEFF/,''));const h=rows[0];
const TXT=['payout_date','payout_type','store_name','street_address','city','state','postal_code','grubhub_store_id','store_number','distribution_id','short_distribution_id','deposit_id','order_number','transaction_date','transaction_time_local','transaction_type','fulfillment_type','gh_plus_customer','transaction_id'];
const out=rows.slice(1).filter(r=>r.length>10).map(r=>{const o={};h.forEach((k,i)=>o[k]=TXT.includes(k)?r[i]:+(r[i]||0));return o});
module.exports={rows:out,h};
