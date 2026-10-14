const fs=require("fs"),W=process.argv[2];
const parse=l=>{const o=[];let c="",q=false;for(const ch of l){if(ch=='"'){q=!q;continue}if(ch==','&&!q){o.push(c);c="";continue}c+=ch}o.push(c);return o};
const rows=fs.readFileSync(W+"/gl.csv","utf8").split(/\r?\n/).slice(4).filter(Boolean).map(parse);
const n=s=>parseFloat(String(s).replace(/,/g,""))||0;
const iso=d=>{const[m,dd,y]=d.split("/");return y+"-"+m.padStart(2,"0")+"-"+dd.padStart(2,"0")};
const gl={},D={},debitTot={},beg={},end={};
for(const r of rows){const loc=r[0];gl[loc]=gl[loc]||{};D[loc]=D[loc]||0;beg[loc]=n(r[2]);debitTot[loc]=n(r[17]);
 if(r[6]==="Journal Entry"&&n(r[12])>0){const k=iso(r[5]);gl[loc][k]=+((gl[loc][k]||0)+n(r[12])).toFixed(2);}
 D[loc]=+(D[loc]+n(r[12])).toFixed(2); end[loc]=n(r[14]);}
fs.writeFileSync(W+"/gldays.json",JSON.stringify(gl,null,1));
let o=JSON.parse(fs.readFileSync(W+"/orders.json","utf8"));if(typeof o==="string")o=JSON.parse(o);
const map={Cookshop:"Cookshop","Rosie's":"Rosie","Shuka":"Shuka","Vic's":"Vic"};
const ids={Cookshop:"14eeedcd-90bf-43e3-8e07-8a60fc0a0d81",Rosie:"034057e6-f260-4121-9da3-cf948e799a8d",Shuka:"7027736c-6342-4bd3-abeb-7cad1ce055f5",Vic:"e3241879-185c-4430-9101-caef79d7d6d5"};
const work=[];
for(const s of o){const k=map[s.rest];const loc=Object.keys(gl).find(l=>l.includes(k));
 const d=D[loc],net=s.total/100,cr=+(d-net).toFixed(2);
 const f=[-s.T.commission_total,-s.T.grubhub_delivery_fee_total,-s.T.processing_fee].map(x=>x/100);
 const diff=+(cr-f[0]-f[1]-f[2]).toFixed(2);
 const lines=[{comment:"a/r debit from prior week less total payout",col:"credit",amount:cr},{comment:"commissions",col:"debit",amount:f[0]},{comment:"delivery commissions",col:"debit",amount:f[1]},{comment:"order processing fees",col:"debit",amount:f[2]},{comment:"difference",col:diff>=0?"debit":"credit",amount:Math.abs(diff)}];
 const tot=+(cr+(diff<0?-diff:0)).toFixed(2);
 work.push({loc:k,id:ids[k],tot,lines});
 const days=[...new Set([...Object.keys(gl[loc]),...Object.keys(s.days)])].sort().map(x=>x.slice(5)+":"+((gl[loc][x]||0)-(s.days[x]||0)/100).toFixed(2)).filter(x=>!/:-?0\.00$/.test(x));
 console.log(k,"D",d,"debitTot",debitTot[loc],"net",net,"cr",cr,"fees",f.join("/"),"diff",diff,"tot",tot,"endBal",end[loc],"beg",beg[loc],"dayDiffs",days.join(" "),"odd",s.odd.join(";"));}
fs.writeFileSync(W+"/work.json",JSON.stringify(work,null,1));
