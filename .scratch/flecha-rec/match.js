const fs=require("fs");
const bank=fs.readFileSync("bank.csv","utf8").trim().split(/\r?\n/).slice(1).map(l=>{const m=l.match(/^(\w+),([\d/]+),"(.*?)",(-?[\d.]+),(\w+),(-?[\d.]+),(\d*)/);return {d:m[2],a:-(+m[4]),t:m[5],ck:m[7],desc:m[3].slice(0,40),used:0}}).filter(b=>b.a>0);
const rec=fs.readFileSync("ChecksWithdrawalsGrid.tsv","utf8").trim().split("\n").map(l=>{const [c,d,a,tx,tt,cm,ba,id]=l.split("\t");const ck=(cm.match(/Check #(\d+)/)||[])[1]||"";return {c:+c,d,a:+a,tx,tt,cm,ck,id,m:null}});
// pass 1: check number + amount
for(const r of rec) if(r.ck){const b=bank.find(b=>!b.used&&b.ck===r.ck&&Math.abs(b.a-r.a)<.005); if(b){b.used=1;r.m=b;}}
// pass 2: amount only for non-checks
for(const r of rec) if(!r.m){const b=bank.find(b=>!b.used&&!b.ck&&Math.abs(b.a-r.a)<.005); if(b){b.used=1;r.m=b;}}
const f=x=>x.toFixed(2);
console.log("== should be checked (matches bank) but unchecked");
let s=0;for(const r of rec) if(r.m&&!r.c){s+=r.a;console.log(r.d,f(r.a),r.tx,r.cm,"| bank",r.m.d)} console.log("sum",f(s));
console.log("== checked but no bank match");
s=0;for(const r of rec) if(!r.m&&r.c){s+=r.a;console.log(r.d,f(r.a),r.tx,r.cm)} console.log("sum",f(s));
console.log("== bank items with no rec line");
s=0;for(const b of bank) if(!b.used){s+=b.a;console.log(b.d,f(b.a),b.ck,b.desc)} console.log("sum",f(s));
console.log("== bank items whose check # matched a rec line with different amount");
for(const b of bank) if(!b.used&&b.ck){const r=rec.filter(r=>r.ck===b.ck);for(const x of r)console.log(b.ck,"bank",f(b.a),"rec",f(x.a),x.tx,x.c)}
console.log("cleared total",f(rec.filter(r=>r.c).reduce((s,r)=>s+r.a,0)));
fs.writeFileSync("plan.json",JSON.stringify(rec.map(r=>({id:r.id,want:r.m?1:0,c:r.c}))));
