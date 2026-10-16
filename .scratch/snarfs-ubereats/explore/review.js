// Per store-week: D (10135 sales debits Mon-Sun), the UberEats entry lines, Uber's figures.
const g=require('./gl.json'),f70=require('./f70.json'),f42=require('./f42.json'),u=require('./uber.json');
const D=s=>new Date(s),day=864e5,r2=x=>Math.round(x*100)/100;
const key=l=>({'Snarf\'s Sandwiches 1 - MX':'MX','Snarf\'s Sandwiches 2 - SLU':'SLU','Snarf\'s Sandwiches 3 - Skinker':'Skinker','Snarf\'s Sandwiches 4 - Page':'Page','Snarf\'s Sandwiches 5 - Fenton':'Fenton','Snarf\'s Sandwiches 6 - Kirkwood':'Kirkwood','Snarf\'s Sandwiches 7 - Spirit':'Spirit'})[l];
const rows=[];
for(const e of g.filter(x=>x.num=='UberEats')){
  const st=key(e.loc),sun=D(e.d),mon=new Date(+sun-6*day);
  const Dd=r2(g.filter(x=>key(x.loc)==st&&x.type=='Journal Entry'&&x.num!='UberEats'&&D(x.d)>=mon&&D(x.d)<=sun).reduce((a,x)=>a+x.dr-x.cr,0));
  const lines=[...f70,...f42].filter(x=>key(x.loc)==st&&x.num=='UberEats'&&x.d==e.d).map(x=>[x.cm,r2(x.dr-x.cr)]);
  const ub=u.find(x=>x.store==st&&D(x.end).toDateString()==sun.toDateString());
  rows.push({st,d:e.d,D:Dd,ar:r2(e.cr-e.dr),lines,ub});
}
require('fs').writeFileSync('review.json',JSON.stringify(rows));
const bad=[];
for(const r of rows){const ub=r.ub;if(!ub){bad.push(`${r.st} ${r.d} no Uber week`);continue}
  const exp=r2(r.D-ub.net);const off=r2(r.ar-exp);
  const L=Object.fromEntries(r.lines.map(([c,v])=>[c.toLowerCase(),v]));
  r.exp=exp;r.off=off;
  if(Math.abs(off)>0.005) bad.push(`${r.st} ${r.d} D ${r.D} uber net ${ub.net} credit ${r.ar} expected ${exp} off ${off} | ${JSON.stringify(r.lines)} | U mkt ${ub.marketing} fees ${ub.fees} amd ${ub.amendments} earn ${ub.earnings}`)}
console.log(rows.length,'entries;',bad.length,'credit off');bad.forEach(b=>console.log(b));
