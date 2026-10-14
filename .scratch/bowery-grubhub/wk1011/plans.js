const fs=require("fs"),W=process.argv[2];
let o=JSON.parse(fs.readFileSync(W+"/orders.json","utf8"));if(typeof o==="string")o=JSON.parse(o);
const gl=JSON.parse(fs.readFileSync(W+"/gldays.json","utf8")),work=JSON.parse(fs.readFileSync(W+"/work.json","utf8"));
const map={Cookshop:"Cookshop","Rosie's":"Rosie","Shuka":"Shuka","Vic's":"Vic"};
const R365={Cookshop:"200 - Cookshop",Rosie:"500 - Rosie’s",Shuka:"Shuka",Vic:"Vic’s"};
const acct=c=>/^a\/r/.test(c)?"104-06 - A/R - Grub Hub":"632-02 - Delivery Fees";
const f=x=>Number(x).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const notes={Shuka:"Difference 33.78 credit. R365 booked 56.62 more than Grubhub's orders on 10/6, and Grubhub's 10/8 orders run 90.39 above R365's 10/8 sales, which carry a 8.71 Grubhub refund on order 035434949850818. Posted with the plug, since the A/R balance ties to the net."};
for(const s of o){const k=map[s.rest],w=work.find(x=>x.loc===k),loc=Object.keys(gl).find(l=>l.includes(k));
 const plan={entryDate:"2026-10-11",store:k,location:R365[k],status:"Approved",window:["2026-10-06","2026-10-12"],
  lines:w.lines.map(l=>[acct(l.comment),l.col==="debit"?f(l.amount):"0.00",l.col==="credit"?f(l.amount):"0.00",l.comment]),
  glDays:gl[loc],orders:s,note:notes[k]||""};
 fs.writeFileSync(W+"/plan-"+k+".json",JSON.stringify(plan));}
