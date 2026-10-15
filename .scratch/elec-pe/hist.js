// net expense (5630 stores, 6330 SC) per period by location
const dv=s=>{const[m,d,y]=s.split("/").map(Number);return y*1e4+m*100+d};
const P=[["P7",20260614,20260711],["P8",20260712,20260808],["P9",20260809,20260905],["P10",20260906,20261003]];
const rows=[...require("./r5630.json"),...require("./r6330.json")].filter(r=>r.type!=="Beg Balance");
const locs=[...new Set(rows.map(r=>r.loc))].sort();
const out={};let tot=[0,0,0,0];
console.log("store".padEnd(21),...P.map(p=>p[0].padStart(10)),"P7-9 avg".padStart(10),"P10-avg".padStart(10));
for(const l of locs){const v=P.map(([n,a,b])=>rows.filter(r=>r.loc===l&&dv(r.dt)>=a&&dv(r.dt)<=b).reduce((s,r)=>s+r.dr-r.cr,0));
 const avg=(v[0]+v[1]+v[2])/3;out[l]={v,avg};v.forEach((x,i)=>tot[i]+=x);
 console.log(l.padEnd(21),...v.map(x=>x.toFixed(0).padStart(10)),avg.toFixed(0).padStart(10),(v[3]-avg).toFixed(0).padStart(10));}
console.log("TOTAL".padEnd(21),...tot.map(x=>x.toFixed(0).padStart(10)),((tot[0]+tot[1]+tot[2])/3).toFixed(0).padStart(10));
require("fs").writeFileSync("hist.json",JSON.stringify(out));
