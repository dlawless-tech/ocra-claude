const fs=require('fs');
const D="C:/Users/trici/OCRA/TML's Files - General/Downloads/";
function parse(t){const rows=[];let r=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c=='"'){if(t[i+1]=='"'){f+='"';i++}else q=false}else f+=c}else if(c=='"')q=true;else if(c==','){r.push(f);f=''}else if(c=='\n'){r.push(f.replace(/\r$/,''));rows.push(r);r=[];f=''}else f+=c}if(f||r.length){r.push(f);rows.push(r)}return rows}
let out=[];
for(const fn of ['FARE UberEats 12.29 to 6.30.26.csv','FARE UberEats 7.1 to 9.27.26.csv']){
 const rows=parse(fs.readFileSync(D+fn,'utf8').replace(/^\uFEFF/,''));const h=rows[0].map(s=>s.trim());
 for(const r of rows.slice(1)){if(r.length<5)continue;const o={file:fn};h.forEach((k,i)=>{const v=r[i];o[k]=(v!==''&&!isNaN(v)&&!['Store Name','Payout Date','Payout reference ID','Store UUID','External Store ID','Currency Code'].includes(k))?+v:v});
 const [m,d,y]=o['Payout Date'].split('/');o.date=`20${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;out.push(o)}}
module.exports={rows:out};
if(require.main===module){fs.writeFileSync('ue.json',JSON.stringify(out,null,0));
 const h=Object.keys(out[0]);console.log(h.join('|'));
 const by={};for(const o of out){const s=o['Store Name'];by[s]=by[s]||{n:0,min:'9',max:'0',sales:0,pay:0};const b=by[s];b.n++;b.min=o.date<b.min?o.date:b.min;b.max=o.date>b.max?o.date:b.max;b.sales+=o['Sales (incl. tax)'];b.pay+=o['Total payout']}
 console.table(by);
 const tot={};for(const o of out)for(const k of h)if(typeof o[k]=='number')tot[k]=(tot[k]||0)+o[k];console.table(Object.fromEntries(Object.entries(tot).map(([k,v])=>[k,+v.toFixed(2)])));
 const parts=['Sales (incl. tax)','Chargeback Amount (incl. tax)','Price Adjustments (incl. tax)','Offers on items (incl. tax)','Delivery Offer Redemptions (incl. tax)','Offer Redemption Fee','Marketing Adjustment','Bag Fee','Marketplace Fee','Tax on Marketplace Fee','Delivery Network Fee','Tax on Delivery Network Fee','Order Processing Fee','Capital payments','Container Deposit Fee','Other payments','Marketplace Facilitator Tax Adjustment','Marketplace Facilitator Tax','Backup Withholding Tax','Garnishment'];
 let bad=0;for(const o of out){const c=parts.reduce((s,k)=>s+(o[k]||0),0);if(Math.abs(c-o['Total payout'])>0.02){bad++;if(bad<10)console.log('diff',o['Store Name'],o.date,o['Total payout'],c.toFixed(2))}}console.log('bad',bad);
 const tsa=['Sales (incl. tax)','Chargeback Amount (incl. tax)','Price Adjustments (incl. tax)','Offers on items (incl. tax)','Delivery Offer Redemptions (incl. tax)'];let b2=0;for(const o of out){const c=tsa.reduce((s,k)=>s+(o[k]||0),0);if(Math.abs(c-o['Total Sales after Adjustments (incl tax)'])>0.02){b2++;if(b2<5)console.log('tsa',o['Store Name'],o.date,o['Total Sales after Adjustments (incl tax)'],c.toFixed(2))}}console.log('tsa bad',b2);
 const dates={};for(const o of out)dates[o.date]=(dates[o.date]||0)+1;console.log(JSON.stringify(dates));
}
