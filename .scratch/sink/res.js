const tx=require('./gl.json');const D=s=>{const[m,d,y]=s.split('/');return +new Date(+y,m-1,+d)};const day=864e5;
const sales=(a,b)=>tx.filter(t=>/^NJ/.test(t.num)&&D(t.d)>=a&&D(t.d)<=b).reduce((x,t)=>x+t.dr-t.cr,0);
for(let s=+new Date(2026,6,6);s<=+new Date(2026,8,21);s+=7*day){const e=s+6*day;
 const dep=tx.filter(t=>t.type==='Bank Deposit'&&D(t.d)>e&&D(t.d)<=e+7*day)[0]; if(!dep) continue;
 const i=tx.lastIndexOf(tx.filter(t=>D(t.d)<=D(dep.d)).pop()); const bal=tx[i].bal;
 const exp=(sales(s,e)-dep.cr)+sales(e+day,D(dep.d));
 // fees for week W booked by then? entries dated e+9 so not yet
 console.log(new Date(e).toLocaleDateString(),'dep',dep.d,'bal',bal.toFixed(2),'expected',exp.toFixed(2),'diff',(bal-exp).toFixed(2));}
