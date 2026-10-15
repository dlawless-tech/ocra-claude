// P10 bills not yet relieved; El Monte 9/6 bill (older period) reduces bal without zeroing
const P=require("./relieve.json"), r2=x=>Math.round(x*100)/100;
const out=P.filter(i=>["Claremont","North Torrance","Ontario","West Covina"].includes(i.loc)&&i.change);
const em=P.filter(i=>i.loc==="El Monte"&&i.dt==="9/30/2026"), bal=r2(-241.67+3460.35-261.38+309*3), tot=em.reduce((s,i)=>s+i.tot,0);
let left=bal; em.forEach((i,k)=>{i.new2285=k===em.length-1?r2(left):r2(bal*i.tot/tot);left=r2(left-i.new2285);i.new5635=r2(i.tot-i.new2285);out.push(i)});
for(const i of out)console.log([i.id,i.loc,i.new2285.toFixed(2),i.new5635.toFixed(2),i.tot.toFixed(2)].join("\t"));
