const fs=require('fs'),P='.scratch/ngh0926/';
const map={'S Indian Hill Blvd':'Claremont','Valley Blvd':'El Monte','Lakewood Blvd':'Lakewood','N La Cienega Blvd':'La Cienega','E Slauson Ave':'Slauson','E 17th St':'Santa Ana','Hawthorne Blvd':'North Torrance','Tyler St':'Riverside','Rosemead Blvd':'Pico Rivera','N Azusa Ave':'West Covina','Whittier Blvd':'Whittier','N Euclid St':'Anaheim','Beach Blvd':'Huntington Beach','E Katella Ave':'Orange','Sherman Way':'Van Nuys','Firestone Blvd':'Downey','Harbor Blvd':'Costa Mesa','S Avalon Blvd':'Carson','Pacific Coast Hwy':'South Torrance','W Imperial Hwy':'Inglewood','Renaissance Pkwy':'Rialto','East Mills Circle':'Ontario','Hollywood Boulevard':'Hollywood','W Charleston Blvd':'Las Vegas'};
const loc=st=>{for(const k in map) if(st.includes(k)) return map[k]; return null;};
const deps=JSON.parse(fs.readFileSync(P+'deps.json','utf8')); for(const x of deps) x.loc=loc(x.street);
const gl=JSON.parse(fs.readFileSync(P+'gl.json','utf8'));
const series=process.argv[2]||'261002', tag=process.argv[3]||'30';
const lines={}; for(const l of fs.readFileSync(P+'lines.txt','utf8').trim().split(/\r?\n/)){const [k,v]=l.split('\t');let o=JSON.parse(v);if(typeof o==='string')o=JSON.parse(o);lines[k]=o;}
const n=s=>+String(s).replace(/,/g,'');
let bad=0;
for(const L of Object.keys(gl).sort()){
  const ds=deps.filter(x=>x.loc===L && x.sid.startsWith(series+tag));
  const sum=f=>ds.reduce((a,x)=>a+(x.T[f]||0),0)/100;
  const net=ds.reduce((a,x)=>a+x.total,0)/100, D=gl[L].D;
  const ar=+(D-net).toFixed(2), com=-sum('commission_total'), del=-sum('grubhub_delivery_fee_total'), pf=-sum('processing_fee'), tax=-sum('withheld_sales_tax');
  const plug=+(ar-com-del-pf-tax).toFixed(2);
  const exp={'ar grubhub - deposit':ar>=0?[0,ar]:[-ar,0],commissions:[com,0],'delivery commissions':[del,0],'order processing fees':[pf,0]};
  if(tax) exp['sales tax']=[tax,0];
  const act=lines[L].L; const plugRow=act.find(r=>!(r[3] in exp));
  const msgs=[];
  for(const r of act){ const e=exp[r[3]]; if(!e) continue; if(Math.abs(n(r[1])-e[0])>0.005||Math.abs(n(r[2])-e[1])>0.005) msgs.push(r[3]+' has '+r[1]+'/'+r[2]+' want '+e[0].toFixed(2)+'/'+e[1].toFixed(2)); }
  const pe=plug>=0?[plug,0]:[0,-plug];
  if(!plugRow) msgs.push('no plug row'); else if(Math.abs(n(plugRow[1])-pe[0])>0.005||Math.abs(n(plugRow[2])-pe[1])>0.005) msgs.push('plug "'+plugRow[3]+'" has '+plugRow[1]+'/'+plugRow[2]+' want '+pe[0].toFixed(2)+'/'+pe[1].toFixed(2));
  if(msgs.length) bad++;
  console.log(L.padEnd(17), ds.map(x=>x.sid).join('+').padEnd(16),'D',D.toFixed(2).padStart(7),'net',net.toFixed(2).padStart(7),'ar',ar.toFixed(2).padStart(7),'fees',(com+del+pf).toFixed(2).padStart(7),'plug',plug.toFixed(2).padStart(7), msgs.length?'MISMATCH: '+msgs.join('; '):'OK');
}
console.log('mismatches',bad);
