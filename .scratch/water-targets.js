// per store: unbilled service through 9/5 as of 9/6. [amt, daysToCount, periodDays, basis]
const T={
"Anaheim":[[636.82,16,32,"2001 9/23 bill 8/20-9/21"],[709.71,17,30,"3300 9/23 bill 8/19-9/18"]],
"Claremont":[[3967.38,4,29,"est 9/1-9/5 at 8/3-9/1 rate, 3 meters"]],
"Costa Mesa":[[2326.35,19,58,"est 8/17-9/5 at 6/20-8/17 rate"]],
"Downey":[[1606.55,28,56,"est 8/8-9/5 at 8/9 bill rate (period not on bill)"]],
"El Monte":[[2692.47,67,61,"est 6/30-9/5 at 5/1-6/30 rate, bimonthly"]],
"Hollywood":[[2717.45,3,30,"est 9/2-9/5 at 8/3-9/2 rate"]],
"Huntington Beach":[[1041.08,16,33,"9/23 bill 8/20-9/22"]],
"Inglewood":[[2609.07,26,30,"9/10 bills 8/10-9/9"],[59.69,33,30,"8655 7/8-8/10 never billed, est"]],
"La Cienega":[[4927.63,1,29,"est 9/4-9/5 at 8/6-9/4 rate"]],
"Lakewood":[[1823.07,54,63,"9/29 bill 7/13-9/14"]],
"Norms Support Center":[[646.75,54,63,"Bellflower 9/29 bills 7/13-9/14"]],
"North Torrance":[[3002.01,47,63,"9/28 bill, period assumed 7/20-9/21"]],
"Ontario":[[5975.08,15,32,"9/29 bill 8/21-9/22"]],
"Orange":[[1468.53,33,61,"est 8/3-9/5 at 6/3-8/3 rate, bimonthly"]],
"Pico Rivera":[[1501.48,23,32,"10/1 bills 8/13-9/14"]],
"Rialto":[[5339.60,19,32,"9/24 bill 8/17-9/18"]],
"Riverside":[[5650.81,18,30,"9/25 bill 8/18-9/17"]],
"Santa Ana":[[1907.75,21,63,"est 8/15-9/5 at 6/13-8/15 rate"]],
"Slauson":[[1443.32,65,65,"9/10 bill 6/23-8/27, all unbilled at 9/6"],[1443.32,9,65,"est 8/27-9/5"]],
"South Torrance":[[1626.34,26,35,"9/21 bill 8/10-9/14"],[75.24,12,63,"meter 35774 est 8/24-9/5"]],
"Van Nuys":[[5645.84,8,27,"9/25 bill 8/28-9/24"]],
"West Covina":[[949.22,5,30,"9/29 bill, period assumed 8/31-9/30"]],
"Whittier":[[1353.24,2,27,"est 9/3-9/5 at 8/7-9/3 rate"]]};
const r2=x=>Math.round(x*100)/100;
// store 2285 balance (credit +) through 9/6
const L=require("fs").readFileSync("w_rows.txt","utf8").split(/\r?\n/);const bal={};
const locs=Object.keys(T);
for(const r of L){const f=r.split("|");if(!/^\d+\/\d+\/2026$/.test(f[0]))continue;const [m,d]=f[0].split("/").map(Number);if(m>9||(m===9&&d>6))continue;
 const loc=locs.find(l=>f.includes(l));if(!loc){console.error("noloc",r);continue}
 const n=s=>+String(s).replace(/,/g,"");const k=f.length;const dr=n(f[k-3]),cr=n(f[k-2]);bal[loc]=r2((bal[loc]||0)+cr-dr);}
const out=[];let st=0;
for(const l of locs){const tgt=r2(T[l].reduce((s,[a,d,p])=>s+a*d/p,0));const b=bal[l]||0;out.push({l,b,tgt,move:r2(tgt-b),basis:T[l].map(x=>x[3]).join("; ")});}
for(const o of out){console.log(o.l.padEnd(21),String(o.b.toFixed(2)).padStart(10),o.tgt.toFixed(2).padStart(9),o.move.toFixed(2).padStart(10)," ",o.basis);if(o.l!=="Norms Support Center")st+=o.move;}
console.log("moved to stores",r2(st));require("fs").writeFileSync("water-plan.json",JSON.stringify(out));
