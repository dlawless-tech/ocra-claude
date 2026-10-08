const fs=require("fs");const r2=x=>Math.round(x*100)/100;const n=s=>+String(s).replace(/,/g,"");
const P=JSON.parse(fs.readFileSync("water-plan.json","utf8"));const locs=P.map(o=>o.l);
const dv=s=>{const[m,d]=s.split("/").map(Number);return m*100+d};
const rows=[];
for(const [file,acct] of [["w_rows.txt","2285"],["w5635.txt","5635"]]){
 for(const r of fs.readFileSync(file,"utf8").split(/\r?\n/)){const f=r.split("|");if(!/^\d+\/\d+\/2026$/.test(f[0]))continue;if(dv(f[0])<=906)continue;
  if(/NJ00022477|Spread/.test(r))continue;const loc=locs.find(l=>f.includes(l));if(!loc)continue;const k=f.length;
  rows.push({acct,dt:f[0],type:f[1],ref:f[2],vendor:f[1]==="AP Invoice"?f[3]:"",loc,dr:n(f[k-3]),cr:n(f[k-2]),cm:f[1]==="AP Invoice"?f.slice(5,k-3).join(" "):""});}}
const out=[];
for(const p of P){let bal=p.tgt;const R=rows.filter(r=>r.loc===p.l).sort((a,b)=>dv(a.dt)-dv(b.dt));
 const dates=[...new Set(R.map(r=>r.dt))];
 for(const d of dates){const acc=R.filter(r=>r.dt===d&&r.type!=="AP Invoice"&&r.acct==="2285");for(const a of acc)bal=r2(bal+a.cr-a.dr);
  const inv={};for(const r of R.filter(r=>r.dt===d&&r.type==="AP Invoice")){const k=r.ref+"|"+r.vendor;inv[k]=inv[k]||{dt:d,ref:r.ref,vendor:r.vendor,cm:r.cm,a2285:0,a5635:0};inv[k]["a"+r.acct]+=r.dr-r.cr;}
  const L=Object.values(inv);if(!L.length)continue;const tot=r2(L.reduce((s,i)=>s+i.a2285+i.a5635,0));let left=bal;
  L.forEach((i,ix)=>{i.tot=r2(i.a2285+i.a5635);i.new2285=ix===L.length-1?r2(left):r2(bal*i.tot/tot);left=r2(left-i.new2285);i.new5635=r2(i.tot-i.new2285);i.balBefore=bal;out.push({loc:p.l,...i});});
  bal=0;}
 p.end=bal;}
for(const o of out)console.log([o.loc.padEnd(18),o.dt.padEnd(9),o.ref.padEnd(12),("bal "+o.balBefore.toFixed(2)).padEnd(13),"inv "+o.tot.toFixed(2).padStart(9),"| now 2285 "+o.a2285.toFixed(2).padStart(9)+" 5635 "+o.a5635.toFixed(2).padStart(8),"| new 2285 "+o.new2285.toFixed(2).padStart(9)+" 5635 "+o.new5635.toFixed(2).padStart(9),o.a2285===o.new2285?"":"*"].join(" "));
fs.writeFileSync("water-inv.json",JSON.stringify(out));
