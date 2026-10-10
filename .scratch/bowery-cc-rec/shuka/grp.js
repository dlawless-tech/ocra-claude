const fs=require('fs');const f=x=>(x/100).toFixed(2);
const all=JSON.parse(fs.readFileSync('csv.json','utf8')).filter(b=>b.type!=='Payment');
const bank=all.filter(b=>new Date(b.pd)<=new Date('08/30/2026'));
const cat=s=>/UBER|LYFT|TRVL|CURB|TAXI|CITI BIKE/i.test(s)?'T':/AMAZON|AMZN/i.test(s)?'A':'O';
const d=s=>new Date(s);
const sum=a=>a.reduce((s,b)=>s+b.amt,0);
const show=(lbl,a)=>{console.log(lbl,a.length,f(sum(a)));};
for(const [c,lo,hi] of [['T','08/11/2026','08/12/2026'],['T','08/13/2026','08/15/2026'],['T','08/16/2026','08/30/2026'],['T','08/11/2026','08/30/2026'],['A','08/12/2026','08/13/2026'],['A','08/14/2026','08/20/2026'],['A','08/21/2026','08/23/2026'],['A','08/24/2026','08/27/2026'],['A','08/12/2026','08/30/2026']]){
 show(c+' '+lo.slice(0,5)+'-'+hi.slice(0,5)+' bank(all posts)',all.filter(b=>cat(b.desc)===c&&d(b.td)>=d(lo)&&d(b.td)<=d(hi)));}
show('T before 8/11 posted<=8/30',bank.filter(b=>cat(b.desc)==='T'&&d(b.td)<d('08/11/2026')));
show('A before 8/12 posted<=8/30',bank.filter(b=>cat(b.desc)==='A'&&d(b.td)<d('08/12/2026')));
console.log('posted 8/31+ with txn<=8/30:');all.filter(b=>d(b.pd)>d('08/30/2026')&&d(b.td)<=d('08/30/2026')).forEach(b=>console.log(' ',b.td,'p'+b.pd,b.desc,f(b.amt)));
