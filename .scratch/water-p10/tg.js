// 10/3 targets: [amt, days to count, period days, basis]
const T={
"217 - Anaheim":[[636.82,12,32,"2001 9/23 bill 8/20-9/21"],[709.71,15,30,"3300 9/23 bill 8/19-9/18"]],
"225 - Claremont":[[3414.26,2,30,"10/2 bills 9/1-10/1, 3 meters"]],
"220 - Costa Mesa":[[2326.35,47,58,"est 8/17-10/3 at 6/20-8/17 rate"]],
"244 - Downey":[[1606.55,56,56,"est 8/8-10/3 at 8/9 bill rate"]],
"262 - El Monte":[[3023.69,33,61,"est 8/31-10/3 at 9/30 bills 7/1-8/31 rate"]],
"269 - Hollywood":[[2717.45,31,30,"est 9/2-10/3 at 8/3-9/2 rate (Oct bill not in)"]],
"219 - Huntington Beach":[[1041.08,11,33,"est 9/22-10/3 at 9/23 bill rate"]],
"264 - Inglewood":[[2609.07,24,30,"est 9/9-10/3 at 9/10 bills rate"]],
"250 - La Cienega":[[4967.52,29,33,"10/7 bill 9/4-10/7 prorated"]],
"215 - Lakewood":[[1823.07,19,63,"est 9/14-10/3 at 9/29 bill rate"]],
"299 - Norms Support Center":[[950.36,19,63,"est 9/14-10/3 at 9/29 Bellflower bills rate"]],
"213 - North Torrance":[[3002.01,12,63,"est 9/21-10/3 at 9/28 bill rate"]],
"270 - Ontario":[[3095.03,11,32,"est 9/22-10/3 at 9/29 bill rate"]],
"218 - Orange":[[1499.92,61,63,"10/6 bill 8/3-10/5 prorated"]],
"261 - Pico Rivera":[[1501.48,19,32,"est 9/14-10/3 at 10/1 bills rate"]],
"265 - Rialto":[[5339.60,15,32,"est 9/18-10/3 at 9/24 bill rate"]],
"245 - Riverside":[[5650.81,16,30,"est 9/17-10/3 at 9/25 bill rate"]],
"243 - Santa Ana":[[1907.75,49,63,"est 8/15-10/3 at 6/13-8/15 rate"]],
"211 - Slauson":[[1443.32,37,65,"est 8/27-10/3 at 6/23-8/27 rate"]],
"223 - South Torrance":[[1626.34,19,35,"est 9/14-10/3 at 9/21 bill rate"],[75.24,40,63,"meter 35774 est 8/24-10/3"]],
"242 - Van Nuys":[[5645.84,9,27,"est 9/24-10/3 at 9/25 bill rate"]],
"224 - West Covina":[[949.22,4,28,"est 9/29-10/3 at 9/29 bill rate"]],
"222 - Whittier":[[1611.96,29,31,"10/6 bill 9/4-10/5 prorated"]]};
const r2=x=>Math.round(x*100)/100,o={};
for(const k in T)o[k]={tgt:r2(T[k].reduce((s,[a,d,p])=>s+a*d/p,0)),basis:T[k].map(x=>x[3]).join("; ")};
require("fs").writeFileSync("targets.json",JSON.stringify(o,null,1));
