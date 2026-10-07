const rows=require("./parse.js"); const c=v=>Math.round(v*100)/100;
const D=s=>{const[m,d,y]=s.split("/").map(Number);return Date.UTC(y,m-1,d)};
const unap=r=>r.num==="3rd Party"&&D(r.date)>=D("8/30/2026")&&!(r.loc==="Flecha Town Square"&&r.cr===38.53);
for (const loc of [...new Set(rows.map(r=>r.loc))]) { const R=rows.filter(r=>r.loc===loc); const beg=+R[0].beg.replace(/,/g,"");
 const bal=(to,ex)=>c(beg+R.filter(r=>D(r.date)<=D(to)&&!(ex&&unap(r))).reduce((a,r)=>a+r.dr-r.cr,0));
 console.log(loc,"| beg 8/1",beg,"| thru 9/4 approved",bal("9/4/2026",1),"w/ unap",bal("9/4/2026",0),"| thru 10/6 approved",bal("10/6/2026",1),"w/ unap",bal("10/6/2026",0)); }
