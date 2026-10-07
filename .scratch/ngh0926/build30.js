const fs=require('fs'),P='.scratch/ngh0926/';
const map={'S Indian Hill Blvd':'Claremont','Valley Blvd':'El Monte','Lakewood Blvd':'Lakewood','N La Cienega Blvd':'La Cienega','E Slauson Ave':'Slauson','E 17th St':'Santa Ana','Hawthorne Blvd':'North Torrance','Tyler St':'Riverside','Rosemead Blvd':'Pico Rivera','N Azusa Ave':'West Covina','Whittier Blvd':'Whittier','N Euclid St':'Anaheim','Beach Blvd':'Huntington Beach','E Katella Ave':'Orange','Sherman Way':'Van Nuys','Firestone Blvd':'Downey','Harbor Blvd':'Costa Mesa','S Avalon Blvd':'Carson','Pacific Coast Hwy':'South Torrance','W Imperial Hwy':'Inglewood','Renaissance Pkwy':'Rialto','East Mills Circle':'Ontario','Hollywood Boulevard':'Hollywood','W Charleston Blvd':'Las Vegas'};
const loc=st=>{for(const k in map) if(st.includes(k)) return map[k]; return null;};
const deps=JSON.parse(fs.readFileSync(P+'deps.json','utf8')); for(const x of deps) x.loc=loc(x.street);
const gl=JSON.parse(fs.readFileSync(P+'gl30.json','utf8'));
const tpl={}; for(const l of fs.readFileSync(P+'tpl-lines.txt','utf8').trim().split(/\r?\n/)){const [dt,L,id,v]=l.split('\t');let o=JSON.parse(v);if(typeof o==='string')o=JSON.parse(o);tpl[L]={id,plug:o[4][3]};}
const work=[];
for(const L of Object.keys(tpl).sort()){
  const ds=deps.filter(x=>x.loc===L && x.sid.startsWith('26100201'));
  const sum=f=>ds.reduce((a,x)=>a+(x.T[f]||0),0)/100;
  const net=ds.reduce((a,x)=>a+x.total,0)/100, gross=sum('prepaid_total'), D=(gl[L]||{D:0}).D;
  const r2=v=>Math.round(v*100)/100;
  const ar=r2(D-net), com=r2(-sum('commission_total')), del=r2(-sum('grubhub_delivery_fee_total')), pf=r2(-sum('processing_fee')), plug=r2(ar-com-del-pf);
  const lines=[{comment:'ar grubhub - deposit',col:ar>=0?'credit':'debit',amount:Math.abs(ar)},{comment:'commissions',col:'debit',amount:com},{comment:'delivery commissions',col:'debit',amount:del},{comment:'order processing fees',col:'debit',amount:pf},{comment:tpl[L].plug,col:plug>=0?'debit':'credit',amount:Math.abs(plug)}];
  const dr=r2(lines.filter(l=>l.col==='debit').reduce((a,l)=>a+l.amount,0)), cr=r2(lines.filter(l=>l.col==='credit').reduce((a,l)=>a+l.amount,0));
  if(Math.abs(dr-cr)>0.001) throw L+' unbalanced';
  if(Math.abs(r2(D-gross)-plug)>0.005) throw L+' plug != D-gross';
  work.push({loc:L,src:tpl[L].id,deps:ds.map(x=>x.sid),days:ds.map(x=>Object.keys(x.days).join(',')),D,net,gross,tot:dr,lines});
  console.log(L.padEnd(17),ds.map(x=>x.sid).join('+').padEnd(16),'D',D.toFixed(2).padStart(7),'net',net.toFixed(2).padStart(7),'ar',ar.toFixed(2).padStart(7),'com',com.toFixed(2),'del',del.toFixed(2),'pf',pf.toFixed(2),'plug',plug.toFixed(2).padStart(7),'tot',dr.toFixed(2));
}
fs.writeFileSync(P+'work30.json',JSON.stringify(work,null,1));
