const o=require('./ghtx.json');const gl=require('./gh.json');const tz='America/Denver';
const day=t=>new Date(t).toLocaleDateString('en-CA',{timeZone:tz});
const iso=s=>{const[m,d,y]=s.split('/');return y+'-'+m.padStart(2,'0')+'-'+d.padStart(2,'0')};
const ord=o.tx.filter(x=>x.transaction_type!=='DISTRIBUTION');
const per={};const c=x=>(x||0)/100;
for(const x of ord){const d=day(x.transaction_time);const D=new Date(d+'T12:00:00Z');let s=new Date(D-((D.getUTCDay()-2+7)%7)*864e5);
 if(s.getUTCMonth()!==D.getUTCMonth()) s=new Date(Date.UTC(D.getUTCFullYear(),D.getUTCMonth(),1,12));
 const k=s.toISOString().slice(0,10);const p=per[k]=per[k]||{s:k,e:d,gross:0,sub:0,tax:0,wtax:0,fee:0,promo:0,net:0,oth:0};if(d>p.e)p.e=d;
 p.gross+=c(x.prepaid_amount);p.sub+=c(x.subtotal);p.tax+=c(x.restaurant_sales_tax);p.wtax+=c(x.withheld_sales_tax);
 const fee=c(x.advertising_fee)+c(x.grubhub_delivery_fee)+c(x.processing_fee)+c(x.gh_plus_fee)+c(x.commission_fee_tax);p.fee+=fee;
 const pr=c(x.restaurant_funded_promo)+c(x.restaurant_funded_reward);p.promo+=pr;p.net+=c(x.net_amount);
 p.oth+=c(x.net_amount)-(c(x.prepaid_amount)+fee+pr+c(x.withheld_sales_tax));}
const f=x=>x.toFixed(2).padStart(8);
console.log('period            DSS     gross    tax  wtax     fees   promo   other     net  DSS-net  entries in period');
for(const p of Object.values(per).sort((a,b)=>a.s<b.s?-1:1)){ if(p.s<'2026-08-01')continue;
 const inP=t=>iso(t.d)>=p.s&&iso(t.d)<=p.e;
 const dss=gl.filter(t=>/^NJ/.test(t.num)&&!t.cm&&inP(t)).reduce((a,t)=>a+t.dr-t.cr,0);
 const ents=gl.filter(t=>t.type==='Journal Entry'&&!/^NJ/.test(t.num)&&inP(t)).map(t=>t.num+' '+(t.cr-t.dr).toFixed(2));
 console.log((p.s.slice(5)+'-'+p.e.slice(5)).padEnd(12),f(dss),f(p.gross),f(p.tax).slice(2),f(p.wtax).slice(2),f(p.fee),f(p.promo),f(p.oth),f(p.net),f(dss-p.net),' ',ents.join('; '));}
