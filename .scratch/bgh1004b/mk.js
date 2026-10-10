const fs=require("fs"),D=process.argv[2];
const deps=JSON.parse(JSON.parse(fs.readFileSync(D+"/deps.json","utf8"))), gl=JSON.parse(fs.readFileSync(D+"/gl.json","utf8")), work=JSON.parse(fs.readFileSync(D+"/work.json","utf8"));
const S={Cookshop:["Cookshop","Cookshop","200 - Cookshop","bgfiIl4"],Rosie:["Rosie","Rosie’s","500 - Rosie’s","eOnrAHE"],Shuka:["Shuka","Shuka","Shuka","jo_F6pj"],Vic:["Vic","Vic’s","Vic’s","UWCSZNz"]};
const notes={
Cookshop:"Difference 68.59 debit is two Grubhub refunds R365 still carries as sales: order 361734878702953 on 10/1 (16.33) and order 012334895013486 on 10/3 (52.26).",
Rosie:"No difference: R365 sales equal Grubhub gross by day.",
Shuka:"Difference 396.73 credit: (1) Grubhub Account Adjustment (CS_CREDIT) of 291.79 on 10/5 for order 847634852531916, reversing the 9/29 refund of the same amount; it appears in the 10/5 Grubhub day column. (2) Grubhub gross exceeds R365 sales by 104.94, mostly 10/1 (96.93), plus 10/2 (4.95), 10/5 (3.03) and 0.03 rounding.",
Vic:"No difference: R365 sales equal Grubhub gross by day."};
const ids=[];
for(const w of work){const [st,rest,loc,suf]=S[w.loc];const dep=deps.find(d=>d.sid==="26100907"+suf);
const f=x=>x?x.toFixed(2):"0.00";
const lines=w.lines.map(l=>[/^a\/r/.test(l.comment)?"104-06 - A/R - Grub Hub":"632-02 - Delivery Fees",l.col==="debit"?f(l.amount):"0.00",l.col==="credit"?f(l.amount):"0.00",l.comment]);
const plan={entryDate:"2026-10-04",store:st,location:loc,status:"Approved",window:["2026-10-01","2026-10-05"],lines,glDays:gl[rest],deposit:dep,png:D+"/shots/"+dep.sid+".png",note:notes[w.loc]};
fs.writeFileSync(D+"/html/"+w.id+".json",JSON.stringify(plan));ids.push(w.id+" "+st);}
console.log(ids.join("\n"));
